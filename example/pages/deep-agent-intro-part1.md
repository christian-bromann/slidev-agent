---
layout: default
transition: slide-left
class: deep-agent-intro-p1
---

# What is Deep Agents?

<div class="mt-1 mb-2 text-sm opacity-70">
  Available as a <span class="text-blue-400 font-semibold">JavaScript/TypeScript SDK</span> and a <span class="text-yellow-400 font-semibold">Python package</span>, built on top of
  <span class="text-green-400 font-semibold">LangChain</span> +
  <span class="text-purple-400 font-semibold">LangGraph</span>
</div>

<div class="install-row my-8">
  <span class="install-pill install-js">npm install deepagents</span>
  <span class="install-pill install-py">pip install deepagents</span>
</div>

<div class="tagline mb-4">
  An <span class="text-yellow-400 font-bold">"agent harness"</span> — baked-in capabilities so you wire nothing up from scratch.
</div>

<div class="capabilities-grid">

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

<style>
.deep-agent-intro-p1 {
  padding: 1.5rem 3rem;
}

.deep-agent-intro-p1 h1 {
  font-size: 2rem !important;
  margin-bottom: 0 !important;
}

.deep-agent-intro-p1 .install-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.deep-agent-intro-p1 .install-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.deep-agent-intro-p1 .install-js {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.4);
  color: #93c5fd;
}

.deep-agent-intro-p1 .install-py {
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(250, 204, 21, 0.4);
  color: #fde047;
}

.deep-agent-intro-p1 .tagline {
  font-size: 1rem;
  line-height: 1.5;
  border-left: 3px solid rgba(250, 204, 21, 0.7);
  padding-left: 0.75rem;
}

.deep-agent-intro-p1 .capabilities-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.deep-agent-intro-p1 .cap-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 20px;
  border-radius: 10px;
  background: rgba(100, 116, 139, 0.12);
  border: 1px solid rgba(100, 116, 139, 0.25);
  min-width: 0;
}

.deep-agent-intro-p1 .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  width: 110px;
  min-width: 110px;
  flex-shrink: 0;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.deep-agent-intro-p1 .cap-text {
  font-size: 0.82rem;
  line-height: 1.35;
  min-width: 0;
  word-break: break-word;
}

.deep-agent-intro-p1 .cap-text strong {
  font-weight: 700;
}
</style>
