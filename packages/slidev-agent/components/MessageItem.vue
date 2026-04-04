<script setup lang="ts">
import type { SidebarMessage } from "../lib/sidebar"
import { renderChatMarkdown } from "../lib/render-chat-markdown"
import SubagentCard from "./SubagentCard.vue"

defineProps<{
  message: SidebarMessage
}>()
</script>

<template>
  <div
    class="slidev-agent-message"
    :class="`slidev-agent-message--${message.role}`"
  >
    <template v-if="message.kind === 'tool'">
      <div class="slidev-agent-tool">
        <span class="slidev-agent-tool__dot" />
        <span class="slidev-agent-tool__headline">{{ message.toolHeadline }}</span>
        <span v-if="message.argsSummary" class="slidev-agent-tool__args">
          {{ message.argsSummary }}
        </span>
        <span class="slidev-agent-tool__summary">
          {{ message.resultSummary }}
        </span>
      </div>
    </template>

    <template v-else>
      <div class="slidev-agent-message__label">
        {{ message.label }}
      </div>

      <div
        v-if="message.content"
        class="slidev-agent-message__body"
        v-html="renderChatMarkdown(message.content)"
      />

      <div
        v-if="message.subagents.length > 0"
        class="slidev-agent-message__subagents"
      >
        <SubagentCard
          v-for="subagent in message.subagents"
          :key="subagent.id"
          :subagent="subagent"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.slidev-agent-message {
  padding: 0.75rem;
  border-radius: 0.9rem;
  background: rgba(30, 41, 59, 0.85);
  min-width: 0;
}

.slidev-agent-message--human {
  background: rgba(37, 99, 235, 0.2);
}

.slidev-agent-message--tool {
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: 0;
}

.slidev-agent-message--subagent {
  padding: 0.55rem 0.6rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.slidev-agent-message__label {
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #93c5fd;
}

.slidev-agent-message__body {
  line-height: 1.45;
  font-size: 0.92rem;
  word-break: break-word;
}

.slidev-agent-message__body :deep(p) {
  margin: 0 0 0.5em;
}

.slidev-agent-message__body :deep(p:last-child) {
  margin-bottom: 0;
}

.slidev-agent-message__body :deep(ul),
.slidev-agent-message__body :deep(ol) {
  margin: 0.35em 0 0.5em;
  padding-left: 1.25rem;
}

.slidev-agent-message__body :deep(li + li) {
  margin-top: 0.25em;
}

.slidev-agent-message__body :deep(a) {
  color: #93c5fd;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.slidev-agent-message__body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  padding: 0.12em 0.35em;
  border-radius: 0.35rem;
  background: rgba(15, 23, 42, 0.85);
  color: #e2e8f0;
}

.slidev-agent-message__body :deep(pre) {
  margin: 0.5em 0;
  padding: 0.55rem 0.65rem;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.92);
  overflow-x: auto;
  font-size: 0.82rem;
}

.slidev-agent-message__body :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: inherit;
}

.slidev-agent-message__body :deep(blockquote) {
  margin: 0.4em 0;
  padding-left: 0.75rem;
  border-left: 3px solid rgba(148, 163, 184, 0.45);
  color: #cbd5e1;
}

.slidev-agent-message__body :deep(h1),
.slidev-agent-message__body :deep(h2),
.slidev-agent-message__body :deep(h3) {
  margin: 0.5em 0 0.35em;
  font-weight: 600;
  line-height: 1.25;
}

.slidev-agent-message__body :deep(h1) {
  font-size: 1.05em;
}

.slidev-agent-message__body :deep(h2) {
  font-size: 1em;
}

.slidev-agent-message__body :deep(h3) {
  font-size: 0.95em;
}

.slidev-agent-message__body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.45em 0;
  font-size: 0.88em;
}

.slidev-agent-message__body :deep(th),
.slidev-agent-message__body :deep(td) {
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 0.3rem 0.45rem;
  text-align: left;
}

.slidev-agent-message__body :deep(hr) {
  margin: 0.6em 0;
  border: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}

.slidev-agent-message__subagents {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slidev-agent-tool {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 0.1rem;
  font-size: 0.74rem;
  line-height: 1.4;
}

.slidev-agent-tool__dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.85);
  flex: 0 0 auto;
}

.slidev-agent-tool__headline {
  font-weight: 600;
  color: #dbeafe;
}

.slidev-agent-tool__args {
  color: #cbd5e1;
}

.slidev-agent-tool__summary {
  color: #93c5fd;
}

.slidev-agent-tool__summary::before {
  content: "•";
  margin-right: 0.3rem;
  color: rgba(148, 163, 184, 0.6);
}
</style>
