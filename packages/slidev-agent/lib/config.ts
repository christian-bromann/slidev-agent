export interface SlidevAgentRuntimeConfig {
  apiUrl: string
  assistantId: string
  deckId: string
  threadId: string | null
  inputPlaceholder: string
  enabled: boolean
}

import { env } from "./env"

interface SlidevAgentInjectedConfig {
  apiUrl?: string
  assistantId?: string
}

function readInjectedConfig(): SlidevAgentInjectedConfig {
  if (typeof window === "undefined")
    return {}

  const injectedConfig = Reflect.get(window, "__SLIDEV_AGENT_CONFIG__")
  if (!injectedConfig || typeof injectedConfig !== "object")
    return {}

  return injectedConfig as SlidevAgentInjectedConfig
}

function getThreadStorageKey(assistantId: string, deckId: string) {
  return `slidev-agent:thread:${assistantId || "default"}:${deckId || "default"}`
}

function readStoredThreadId(assistantId: string, deckId: string) {
  if (typeof window === "undefined")
    return null

  const storageKey = getThreadStorageKey(assistantId, deckId)
  const current = window.sessionStorage.getItem(storageKey)
  const legacyCurrent = window.localStorage.getItem(storageKey)

  if (legacyCurrent) {
    window.localStorage.removeItem(storageKey)
  }

  return current?.trim() || null
}

export function persistSlidevAgentThreadId(assistantId: string, deckId: string, threadId: string) {
  if (typeof window === "undefined" || !threadId.trim())
    return

  window.sessionStorage.setItem(getThreadStorageKey(assistantId, deckId), threadId)
}

export function clearSlidevAgentThreadId(assistantId: string, deckId: string) {
  if (typeof window === "undefined")
    return

  const storageKey = getThreadStorageKey(assistantId, deckId)
  window.sessionStorage.removeItem(storageKey)
  window.localStorage.removeItem(storageKey)
}

export function resolveSlidevAgentRuntimeConfig(): SlidevAgentRuntimeConfig {
  const injectedConfig = readInjectedConfig()
  const apiUrl = env(import.meta.env, "VITE_LANGGRAPH_API_URL") || injectedConfig.apiUrl || "http://localhost:2024"
  const assistantId = env(import.meta.env, "VITE_LANGGRAPH_ASSISTANT_ID") || injectedConfig.assistantId || ""
  const deckId = env(import.meta.env, "VITE_SLIDEV_AGENT_DECK_ID") || "default-deck"
  const inputPlaceholder = env(import.meta.env, "VITE_SLIDEV_AGENT_PLACEHOLDER") || "Ask the agent to create or revise slides..."
  const threadId = env(import.meta.env, "VITE_LANGGRAPH_THREAD_ID") || readStoredThreadId(assistantId, deckId)

  return {
    apiUrl,
    assistantId,
    deckId,
    threadId,
    inputPlaceholder,
    enabled: Boolean(apiUrl && assistantId),
  }
}
