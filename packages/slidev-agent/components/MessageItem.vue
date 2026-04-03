<script setup lang="ts">
import type { SidebarMessage } from "../lib/sidebar"
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

      <div v-if="message.content" class="slidev-agent-message__body">
        {{ message.content }}
      </div>

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
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 0.92rem;
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
