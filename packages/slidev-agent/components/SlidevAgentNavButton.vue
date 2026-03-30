<script setup lang="ts">
import { toggleSlidevAgent, slidevAgentUiState } from "../lib/state"

const deepagentsIcon = new URL("../public/deepagents.svg", import.meta.url).href
</script>

<template>
  <button
    class="slidev-icon-btn slidev-agent-nav-button"
    :aria-pressed="slidevAgentUiState.isOpen"
    type="button"
    :title="slidevAgentUiState.isOpen ? 'Hide agent' : 'Open agent'"
    @click="toggleSlidevAgent()"
  >
    <img class="slidev-agent-nav-button__icon" :src="deepagentsIcon" alt="" />
  </button>
</template>

<style scoped>
.slidev-agent-nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  padding-left: 0.5em;
  padding-right: 0.5em;
}

.slidev-agent-nav-button__icon {
  width: 1em;
  height: 1em;
  display: block;
}

.slidev-agent-nav-button:active {
  transform: scale(0.97);
}
</style>
