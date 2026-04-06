<script setup lang="ts">
import { useNav } from "@slidev/client"
import { useStream } from "@langchain/vue"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, unref, watch } from "vue"

import MessageItem from "./MessageItem.vue"
import TypingDots from "./TypingDots.vue"
import {
  clearSlidevAgentThreadId,
  persistSlidevAgentThreadId,
  resolveSlidevAgentRuntimeConfig,
} from "../lib/config"
import { createSlidevHeadlessTools } from "../lib/headless-tool-impl"
import {
  buildSidebarMessages,
  buildToolCallLookup,
  collectActiveSubagentIds,
  createSubagentActivityMessage,
  filterVisibleSidebarMessages,
  getMappedSubagentIds,
  normalizeMessages,
  summarizeSubagentActivities,
  type StreamSubagent,
} from "../lib/sidebar"
import { setSlidevAgentOpen, slidevAgentUiState } from "../lib/state"

const runtimeConfig = resolveSlidevAgentRuntimeConfig()
const nav = useNav()
const headlessTools = createSlidevHeadlessTools(nav)

const draft = ref("")
const isSubmitting = ref(false)
const isSwitchingThread = ref(false)
const didResetMissingThread = ref(false)
const runtimeErrorMessage = ref("")
const messagesContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)

const sidebarReservedWidth = "min(26rem, 85vw)"
const fallbackMessages = ref([
  {
    type: "assistant",
    content: "Start your LangGraph server on http://localhost:2024 and ensure the assistant ID from your langgraph.json graph key is available to the frontend.",
  },
])

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

function clearStoredThread() {
  clearSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId)
}

function buildOptimisticValues(previous: unknown, nextMessage: { type: string, content: string }) {
  const previousState = previous && typeof previous === "object"
    ? previous as Record<string, unknown>
    : {}

  return {
    ...previousState,
    messages: [
      ...normalizeMessages(Reflect.get(previousState, "messages")),
      nextMessage,
    ],
  }
}

const stream = runtimeConfig.enabled
  ? useStream({
      apiUrl: runtimeConfig.apiUrl,
      assistantId: runtimeConfig.assistantId,
      threadId: runtimeConfig.threadId,
      fetchStateHistory: false,
      filterSubagentMessages: true,
      reconnectOnMount: true,
      tools: headlessTools,
      onThreadId: (threadId) => {
        persistSlidevAgentThreadId(runtimeConfig.assistantId, runtimeConfig.deckId, threadId)
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error)
        const configMessage = getConfigurationErrorMessage(message)

        if (configMessage) {
          runtimeErrorMessage.value = configMessage
          return
        }

        if (
          !didResetMissingThread.value
          && message.includes("Thread with ID")
          && message.includes("not found")
        ) {
          didResetMissingThread.value = true
          clearStoredThread()
          void stream?.switchThread(null)
        }
      },
    })
  : null

const rawMessages = computed(() => {
  if (!stream)
    return fallbackMessages.value

  return normalizeMessages(stream.messages)
})

const activeSubagentIds = computed(() => {
  return collectActiveSubagentIds(stream?.activeSubagents)
})

/** Sync useStream() fields into plain refs — nested refs on a plain object do not always trigger template/computed updates. */
const trackedActiveSubagentCount = ref(0)
const trackedQueueSize = ref(0)
const trackedStreamLoading = ref(false)
const trackedThreadLoading = ref(false)

watch(
  () => (stream ? stream.activeSubagents.length : 0),
  value => {
    trackedActiveSubagentCount.value = value
  },
  { immediate: true },
)

watch(
  () => {
    if (!stream)
      return 0
    const size = stream.queue.size
    return typeof size === "number" ? size : 0
  },
  value => {
    trackedQueueSize.value = value
  },
  { immediate: true },
)

watch(
  () => (stream ? toValue(stream.isLoading) : false),
  value => {
    trackedStreamLoading.value = Boolean(value)
  },
  { immediate: true },
)

watch(
  () => (stream ? toValue(stream.isThreadLoading) : false),
  value => {
    trackedThreadLoading.value = Boolean(value)
  },
  { immediate: true },
)

/** True while sending, streaming, loading thread history, queued work, or subagents running. */
const isStreamActive = computed(() => {
  return (
    isSubmitting.value
    || trackedStreamLoading.value
    || trackedThreadLoading.value
    || trackedQueueSize.value > 0
    || isSwitchingThread.value
    || trackedActiveSubagentCount.value > 0
  )
})

const connectionState = computed(() => {
  if (!runtimeConfig.enabled)
    return "fallback"

  if (runtimeErrorMessage.value)
    return "error"

  return "connected"
})

const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case "fallback":
      return "Local fallback"
    case "error":
      return "Needs attention"
    default:
      return "Connected"
  }
})

const toolCallLookup = computed(() => {
  return buildToolCallLookup(stream?.toolCalls, rawMessages.value)
})

const subagentActivities = computed(() => {
  if (!stream)
    return []

  const subagents = Array.from(stream.subagents.values() as Iterable<StreamSubagent>)
  return summarizeSubagentActivities(subagents, activeSubagentIds.value)
})

const knownSubagentIds = computed(() => {
  return new Set(subagentActivities.value.map(subagent => subagent.id))
})

function getSubagentsByMessage(messageId: string): StreamSubagent[] {
  if (!stream || !messageId)
    return []

  const subagents = stream.getSubagentsByMessage(messageId)
  return Array.isArray(subagents) ? subagents as StreamSubagent[] : []
}

const messages = computed(() => {
  return filterVisibleSidebarMessages(buildSidebarMessages({
    rawMessages: rawMessages.value,
    toolCallLookup: toolCallLookup.value,
    getSubagentsByMessage,
    activeSubagentIds: activeSubagentIds.value,
    knownSubagentIds: knownSubagentIds.value,
  }))
})

const orphanedSubagentMessages = computed(() => {
  const mappedSubagentIds = getMappedSubagentIds(messages.value)
  return subagentActivities.value
    .filter(subagent => !mappedSubagentIds.has(subagent.id))
    .map(createSubagentActivityMessage)
})

const visibleMessages = computed(() => {
  return [...messages.value, ...orphanedSubagentMessages.value]
})

/** Reserve space under the transcript so the typing bubble can fade out without shifting the composer. */
const showTypingSlot = computed(() => {
  return visibleMessages.value.length > 0 || isStreamActive.value
})

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

const sendShortcutLabel = computed(() => {
  if (typeof navigator === "undefined")
    return "Cmd/Ctrl+Enter to send"

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? "Cmd+Enter to send"
    : "Ctrl+Enter to send"
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

function handleComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault()
    void sendMessage()
  }
}

async function startNewThread() {
  if (!stream || isSwitchingThread.value)
    return

  isSwitchingThread.value = true
  runtimeErrorMessage.value = ""
  didResetMissingThread.value = false
  clearStoredThread()

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

  const nextMessage = {
    type: "human",
    content,
  }

  try {
    await stream.submit(
      { messages: [nextMessage] },
      {
        context: {
          currentSlide: currentSlideContext.value,
        },
        multitaskStrategy: "enqueue",
        optimisticValues: previous => buildOptimisticValues(previous, nextMessage),
        streamSubgraphs: true,
      },
    )
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes("Unreachable state when creating run")) {
      clearStoredThread()
      void stream.switchThread(null)
      fallbackMessages.value = [
        {
          type: "assistant",
          content: "The previous thread became invalid after a local server restart. The sidebar reset to a fresh thread, so please send your prompt again.",
        },
      ]
      return
    }

    const configMessage = getConfigurationErrorMessage(message)
    runtimeErrorMessage.value = configMessage || message
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

watch(() => slidevAgentUiState.isOpen, (isOpen) => {
  updateViewportReservation()

  if (isOpen)
    void scrollMessagesToBottom(true)
})

onBeforeUnmount(() => {
  if (typeof document === "undefined")
    return

  document.documentElement.style.setProperty("--slidev-agent-reserved-width", "0px")
})

watch(visibleMessages, () => {
  void scrollMessagesToBottom()
})

watch(trackedActiveSubagentCount, () => {
  void scrollMessagesToBottom()
})

watch(isStreamActive, (active) => {
  if (active)
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
        <div class="slidev-agent-sidebar__header-copy">
          <p class="slidev-agent-sidebar__eyebrow">Slidev Agent</p>
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
        <MessageItem
          v-for="message in visibleMessages"
          :key="message.key"
          :message="message"
        />

        <div
          v-if="showTypingSlot"
          class="slidev-agent-sidebar__typing-slot"
          :aria-busy="isStreamActive ? 'true' : 'false'"
        >
          <Transition name="slidev-agent-typing-fade">
            <div
              v-if="isStreamActive"
              key="typing-trail"
              class="slidev-agent-sidebar__typing-trail"
              aria-live="polite"
              aria-label="Assistant is responding"
            >
              <TypingDots :active="true" />
            </div>
          </Transition>
        </div>

        <p v-if="visibleMessages.length === 0 && !isStreamActive" class="slidev-agent-sidebar__empty-state">
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
            <span class="slidev-agent-sidebar__composer-hint">{{ sendShortcutLabel }}</span>
          </div>

          <button
            class="slidev-agent-sidebar__submit"
            type="submit"
            :disabled="!draft.trim() || isSubmitting || isSwitchingThread"
          >
            Send
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

.slidev-agent-sidebar__header-copy {
  min-width: 0;
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

.slidev-agent-typing-fade-enter-active,
.slidev-agent-typing-fade-leave-active {
  transition: opacity 0.28s ease;
}

.slidev-agent-typing-fade-enter-from,
.slidev-agent-typing-fade-leave-to {
  opacity: 0;
}

.slidev-agent-sidebar__typing-slot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 0.25rem;
  /* Matches bubble + margin so fade-out does not collapse the thread layout */
  min-height: 3.05rem;
  box-sizing: border-box;
}

.slidev-agent-sidebar__typing-trail {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  align-self: flex-start;
  padding: 0.5rem 0.85rem;
  border-radius: 0.9rem;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.12);
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
  background: #22c55e;
  box-shadow: 0 0 0.75rem rgba(34, 197, 94, 0.75);
}

.slidev-agent-sidebar__connection-dot--fallback {
  background: #f59e0b;
  box-shadow: 0 0 0.75rem rgba(245, 158, 11, 0.6);
}

.slidev-agent-sidebar__connection-dot--error {
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
