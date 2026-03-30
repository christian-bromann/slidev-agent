<script setup lang="ts">
import { useNav } from "@slidev/client"
import { useStream } from "@langchain/vue"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from "vue"

import { clearSlidevAgentThreadId, persistSlidevAgentThreadId, resolveSlidevAgentRuntimeConfig } from "../lib/config"
import { getMessageContent, getMessageRole, getMessageToolCallId, getMessageToolName } from "../lib/messages"
import { setSlidevAgentOpen, slidevAgentUiState } from "../lib/state"

const runtimeConfig = resolveSlidevAgentRuntimeConfig()
const nav = useNav()
const draft = ref("")
const isSubmitting = ref(false)
const isSwitchingThread = ref(false)
const didResetMissingThread = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)
const runtimeErrorMessage = ref("")
const sidebarReservedWidth = "min(26rem, 85vw)"
const fallbackMessages = ref([
  {
    type: "assistant",
    content: "Start your LangGraph server on http://localhost:2024 and ensure the assistant ID from your langgraph.json graph key is available to the frontend.",
  },
])

const stream = runtimeConfig.enabled
  ? useStream({
      apiUrl: runtimeConfig.apiUrl,
      assistantId: runtimeConfig.assistantId,
      threadId: runtimeConfig.threadId,
      fetchStateHistory: false,
      filterSubagentMessages: true,
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error)

        const configMessage = getConfigurationErrorMessage(message)
        if (configMessage) {
          runtimeErrorMessage.value = configMessage
          return
        }

        if (!didResetMissingThread.value && message.includes("Thread with ID") && message.includes("not found")) {
          didResetMissingThread.value = true
          clearSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId)
          stream?.switchThread(null)
        }
      },
      onThreadId: (threadId) => {
        persistSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId, threadId)
      },
      reconnectOnMount: true,
    })
  : null

function getConfigurationErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("api key") || normalized.includes("authentication") || normalized.includes("unauthorized")) {
    return "The LangGraph server is missing a provider API key. Set `SLIDEV_AGENT_MODEL` and the matching provider key in your server environment before sending prompts."
  }

  if (normalized.includes("model") && (normalized.includes("not found") || normalized.includes("not configured") || normalized.includes("invalid"))) {
    return "The LangGraph server does not have a usable model configured. Set `SLIDEV_AGENT_MODEL` to a provider-prefixed model like `anthropic:claude-sonnet-4-6` and install the matching provider package in the project."
  }

  if (normalized.includes("@langchain/")) {
    return "The selected model provider package is not installed. Add the matching integration package, for example `@langchain/anthropic` or `@langchain/openai`, to your project dependencies."
  }

  return ""
}

function normalizeMessages(value: unknown) {
  const unwrapped = unref(value)
  return Array.isArray(unwrapped) ? unwrapped : []
}

const rawMessages = computed(() => {
  if (!stream)
    return fallbackMessages.value

  return normalizeMessages(stream.messages)
})
const activeSubagentCount = computed(() => stream ? stream.activeSubagents.length : 0)
const queuedMessageCount = computed(() => {
  if (!stream)
    return 0

  const queue = unref(stream.queue)
  if (!queue || typeof queue !== "object")
    return 0

  const size = Reflect.get(queue, "size")
  return typeof size === "number" ? size : 0
})
const connectionState = computed(() => {
  if (!runtimeConfig.enabled || runtimeErrorMessage.value)
    return "disconnected"

  return "connected"
})
const connectionLabel = computed(() => {
  return connectionState.value === "connected" ? "Connected" : "Disconnected"
})
const visibleMessages = computed(() => {
  return rawMessages.value.filter((message) => {
    const content = getMessageContent(message).trim()
    return content.length > 0
  })
})
type ToolCallResult = {
  call?: {
    id?: string
    name?: string
    args?: unknown
  }
}

const toolCallLookup = computed(() => {
  const lookup = new Map<string, ToolCallResult>()
  if (!stream)
    return lookup

  const entries = Array.isArray(stream.toolCalls) ? stream.toolCalls : []
  entries.forEach((entry) => {
    const callId = entry?.call?.id
    if (typeof callId === "string" && callId)
      lookup.set(callId, entry)
  })
  return lookup
})

function truncateText(value: string, maxLength = 96) {
  if (value.length <= maxLength)
    return value

  return `${value.slice(0, maxLength - 1)}…`
}

function summarizeToolResult(toolName: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed)
    return "Completed"

  const lines = trimmed.split("\n").map(line => line.trim()).filter(Boolean)
  if (toolName === "read_file" && lines.length > 0) {
    return `${lines.length} line${lines.length === 1 ? "" : "s"}`
  }

  if (["ls", "glob", "grep"].includes(toolName) && lines.length > 0) {
    return `${lines.length} item${lines.length === 1 ? "" : "s"}`
  }

  return truncateText(lines[0] || trimmed)
}

function formatToolArgs(args: unknown) {
  if (!args || typeof args !== "object")
    return ""

  const preferredKeys = ["path", "filePath", "file_path", "pattern", "glob", "command"]
  const parts = preferredKeys
    .map((key) => {
      const value = Reflect.get(args, key)
      if (typeof value !== "string" || !value.trim())
        return ""

      return `${key}: ${truncateText(value.trim(), 48)}`
    })
    .filter(Boolean)

  return parts.join(" · ")
}

const messages = computed(() => {
  return visibleMessages.value.map((message) => {
    const role = getMessageRole(message)

    if (role === "tool") {
      const toolCallId = getMessageToolCallId(message)
      const toolCall = toolCallId ? toolCallLookup.value.get(toolCallId) : undefined
      const toolName = toolCall?.call?.name || getMessageToolName(message) || "tool"
      const argsSummary = formatToolArgs(toolCall?.call?.args)
      const resultSummary = summarizeToolResult(toolName, getMessageContent(message))

      return {
        kind: "tool" as const,
        role,
        roleLabel: "Tool",
        toolName,
        argsSummary,
        resultSummary,
      }
    }

    return {
      kind: "message" as const,
      role,
      roleLabel: role === "human" ? "You" : "Agent",
      content: getMessageContent(message),
    }
  })
})
type StreamToolCall = {
  call?: {
    id?: string
    name?: string
    args?: unknown
  }
  result?: unknown
}

type StreamSubagent = {
  id: string
  status: string
  messages: unknown[]
  toolCall: {
    args?: Record<string, unknown>
    id?: string
  }
  toolCalls: StreamToolCall[]
}

function stringifyUnknownResult(value: unknown): string {
  if (typeof value === "string")
    return value

  if (Array.isArray(value))
    return value.map(entry => stringifyUnknownResult(entry)).filter(Boolean).join("\n")

  if (!value || typeof value !== "object")
    return ""

  const content = Reflect.get(value, "content")
  if (typeof content === "string")
    return content

  const text = Reflect.get(value, "text")
  if (typeof text === "string")
    return text

  return ""
}

function extractSubagentTask(toolCall: { args?: Record<string, unknown> } | undefined) {
  const args = toolCall?.args
  if (!args)
    return ""

  const preferredKeys = ["task", "prompt", "description", "instructions", "content", "goal"]
  for (const key of preferredKeys) {
    const value = Reflect.get(args, key)
    if (typeof value === "string" && value.trim())
      return truncateText(value.trim(), 140)
  }

  return ""
}

const subagentActivities = computed(() => {
  if (!stream)
    return []

  return Array.from(stream.subagents.values() as Iterable<StreamSubagent>)
    .map((subagent) => {
      const type = getSubagentType(subagent.toolCall)
      const taskSummary = extractSubagentTask(subagent.toolCall)
      const files = extractTouchedFiles(subagent.toolCalls)
      const messageCount = subagent.messages.length
      const latestToolCall = subagent.toolCalls.at(-1)
      const latestToolName = latestToolCall?.call?.name || ""
      const latestToolArgs = formatToolArgs(latestToolCall?.call?.args)
      const latestToolSummary = latestToolName
        ? summarizeToolResult(latestToolName, stringifyUnknownResult(latestToolCall?.result))
        : ""

      const hasVisibleActivity = Boolean(
        taskSummary
        || latestToolName
        || files.length > 0
        || messageCount > 0,
      )

      return {
        id: subagent.id,
        type,
        status: subagent.status,
        taskSummary,
        latestToolName,
        latestToolArgs,
        latestToolSummary,
        files,
        messageCount,
        hasVisibleActivity,
      }
    })
    .filter(subagent => subagent.hasVisibleActivity || ["running", "pending", "error"].includes(subagent.status))
    .sort((left, right) => {
      const statusPriority = getSubagentStatusPriority(left.status) - getSubagentStatusPriority(right.status)
      if (statusPriority !== 0)
        return statusPriority

      return left.type.localeCompare(right.type)
    })
})

function getSubagentStatusPriority(status: string) {
  switch (status) {
    case "running":
      return 0
    case "pending":
      return 1
    case "error":
      return 2
    case "complete":
      return 3
    default:
      return 4
  }
}

function getSubagentType(toolCall: { args?: Record<string, unknown> } | undefined) {
  const subagentType = toolCall?.args?.subagent_type
  return typeof subagentType === "string" && subagentType
    ? subagentType
    : "subagent"
}

function normalizePossiblePath(value: unknown): string | null {
  if (typeof value !== "string")
    return null

  const normalized = value.trim()
  if (!normalized)
    return null

  if (normalized.includes("/") || normalized.endsWith(".md") || normalized.endsWith(".vue") || normalized.endsWith(".ts"))
    return normalized

  return null
}

function collectPathsFromUnknown(value: unknown, files: Set<string>) {
  if (typeof value === "string") {
    const maybePath = normalizePossiblePath(value)
    if (maybePath)
      files.add(maybePath)
    return
  }

  if (Array.isArray(value)) {
    value.forEach(entry => collectPathsFromUnknown(entry, files))
    return
  }

  if (!value || typeof value !== "object")
    return

  Object.entries(value).forEach(([key, entry]) => {
    if (["path", "filePath", "file_path", "paths", "glob"].includes(key))
      collectPathsFromUnknown(entry, files)
  })
}

function extractTouchedFiles(toolCalls: Array<{ call?: { name?: string; args?: unknown } }> | undefined) {
  const files = new Set<string>()

  toolCalls?.forEach((toolCall) => {
    const callName = toolCall.call?.name
    if (!callName)
      return

    if ([
      "read_file",
      "write_file",
      "edit_file",
      "ls",
      "glob",
      "grep",
      "execute",
    ].includes(callName)) {
      collectPathsFromUnknown(toolCall.call?.args, files)
    }
  })

  return Array.from(files).slice(0, 8)
}

function handleComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault()
    void sendMessage()
  }
}

const currentSlideContext = computed(() => {
  const route = unref(nav.currentSlideRoute)
  const slideMeta = route && typeof route === "object" ? Reflect.get(route, "meta") : undefined
  const slide = slideMeta && typeof slideMeta === "object" ? Reflect.get(slideMeta, "slide") : undefined
  const frontmatter = slide && typeof slide === "object" ? Reflect.get(slide, "frontmatter") : undefined
  const title = frontmatter && typeof frontmatter === "object" ? Reflect.get(frontmatter, "title") : undefined

  return {
    page: unref(nav.currentPage),
    layout: unref(nav.currentLayout) || undefined,
    route: route && typeof route === "object" ? String(Reflect.get(route, "path") || "") || undefined : undefined,
    title: typeof title === "string" && title.trim() ? title.trim() : undefined,
  }
})

function isNearBottom(element: HTMLElement) {
  const threshold = 24
  const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
  return distanceFromBottom <= threshold
}

function handleMessagesScroll() {
  const element = messagesContainer.value
  if (!element)
    return

  shouldAutoScroll.value = isNearBottom(element)
}

async function scrollMessagesToBottom(force = false) {
  await nextTick()

  const element = messagesContainer.value
  if (!element)
    return

  if (!force && !shouldAutoScroll.value)
    return

  element.scrollTop = element.scrollHeight
}

async function startNewThread() {
  if (!stream || isSwitchingThread.value)
    return

  isSwitchingThread.value = true
  runtimeErrorMessage.value = ""
  didResetMissingThread.value = false
  clearSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId)

  try {
    await stream.switchThread(null)
  }
  finally {
    isSwitchingThread.value = false
  }
}

async function sendMessage() {
  const content = draft.value.trim()
  if (!content)
    return

  runtimeErrorMessage.value = ""
  draft.value = ""

  if (!stream) {
    fallbackMessages.value = [
      ...fallbackMessages.value,
      { type: "human", content },
      {
        type: "assistant",
        content: "No LangGraph endpoint is configured yet, so this local fallback cannot edit slides. Add the env vars from `.env.example` to connect a real deep agent.",
      },
    ]
    return
  }

  isSubmitting.value = true

  try {
    await stream.submit({
      messages: [
        {
          type: "human",
          content,
        },
      ],
    }, {
      context: {
        currentSlide: currentSlideContext.value,
      },
      multitaskStrategy: "enqueue",
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes("Unreachable state when creating run")) {
      clearSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId)
      stream.switchThread(null)
      fallbackMessages.value = [
        {
          type: "assistant",
          content: "The previous thread became invalid after a local server restart. The sidebar reset to a fresh thread, so please send your prompt again.",
        },
      ]
      return
    }

    const configMessage = getConfigurationErrorMessage(message)
    if (configMessage) {
      runtimeErrorMessage.value = configMessage
      return
    }

    runtimeErrorMessage.value = message
  }
  finally {
    isSubmitting.value = false
  }
}

function updateViewportReservation() {
  if (typeof document === "undefined")
    return

  document.documentElement.style.setProperty(
    "--slidev-agent-reserved-width",
    slidevAgentUiState.isOpen ? sidebarReservedWidth : "0px",
  )
}

onMounted(() => {
  updateViewportReservation()
  void scrollMessagesToBottom(true)
})

watch(() => slidevAgentUiState.isOpen, () => {
  updateViewportReservation()
})

onBeforeUnmount(() => {
  if (typeof document === "undefined")
    return

  document.documentElement.style.setProperty("--slidev-agent-reserved-width", "0px")
})

watch(messages, () => {
  void scrollMessagesToBottom()
})

watch(subagentActivities, () => {
  void scrollMessagesToBottom()
})

watch(activeSubagentCount, () => {
  void scrollMessagesToBottom()
})
</script>

<template>
  <Teleport to="body">
    <aside
      class="slidev-agent-sidebar"
      :class="{ 'slidev-agent-sidebar--open': slidevAgentUiState.isOpen }"
      aria-label="LangChain slide authoring agent"
    >
      <div class="slidev-agent-sidebar__header">
        <div>
          <p class="slidev-agent-sidebar__eyebrow">LangChain Slidev Agent</p>
          <h2 class="slidev-agent-sidebar__title">Slide Author</h2>
        </div>
        <div class="slidev-agent-sidebar__header-actions">
          <span
            class="slidev-agent-sidebar__connection-dot"
            :class="`slidev-agent-sidebar__connection-dot--${connectionState}`"
            :title="connectionLabel"
            :aria-label="connectionLabel"
          />
          <button
            class="slidev-agent-sidebar__close"
            type="button"
            aria-label="Close agent sidebar"
            @click="setSlidevAgentOpen(false)"
          >
            ×
          </button>
        </div>
      </div>

    <p v-if="runtimeErrorMessage" class="slidev-agent-sidebar__error-banner">
      {{ runtimeErrorMessage }}
    </p>

      <div
        ref="messagesContainer"
        class="slidev-agent-sidebar__messages"
        @scroll="handleMessagesScroll"
      >
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="slidev-agent-sidebar__message"
          :class="`slidev-agent-sidebar__message--${message.role}`"
        >
          <template v-if="message.kind === 'tool'">
            <div class="slidev-agent-sidebar__tool-annotation">
              <span class="slidev-agent-sidebar__tool-dot" />
              <span class="slidev-agent-sidebar__tool-name">{{ message.toolName }}</span>
              <span v-if="message.argsSummary" class="slidev-agent-sidebar__tool-args">
                {{ message.argsSummary }}
              </span>
              <span class="slidev-agent-sidebar__tool-summary">
                {{ message.resultSummary }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="slidev-agent-sidebar__message-role">
              {{ message.roleLabel }}
            </div>
            <div class="slidev-agent-sidebar__message-body">
              {{ message.content }}
            </div>
          </template>
        </div>

        <div
          v-for="subagent in subagentActivities"
          :key="subagent.id"
          class="slidev-agent-sidebar__message slidev-agent-sidebar__message--subagent"
        >
          <div class="slidev-agent-sidebar__message-role">Subagent</div>
          <div class="slidev-agent-sidebar__subagent-inline-card">
            <div class="slidev-agent-sidebar__subagent-inline-header">
              <span class="slidev-agent-sidebar__subagent-name">{{ subagent.type }}</span>
              <span
                class="slidev-agent-sidebar__subagent-status"
                :class="`slidev-agent-sidebar__subagent-status--${subagent.status}`"
              >
                {{ subagent.status }}
              </span>
            </div>

            <p v-if="subagent.taskSummary" class="slidev-agent-sidebar__subagent-inline-task">
              {{ subagent.taskSummary }}
            </p>

            <div v-if="subagent.latestToolName" class="slidev-agent-sidebar__subagent-inline-tool">
              <span class="slidev-agent-sidebar__subagent-inline-tool-name">{{ subagent.latestToolName }}</span>
              <span v-if="subagent.latestToolArgs" class="slidev-agent-sidebar__subagent-inline-tool-args">
                {{ subagent.latestToolArgs }}
              </span>
              <span v-if="subagent.latestToolSummary" class="slidev-agent-sidebar__subagent-inline-tool-summary">
                {{ subagent.latestToolSummary }}
              </span>
            </div>

            <div v-if="subagent.files.length > 0" class="slidev-agent-sidebar__subagent-files">
              <span
                v-for="file in subagent.files"
                :key="file"
                class="slidev-agent-sidebar__subagent-file"
              >
                {{ file }}
              </span>
            </div>
          </div>
        </div>

        <p v-if="messages.length === 0" class="slidev-agent-sidebar__empty-state">
          Start a conversation to have the agent inspect and edit your Slidev deck.
        </p>
      </div>

      <form class="slidev-agent-sidebar__composer" @submit.prevent="sendMessage">
        <textarea
          v-model="draft"
          class="slidev-agent-sidebar__input"
          :placeholder="runtimeConfig.inputPlaceholder"
          rows="4"
          @keydown="handleComposerKeydown"
        />
        <div class="slidev-agent-sidebar__composer-footer">
          <div class="slidev-agent-sidebar__composer-actions">
            <button
              class="slidev-agent-sidebar__secondary-button"
              type="button"
              :disabled="isSubmitting || isSwitchingThread"
              @click="startNewThread"
            >
              {{ isSwitchingThread ? "Resetting..." : "New thread" }}
            </button>
            <span class="slidev-agent-sidebar__composer-hint">Cmd+Enter to send</span>
          </div>
          <button
            class="slidev-agent-sidebar__submit"
            type="submit"
            :disabled="!draft.trim() || isSubmitting || isSwitchingThread"
          >
            {{ isSubmitting ? "Working..." : "Send" }}
          </button>
        </div>
      </form>
    </aside>
  </Teleport>
</template>

<style scoped>
:global(:root) {
  --slidev-agent-reserved-width: 0px;
}

:global(body) {
  overflow-x: hidden;
}

:global(#app) {
  width: calc(100vw - var(--slidev-agent-reserved-width));
  max-width: calc(100vw - var(--slidev-agent-reserved-width));
  transition: width 180ms ease, max-width 180ms ease;
}

.slidev-agent-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(26rem, 85vw);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(10, 15, 28, 0.96);
  color: #e5edf9;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -12px 0 32px rgba(15, 23, 42, 0.35);
  transform: translateX(calc(100% + 1rem));
  transition: transform 180ms ease;
  z-index: 60;
  backdrop-filter: blur(14px);
}

.slidev-agent-sidebar--open {
  transform: translateX(0);
}

.slidev-agent-sidebar__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.slidev-agent-sidebar__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.slidev-agent-sidebar__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

.slidev-agent-sidebar__title {
  margin: 0.2rem 0 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.slidev-agent-sidebar__close {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.slidev-agent-sidebar__connection-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  flex: 0 0 auto;
  background: #ef4444;
  box-shadow: 0 0 0.65rem rgba(239, 68, 68, 0.65);
}

.slidev-agent-sidebar__connection-dot--connected {
  background: #22c55e;
  box-shadow: 0 0 0.75rem rgba(34, 197, 94, 0.75);
}

.slidev-agent-sidebar__connection-dot--disconnected {
  background: #ef4444;
  box-shadow: 0 0 0.75rem rgba(239, 68, 68, 0.75);
}

.slidev-agent-sidebar__error-banner {
  margin: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.85rem;
  background: rgba(127, 29, 29, 0.24);
  color: #fecaca;
  font-size: 0.84rem;
  line-height: 1.45;
}

.slidev-agent-sidebar__subagent-name {
  font-size: 0.86rem;
  font-weight: 600;
  text-transform: capitalize;
}

.slidev-agent-sidebar__subagent-status {
  border-radius: 999px;
  padding: 0.18rem 0.45rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.slidev-agent-sidebar__subagent-status--running {
  background: rgba(37, 99, 235, 0.22);
  color: #bfdbfe;
}

.slidev-agent-sidebar__subagent-status--pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}

.slidev-agent-sidebar__subagent-status--complete {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.slidev-agent-sidebar__subagent-status--error {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.slidev-agent-sidebar__subagent-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.slidev-agent-sidebar__subagent-file {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  font-size: 0.76rem;
  color: #dbeafe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slidev-agent-sidebar__message--subagent {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.slidev-agent-sidebar__subagent-inline-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.slidev-agent-sidebar__subagent-inline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.slidev-agent-sidebar__subagent-inline-task {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #e2e8f0;
}

.slidev-agent-sidebar__subagent-inline-tool {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.slidev-agent-sidebar__subagent-inline-tool-name {
  font-weight: 600;
  color: #dbeafe;
  text-transform: lowercase;
}

.slidev-agent-sidebar__subagent-inline-tool-args {
  color: #cbd5e1;
}

.slidev-agent-sidebar__subagent-inline-tool-summary {
  color: #93c5fd;
}

.slidev-agent-sidebar__subagent-inline-tool-summary::before {
  content: "•";
  margin-right: 0.3rem;
  color: rgba(148, 163, 184, 0.6);
}

.slidev-agent-sidebar__messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding-right: 0.25rem;
}

.slidev-agent-sidebar__empty-state {
  margin: auto 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #cbd5e1;
  text-align: center;
}

.slidev-agent-sidebar__message {
  padding: 0.75rem;
  border-radius: 0.9rem;
  background: rgba(30, 41, 59, 0.85);
}

.slidev-agent-sidebar__message--human {
  background: rgba(37, 99, 235, 0.2);
}

.slidev-agent-sidebar__message--tool {
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: 0;
}

.slidev-agent-sidebar__message-role {
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #93c5fd;
}

.slidev-agent-sidebar__message-body {
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 0.92rem;
}

.slidev-agent-sidebar__tool-annotation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 0.1rem;
  font-size: 0.74rem;
  line-height: 1.4;
}

.slidev-agent-sidebar__tool-dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.85);
  flex: 0 0 auto;
}

.slidev-agent-sidebar__tool-name {
  font-weight: 600;
  color: #dbeafe;
  text-transform: lowercase;
}

.slidev-agent-sidebar__tool-args {
  color: #cbd5e1;
}

.slidev-agent-sidebar__tool-summary {
  color: #93c5fd;
}

.slidev-agent-sidebar__tool-summary::before {
  content: "•";
  margin-right: 0.3rem;
  color: rgba(148, 163, 184, 0.6);
}

.slidev-agent-sidebar__composer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.slidev-agent-sidebar__composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.slidev-agent-sidebar__composer-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.slidev-agent-sidebar__composer-hint {
  font-size: 0.74rem;
  color: #94a3b8;
  white-space: nowrap;
}

.slidev-agent-sidebar__secondary-button {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(15, 23, 42, 0.78);
  color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.slidev-agent-sidebar__secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.slidev-agent-sidebar__input {
  width: 100%;
  resize: vertical;
  min-height: 7rem;
  padding: 0.75rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.9);
  color: inherit;
}

.slidev-agent-sidebar__submit {
  align-self: flex-end;
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.slidev-agent-sidebar__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
