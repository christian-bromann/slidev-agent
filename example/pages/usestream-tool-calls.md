---
layout: two-cols-header
transition: slide-left
---

# Rendering Tool Calls in React

<span class="opacity-60 text-sm">Access tool call state via <code>stream.toolCalls</code> — filter per-message, render with loading / error / success states</span>

::left::

**`Chat.tsx` — filter tool calls per message**

```tsx {maxHeight:'270px'}
import { useStream } from "@langchain/react";

export function Chat() {
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "my_agent",
  });
  return stream.messages.map((msg) => (
    <Message
      key={msg.id} message={msg}
      toolCalls={stream.toolCalls.filter(
        (tc) => msg.tool_calls?.find(
          (t) => t.id === tc.call.id))}
    />
  ));
}
```

::right::

**`ToolCard.tsx` — state-driven rendering**

```tsx {maxHeight:'215px'}
function ToolCard({ toolCall }) {
  if (toolCall.state === "pending")
    return <Spinner>{toolCall.call.name}</Spinner>;
  if (toolCall.state === "error")
    return <Error>{toolCall.call.name}</Error>;
  return (
    <div className="rounded border p-3">
      <strong>{toolCall.call.name}</strong>
      <pre>{JSON.stringify(
        toolCall.result?.content, null, 2)}</pre>
    </div>
  );
}
```

<div class="mt-2 rounded border border-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs leading-snug">

💡 **`state`** drives the UI branch: `"pending"` → spinner · `"error"` → alert · `"completed"` → result

</div>
