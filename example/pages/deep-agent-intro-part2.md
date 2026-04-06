---
layout: default
transition: slide-left
class: deep-agent-intro-p2
---

# Architecture at a Glance

<div class="subtitle">How Deep Agents orchestrates work</div>

<div class="content-row">

  <!-- The Stack -->
  <div v-click class="col col-stack">
    <div class="col-label">The Stack</div>
    <div class="col-body">
      <div class="stack-layers">
        <div class="stack-layer layer-lcc">LangChain Core</div>
        <div class="stack-arrow">↓</div>
        <div class="stack-layer layer-lg">LangGraph</div>
        <div class="stack-arrow">↓</div>
        <div class="stack-layer layer-lc">LangChain</div>
        <div class="stack-arrow">↓</div>
        <div class="stack-layer layer-da">Deep Agents</div>
      </div>
    </div>
  </div>

  <!-- Mermaid flowchart -->
  <div v-click class="col col-diagram">
    <div class="col-label">Orchestration Flow</div>
    <div class="col-body diagram-body">

```mermaid {scale: 0.75}
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
  </div>

  <!-- Value prop -->
  <div v-click class="col col-value">
    <div class="col-label">Why It Matters</div>
    <div class="col-body">
      <div class="value-prop">
        Handles <strong>complex multi-step tasks</strong>, manages <strong>large context</strong>, runs <strong>interactively</strong> or <strong>non-interactively</strong>
      </div>
    </div>
  </div>

</div>

<style>
.deep-agent-intro-p2 .subtitle {
  margin-top: 2px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  opacity: 0.55;
}

.deep-agent-intro-p2 .content-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
}

/* Column base */
.deep-agent-intro-p2 .col {
  display: flex;
  flex-direction: column;
}
.deep-agent-intro-p2 .col-stack {
  flex: 0 0 27%;
}
.deep-agent-intro-p2 .col-diagram {
  flex: 1 1 auto;
  min-width: 0;
}
.deep-agent-intro-p2 .col-value {
  flex: 0 0 24%;
}

.deep-agent-intro-p2 .col-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.4;
  margin-bottom: 10px;
  height: 14px;
  line-height: 14px;
}

.deep-agent-intro-p2 .col-body {
  display: flex;
  flex-direction: column;
}

.deep-agent-intro-p2 .diagram-body {
  overflow: hidden;
}

/* Stack layers */
.deep-agent-intro-p2 .stack-layers {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.deep-agent-intro-p2 .stack-layer {
  text-align: center;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.deep-agent-intro-p2 .layer-lcc {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}
.deep-agent-intro-p2 .layer-lg {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.45);
  color: #4ade80;
}
.deep-agent-intro-p2 .layer-lc {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.45);
  color: #c084fc;
}
.deep-agent-intro-p2 .layer-da {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.55);
  color: #60a5fa;
}
.deep-agent-intro-p2 .stack-arrow {
  font-size: 0.85rem;
  opacity: 0.4;
  text-align: center;
  line-height: 1;
  margin: 3px 0;
}

/* Value prop */
.deep-agent-intro-p2 .value-prop {
  font-size: 0.8rem;
  line-height: 1.7;
  opacity: 0.9;
  border-left: 3px solid rgba(96, 165, 250, 0.7);
  padding: 12px 14px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 0 6px 6px 0;
}
</style>
