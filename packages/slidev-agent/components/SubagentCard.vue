<script setup lang="ts">
import type { SubagentActivity } from "../lib/sidebar"

defineProps<{
  subagent: SubagentActivity
}>()
</script>

<template>
  <div class="slidev-agent-subagent-card">
    <div class="slidev-agent-subagent-card__header">
      <span class="slidev-agent-subagent-card__name">{{ subagent.typeHeadline }}</span>
      <span
        class="slidev-agent-subagent-card__status"
        :class="`slidev-agent-subagent-card__status--${subagent.status}`"
      >
        {{ subagent.statusLabel }}
      </span>
    </div>

    <p v-if="subagent.taskSummary" class="slidev-agent-subagent-card__task">
      {{ subagent.taskSummary }}
    </p>

    <div v-if="subagent.latestToolHeadline" class="slidev-agent-subagent-card__tool">
      <div class="slidev-agent-subagent-card__tool-line">
        <span class="slidev-agent-subagent-card__tool-name">{{ subagent.latestToolHeadline }}</span>
        <span
          class="slidev-agent-subagent-card__tool-state"
          :class="`slidev-agent-subagent-card__tool-state--${subagent.latestToolState}`"
        >
          {{ subagent.latestToolStateLabel }}
        </span>
      </div>
      <span v-if="subagent.latestToolArgs" class="slidev-agent-subagent-card__tool-args">
        {{ subagent.latestToolArgs }}
      </span>
      <span v-if="subagent.latestToolSummary" class="slidev-agent-subagent-card__tool-summary">
        {{ subagent.latestToolSummary }}
      </span>
    </div>

    <div v-if="subagent.files.length > 0" class="slidev-agent-subagent-card__files">
      <span
        v-for="file in subagent.files"
        :key="file"
        class="slidev-agent-subagent-card__file"
      >
        {{ file }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.slidev-agent-subagent-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.45rem 0.55rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.48);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.slidev-agent-subagent-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.slidev-agent-subagent-card__name {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
}

.slidev-agent-subagent-card__status {
  border-radius: 999px;
  padding: 0.12rem 0.38rem;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.slidev-agent-subagent-card__status--running {
  background: rgba(37, 99, 235, 0.22);
  color: #bfdbfe;
}

.slidev-agent-subagent-card__status--pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}

.slidev-agent-subagent-card__status--complete {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.slidev-agent-subagent-card__status--error {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.slidev-agent-subagent-card__task {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.35;
  color: #e2e8f0;
  line-clamp: 3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.slidev-agent-subagent-card__tool {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.68rem;
  line-height: 1.3;
}

.slidev-agent-subagent-card__tool-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.slidev-agent-subagent-card__tool-name {
  font-weight: 600;
  color: #dbeafe;
}

.slidev-agent-subagent-card__tool-state {
  border-radius: 999px;
  padding: 0.06rem 0.32rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.slidev-agent-subagent-card__tool-state--pending {
  background: rgba(37, 99, 235, 0.22);
  color: #bfdbfe;
}

.slidev-agent-subagent-card__tool-state--completed {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.slidev-agent-subagent-card__tool-state--error {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.slidev-agent-subagent-card__tool-args {
  color: #cbd5e1;
}

.slidev-agent-subagent-card__tool-summary {
  color: #93c5fd;
}

.slidev-agent-subagent-card__tool-summary::before {
  content: "•";
  margin-right: 0.3rem;
  color: rgba(148, 163, 184, 0.6);
}

.slidev-agent-subagent-card__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.slidev-agent-subagent-card__file {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  font-size: 0.68rem;
  color: #dbeafe;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
