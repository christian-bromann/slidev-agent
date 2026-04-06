---
layout: default
transition: slide-left
class: comparison-slide
zoom: 0.85
---

# How Does It Compare?

<div class="grid grid-cols-4 gap-0 text-xs mt-3 rounded-xl overflow-hidden border border-gray-700 shadow-xl">

  <!-- Header Row -->
  <div class="col-header feature-col">Feature</div>
  <div class="col-header highlight-col">🔷 Deep Agents SDK</div>
  <div class="col-header">Claude Code<br/><span class="opacity-60 text-xs">(Anthropic)</span></div>
  <div class="col-header">OpenAI Codex CLI</div>

  <!-- Row 1: Use case -->
  <div v-click="1" class="row-label">Use case</div>
  <div v-click="1" class="row-cell highlight-cell">Custom general-purpose agents</div>
  <div v-click="1" class="row-cell">Prebuilt coding agent</div>
  <div v-click="1" class="row-cell">TypeScript SDK + CLI + desktop app</div>

  <!-- Row 2: Model flexibility -->
  <div v-click="2" class="row-label">Model flexibility</div>
  <div v-click="2" class="row-cell highlight-cell"><span class="text-green-400 font-semibold">Model-agnostic</span><br/><span class="opacity-70">100s of models</span></div>
  <div v-click="2" class="row-cell opacity-70">Claude models only</div>
  <div v-click="2" class="row-cell opacity-70">OpenAI models only</div>

  <!-- Row 3: Open source -->
  <div v-click="3" class="row-label">Open source</div>
  <div v-click="3" class="row-cell highlight-cell"><span class="badge-green">✅ Open source</span></div>
  <div v-click="3" class="row-cell"><span class="badge-yellow">⚠️ MIT</span><br/><span class="opacity-60 text-xs">underlying proprietary</span></div>
  <div v-click="3" class="row-cell"><span class="badge-red">❌ Closed</span></div>

  <!-- Row 4: Observability -->
  <div v-click="4" class="row-label">Observability</div>
  <div v-click="4" class="row-cell highlight-cell"><span class="text-blue-300">LangSmith</span><br/><span class="opacity-70">tracing + evals</span></div>
  <div v-click="4" class="row-cell opacity-70">OpenAI traces</div>
  <div v-click="4" class="row-cell opacity-40">—</div>

  <!-- Row 5: Human-in-the-loop -->
  <div v-click="5" class="row-label">Human-in-the-loop</div>
  <div v-click="5" class="row-cell highlight-cell"><span class="badge-green">✅</span> Composable,<br/><span class="opacity-70">per-tool</span></div>
  <div v-click="5" class="row-cell"><span class="badge-green">✅</span> Permission system</div>
  <div v-click="5" class="row-cell"><span class="badge-green">✅</span> Approval modes</div>

  <!-- Row 6: Time Travel -->
  <div v-click="6" class="row-label">Time Travel</div>
  <div v-click="6" class="row-cell highlight-cell"><span class="badge-green">✅</span> State branching</div>
  <div v-click="6" class="row-cell"><span class="badge-red">❌</span></div>
  <div v-click="6" class="row-cell"><span class="badge-red">❌</span></div>

  <!-- Row 7: IDE Integration -->
  <div v-click="7" class="row-label">IDE Integration</div>
  <div v-click="7" class="row-cell highlight-cell"><span class="text-purple-300 font-semibold">ACP server</span></div>
  <div v-click="7" class="row-cell opacity-40">—</div>
  <div v-click="7" class="row-cell opacity-40">—</div>

</div>

<style>
.comparison-slide .slidev-layout {
  padding: 0.75rem 1.5rem;
}

.comparison-slide h1 {
  font-size: 1.5rem;
  margin-bottom: 0.1rem;
  background: linear-gradient(90deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.col-header {
  @apply px-2 py-1.5 text-center font-bold text-xs uppercase tracking-wide;
  background: #1e2235;
  color: #94a3b8;
  border-bottom: 2px solid #334155;
  border-right: 1px solid #2d3748;
  line-height: 1.3;
}

.col-header:last-child {
  border-right: none;
}

.col-header.feature-col {
  background: #161b2e;
  color: #64748b;
}

.col-header.highlight-col {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e2a4a 100%);
  color: #93c5fd;
  border-bottom: 2px solid #3b82f6;
}

.row-label {
  @apply px-2 py-1.5 font-semibold text-xs;
  color: #94a3b8;
  background: #161b2e;
  border-bottom: 1px solid #1e2a3d;
  border-right: 1px solid #2d3748;
  display: flex;
  align-items: center;
  line-height: 1.3;
}

.row-cell {
  @apply px-2 py-1.5 text-xs text-center leading-snug;
  color: #cbd5e1;
  background: #0f172a;
  border-bottom: 1px solid #1e2a3d;
  border-right: 1px solid #1e2a3d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  line-height: 1.3;
}

.row-cell:last-child {
  border-right: none;
}

.row-cell.highlight-cell {
  background: linear-gradient(135deg, #0f2040 0%, #0d1b33 100%);
  border-right: 1px solid #2563eb40;
  color: #dbeafe;
}

.badge-green {
  @apply text-green-400;
}

.badge-yellow {
  @apply text-yellow-400;
}

.badge-red {
  @apply text-red-400;
}
</style>
