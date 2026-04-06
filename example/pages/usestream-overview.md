---
layout: two-cols-header
transition: slide-left
---

# Building Interactive UIs with `useStream`

<div class="mb-2 text-sm opacity-70">The frontend bridge to Deep Agents streaming — reactive state for your UI</div>

<!-- Architecture diagram -->
<div class="flex items-center gap-2 text-sm font-mono mb-1 mt-1">
  <span class="px-2 py-1 rounded bg-blue-500 bg-opacity-20 border border-blue-400 text-blue-300">createDeepAgent</span>
  <span class="opacity-60">──── streaming API ────▶</span>
  <span class="px-2 py-1 rounded bg-green-500 bg-opacity-20 border border-green-400 text-green-300">useStream</span>
  <span class="opacity-60">──▶</span>
  <span class="px-2 py-1 rounded bg-purple-500 bg-opacity-20 border border-purple-400 text-purple-300">Reactive UI</span>
</div>

::left::

<div class="pr-4">

**Available for all major frameworks**

```typescript
import { useStream } from "@langchain/react";    // React
import { useStream } from "@langchain/vue";       // Vue
import { useStream } from "@langchain/svelte";    // Svelte
import { useStream } from "@langchain/angular";   // Angular
```

<div v-click class="mt-4">

**Key options**

<div class="text-sm space-y-3 font-mono">
  <div><span class="text-yellow-400">apiUrl</span> <span class="opacity-60">— URL of the agent backend</span></div>
  <div><span class="text-yellow-400">assistantId</span> <span class="opacity-60">— which agent graph to connect to</span></div>
  <div><span class="text-yellow-400">filterSubagentMessages</span> <span class="opacity-60">— keep UI clean</span></div>
</div>

</div>
</div>

::right::

<div v-click class="pl-4 border-l border-gray-600">

**Returns from `useStream`**

<div class="text-sm space-y-3 font-mono">
  <div>
    <span class="text-green-400">messages</span>
    <span class="opacity-60 text-xs ml-1">— reactive conversation array</span>
  </div>
  <div>
    <span class="text-green-400">toolCalls</span>
    <span class="opacity-60 text-xs ml-1">— <code>ToolCallWithResult[]</code></span>
  </div>
  <div>
    <span class="text-green-400">subagents</span>
    <span class="opacity-60 text-xs ml-1">— Map of active/completed subagents</span>
  </div>
  <div>
    <span class="text-green-400">getSubagentsByMessage(id)</span>
    <span class="opacity-60 text-xs ml-1">— link subagents to messages</span>
  </div>
  <div>
    <span class="text-green-400">submit(input, config?)</span>
    <span class="opacity-60 text-xs ml-1">— send a new message</span>
  </div>
  <div>
    <span class="text-green-400">isLoading</span>
    <span class="opacity-60 text-xs ml-1">— loading state boolean</span>
  </div>
</div>

</div>

<!--
useStream is the key frontend hook that bridges LangChain's streaming backend to any major framework.
It provides reactive state management for conversations, tool calls, and subagents out of the box.
-->
