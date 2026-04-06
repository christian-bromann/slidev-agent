---
layout: two-cols-header
transition: slide-left
class: text-sm
---

# Rendering Subagent Progress Cards

<span class="text-xs opacity-70">Track and display subagent progress in real time using the <code>useStream</code> hook</span>

::left::

<div class="pr-3">

**Chat setup**

```tsx {all}{lines:true,maxHeight:'240px'}
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "deep_agent",
  // Hide raw subagent messages
  filterSubagentMessages: true,
});

function handleSubmit(text: string) {
  stream.submit(
    { messages: [{ type: "human", content: text }] },
    { streamSubgraphs: true }
  );
}

{stream.messages.map((msg) => (
  <MessageWithSubagents
    key={msg.id}
    message={msg}
    subagents={
      stream.getSubagentsByMessage(msg.id)
    }
  />
))}
```

<div class="mt-2 text-xs bg-blue-900/30 border border-blue-400/40 rounded px-2 py-1.5 text-blue-200 leading-snug" style="background:rgba(30,58,138,0.85);border-color:rgba(96,165,250,0.5);color:#bfdbfe;">
  <strong style="color:#e0f2fe;">SubagentStreamInterface:</strong><br/>
  <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">id</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">status</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">messages</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">result</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">toolCall</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">startedAt</code> · <code class="text-xs" style="background:rgba(29,78,216,0.7);color:#eff6ff;border-radius:3px;padding:0 3px;">completedAt</code>
</div>

</div>

::right::

<div v-click class="pl-1 pr-1">

**SubagentCard component**

```tsx {2-5|7,8|10-15|17-21|all}{lines:true,maxHeight:'240px'}
function SubagentCard({ subagent }) {
  // status: "pending" | "running"
  //         "complete" | "error"
  // toolCall.args.subagent_type
  // messages: real-time stream

  return (
    <div className="border rounded-lg p-4">
      <StatusIcon status={subagent.status} />
      <h4>
        {subagent.toolCall.args.subagent_type}
      </h4>
      <p className="text-xs text-gray-500">
        {subagent.toolCall.args.description}
      </p>
      {subagent.status === "running" && (
        <div className="animate-pulse text-sm">
          {/* Stream messages in real time */}
          {subagent.messages.at(-1)?.content}
        </div>
      )}
      {subagent.status === "complete" && (
        <div className="text-sm">
          {subagent.result}
        </div>
      )}
    </div>
  );
}
```

<div class="mt-2 text-xs bg-green-900/30 border border-green-400/40 rounded px-2 py-1.5 text-green-200 leading-snug" style="background:rgba(20,83,45,0.85);border-color:rgba(74,222,128,0.5);color:#bbf7d0;">
  Each subagent has its own real-time message stream!
</div>

</div>

<!--
Key insight: filterSubagentMessages:true keeps the main chat clean while
getSubagentsByMessage() lets you render rich progress cards per message.
Each SubagentStreamInterface exposes status, live messages, and final result.
-->
