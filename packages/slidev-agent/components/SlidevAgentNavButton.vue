<script setup lang="ts">
import { toggleSlidevAgent, slidevAgentUiState } from "../lib/state"
</script>

<template>
  <button
    class="slidev-agent-nav-button"
    :aria-pressed="slidevAgentUiState.isOpen"
    type="button"
    title="Toggle agent sidebar"
    @click="toggleSlidevAgent()"
  >
    <span class="slidev-agent-nav-button__icon">AI</span>
    <span class="slidev-agent-nav-button__label">
      {{ slidevAgentUiState.isOpen ? "Hide agent" : "Open agent" }}
    </span>
  </button>
</template>

<style scoped>
.slidev-agent-nav-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(15, 23, 42, 0.82);
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.slidev-agent-nav-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.26);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.slidev-agent-nav-button__label {
  font-size: 0.82rem;
  white-space: nowrap;
}
</style>
