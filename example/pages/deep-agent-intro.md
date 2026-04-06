---
layout: two-cols
transition: slide-left
class: deep-agent-intro
---

# What is Deep Agents?

<div class="mt-1 mb-3 text-sm opacity-70">A <span class="text-blue-400 font-semibold">JavaScript/TypeScript SDK</span> built on top of <span class="text-green-400 font-semibold">LangChain</span> + <span class="text-purple-400 font-semibold">LangGraph</span></div>

<div class="mb-3 text-sm leading-snug opacity-85">
  An <span class="text-yellow-400 font-bold">"agent harness"</span> — baked-in capabilities so you wire nothing up from scratch.
</div>

<div class="capabilities text-sm">

<div v-click class="cap-item">
  <span class="badge bg-blue-500">🧠 Planning</span>
  <span class="cap-text">System prompts that teach the model to <strong>plan before acting</strong></span>
</div>

<div v-click class="cap-item">
  <span class="badge bg-purple-500">🤖 Subagents</span>
  <span class="cap-text">Coordinator-worker for <strong>parallel work</strong></span>
</div>

<div v-click class="cap-item">
  <span class="badge bg-green-600">💾 Memory</span>
  <span class="cap-text"><strong>Persistent memory</strong> across sessions</span>
</div>

<div v-click class="cap-item">
  <span class="badge bg-orange-500">📁 File System</span>
  <span class="cap-text">Pluggable <strong>context management</strong></span>
</div>

<div v-click class="cap-item">
  <span class="badge bg-red-500">🙋 Human Loop</span>
  <span class="cap-text">Composable <strong>per-tool approval</strong></span>
</div>

<div v-click class="cap-item">
  <span class="badge bg-teal-600">🔒 Sandboxes</span>
  <span class="cap-text"><strong>Secure</strong> execution environments</span>
</div>

</div>

::right::

<div class="right-panel pl-5 pt-1 flex flex-col gap-3">

<div v-click class="stack-box">
  <div class="stack-label">The Stack</div>
  <div class="stack-layers">
    <div class="stack-layer layer-lcc">LangChain Core</div>
    <div class="stack-arrow">↓</div>
    <div class="stack-layer layer-lc">LangGraph</div>
    <div class="stack-arrow">↓</div>
    <div class="stack-layer layer-lg">LangChain</div>
    <div class="stack-arrow">↓</div>
    <div class="stack-layer layer-da">Deep Agents</div>
  </div>
</div>

<div v-click class="diagram-wrap">

```mermaid {scale: 0.62}
flowchart LR
    U([User]) --> C[Coordinator Agent]
    C --> S1[Subagent A]
    C --> S2[Subagent B]
    C --> S3[Subagent C]
    S1 --> C
    S2 --> C
    S3 --> C
    C --> R([Result])
```

</div>

<div v-click class="value-prop">
  Handles <strong>complex multi-step tasks</strong>, manages <strong>large context</strong>, runs <strong>interactively</strong> or <strong>non-interactively</strong>
</div>

</div>

<style>
.deep-agent-intro .capabilities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.deep-agent-intro .cap-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.deep-agent-intro .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  min-width: 108px;
  flex-shrink: 0;
}
.deep-agent-intro .cap-text {
  font-size: 0.75rem;
  line-height: 1.3;
}
.deep-agent-intro .right-panel {
  height: calc(100% - 2rem);
  overflow: hidden;
}
.deep-agent-intro .stack-box {
  display: flex;
  flex-direction: column;
}
.deep-agent-intro .stack-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.5;
  margin-bottom: 4px;
}
.deep-agent-intro .stack-layers {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.deep-agent-intro .stack-layer {
  text-align: center;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}
.deep-agent-intro .layer-lcc {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}
.deep-agent-intro .layer-lc {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.45);
  color: #4ade80;
}
.deep-agent-intro .layer-lg {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.45);
  color: #c084fc;
}
.deep-agent-intro .layer-da {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.55);
  color: #60a5fa;
}
.deep-agent-intro .stack-arrow {
  font-size: 0.85rem;
  opacity: 0.45;
  text-align: center;
  line-height: 1.1;
  margin: 1px 0;
}
.deep-agent-intro .diagram-wrap {
  flex: 0 0 auto;
  overflow: hidden;
}
.deep-agent-intro .value-prop {
  font-size: 0.7rem;
  opacity: 0.8;
  line-height: 1.5;
  border-left: 2px solid rgba(96, 165, 250, 0.7);
  padding-left: 10px;
}
</style>
