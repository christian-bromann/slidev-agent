<script setup lang="ts">
defineProps<{
  active?: boolean
}>()
</script>

<template>
  <span
    v-show="active"
    class="slidev-agent-typing-dots"
    aria-hidden="true"
  >
    <span class="slidev-agent-typing-dots__dot" />
    <span class="slidev-agent-typing-dots__dot" />
    <span class="slidev-agent-typing-dots__dot" />
  </span>
</template>

<style scoped>
.slidev-agent-typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 0.28em;
  vertical-align: middle;
  height: 1em;
  color: #93c5fd;
}

.slidev-agent-typing-dots__dot {
  flex: 0 0 auto;
  width: 0.4em;
  min-width: 4px;
  height: 0.4em;
  min-height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  animation: slidev-agent-typing-dots-wave 1.05s ease-in-out infinite;
}

.slidev-agent-typing-dots__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.slidev-agent-typing-dots__dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes slidev-agent-typing-dots-wave {
  0%,
  40%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  20% {
    opacity: 1;
    transform: translateY(-0.12em);
  }
}
</style>
