---
layout: two-cols-header
transition: slide-left
class: text-sm
---

# Additional SDK Features

<div class="mb-1 text-xs opacity-60">Angular · React · Svelte · Vue — shared capabilities beyond the basics</div>

::left::

<div class="space-y-2 pr-3">

**🛑 Interrupts** <span class="text-xs opacity-60">— Human-in-the-loop</span>

<div class="text-xs opacity-80 leading-snug">Pause graph execution mid-run. Read <code>interrupt</code> to surface pending input requests, then resume with <code>submit(null, { command: { resume: value } })</code>.</div>

**⏱️ Branching & Time Travel** <span class="text-xs opacity-60">— Navigate conversation checkpoints</span>

<div class="text-xs opacity-80 leading-snug">Enable with <code>fetchStateHistory: true</code>. Each message is a checkpoint — use <code>getMessagesMetadata()</code> + <code>setBranch()</code> to travel back in time and fork a new branch from any point.</div>

**📋 Server-Side Queuing** <span class="text-xs opacity-60">— Concurrent run management</span>

<div class="text-xs opacity-80 leading-snug">Calling <code>submit()</code> while streaming auto-enqueues server-side. Inspect via <code>queue.size</code> / <code>queue.entries</code>, cancel with <code>queue.cancel(id)</code> or <code>queue.clear()</code>.</div>

**🔀 Thread Management** <span class="text-xs opacity-60">— Multi-conversation support</span>

<div class="text-xs opacity-80 leading-snug">Call <code>switchThread(id)</code> to swap context; pass <code>null</code> to start fresh. Automatically cancels the pending queue.</div>

</div>

::right::

<div class="space-y-2 pl-1">

**🔌 Custom Transport** <span class="text-xs opacity-60">— Bring your own backend</span>

<div class="text-xs opacity-80 leading-snug">Replace the LangGraph API with any backend using <code>FetchStreamTransport({ url: "..." })</code> in place of <code>assistantId</code>.</div>

**🌐 State Sharing** <span class="text-xs opacity-60">— Context/provider patterns</span>

<div class="text-xs opacity-80 leading-snug">Share one stream instance across the component tree — no prop drilling:</div>

<div class="text-xs mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 opacity-85">
  <div><span class="font-mono bg-blue-500/20 rounded px-1">React</span> <code>&lt;StreamProvider&gt;</code> + <code>useStreamContext()</code></div>
  <div><span class="font-mono bg-red-500/20 rounded px-1">Angular</span> <code>provideStream()</code> + <code>injectStream()</code></div>
  <div><span class="font-mono bg-orange-500/20 rounded px-1">Svelte</span> <code>setStreamContext()</code> + <code>getStreamContext()</code></div>
  <div><span class="font-mono bg-green-500/20 rounded px-1">Vue</span> <code>provideStream()</code> + <code>useStreamContext()</code></div>
</div>

**⚛️ `useSuspenseStream`** <span class="text-xs bg-blue-500/20 rounded px-1 py-0.5">React only</span>

<div class="text-xs opacity-80 leading-snug">Integrates with React Suspense &amp; Error Boundaries. Suspends on initial load, streams incrementally, exposes <code>isStreaming</code> instead of <code>isLoading</code>.</div>

</div>

<!--
Emphasis points for presenting:
- Interrupts are the key human-in-the-loop primitive — very powerful for approval flows, clarification prompts, and multi-step confirmations.
- Branching + thread management together enable rich chat UX with history navigation and multi-session support.
- State Sharing solves the real-world pain point of passing stream state deep into component trees.
- Remind React devs about useSuspenseStream — it integrates naturally with their existing Suspense boundaries and simplifies loading states.
- Type Safety is worth emphasizing: generics are the same pattern across all four frameworks, so the mental model transfers cleanly.
-->
