---
layout: two-cols-header
transition: slide-left
---

# Typing `useStream` for Safety

<span class="opacity-60 text-sm">_Define your agent's state shape once — TypeScript does the rest_</span>

::left::

**1. Define your agent state interface**

```ts
import type { agent } from "./agent";

// Pass it as a type parameter
const stream = useStream<typeof agent>({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
});

// ✅ stream.values.messages → BaseMessage[]
// ❌ Without <typeof agent>  → unknown
```


<div class="mt-3 rounded border border-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 text-xs leading-snug">

🔒 **Compile-time safety** — a schema change in your graph instantly flags every UI component that reads those fields

</div>

::right::

**2. Typed stream values + narrowing tool calls**

```tsx
import type { weatherTool, calculatorTool } from "./agent";
import type { ToolCallWithResult } from "@langchain/react";

export type AgentToolCalls =
  | ToolCallFromTool<typeof weatherTool>
  | ToolCallFromTool<typeof calculatorTool>;

export function ToolCallCard({ toolCall }: { toolCall: ToolCallWithResult<AgentToolCalls> }) {
  const { call, result, state } = toolCall;

  if (call.name === "get_weather")
    return <WeatherToolCard call={call} result={result} state={state} />;

  if (call.name === "calculate")
    return <CalculatorToolCard call={call} result={result} state={state} />;

  return <GenericToolCard call={call} result={result} state={state} />;
}
```
