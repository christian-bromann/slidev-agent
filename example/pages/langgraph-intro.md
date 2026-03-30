# LangGraph for Advanced Workflows

<div class="text-center">

## Building Intelligent Multi-Agent Systems

<div class="mt-8">

**LangGraph** is a framework for building stateful, multi-actor applications with LLMs

</div>

</div>

<div class="mt-12 grid grid-cols-2 gap-8">

<div>

### Why LangGraph?

- 🔄 **Cyclic workflows** beyond linear chains
- 🎯 **State management** for complex agents
- 🤝 **Human-in-the-loop** capabilities
- 🌊 **Flexible control flow** with conditional routing
- 📊 **Graph-based execution** for clarity

</div>

<div>

### Use Cases

- Multi-step reasoning agents
- Iterative refinement workflows
- Tool-calling with retry logic
- Collaborative multi-agent systems
- Complex decision-making pipelines

</div>

</div>

---

# Graph-Based Agent Execution

<div class="grid grid-cols-2 gap-8">

<div>

## Traditional Chains

```mermaid
graph TD
    A[Input] --> B[LLM Call]
    B --> C[Tool Call]
    C --> D[LLM Call]
    D --> E[Output]
    
    style A fill:#e1f5ff
    style E fill:#e1f5ff
    style B fill:#fff4e1
    style D fill:#fff4e1
    style C fill:#ffe1f5
```

<div class="text-sm mt-4">

❌ Linear flow only  
❌ Hard to add loops  
❌ Limited error handling  

</div>

</div>

<div>

## LangGraph

```mermaid
graph TD
    A[Start] --> B[Agent]
    B --> C{Decision}
    C -->|Tool Needed| D[Execute Tool]
    C -->|Human Input| E[Wait for Human]
    C -->|Complete| F[End]
    D --> B
    E --> B
    
    style A fill:#e1f5ff
    style F fill:#e1f5ff
    style B fill:#fff4e1
    style D fill:#ffe1f5
    style E fill:#d4f5e1
    style C fill:#f5e1ff
```

<div class="text-sm mt-4">

✅ Cyclic workflows  
✅ Conditional routing  
✅ Flexible control flow  

</div>

</div>

</div>

---

# StateGraph: The Core Abstraction

<div class="grid grid-cols-2 gap-6">

<div>

## Defining State

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph
from operator import add

class AgentState(TypedDict):
    messages: Annotated[list, add]
    current_step: str
    iterations: int
    final_answer: str | None

# Create graph with state
graph = StateGraph(AgentState)
```

<div class="mt-4 text-sm bg-blue-50 p-3 rounded">

**State** persists across nodes and tracks execution progress

</div>

</div>

<div>

## Key Concepts

### **Nodes** 🔵
Functions that process state
```python
def agent_node(state: AgentState):
    # Process state
    return {"current_step": "reasoning"}
```

### **Edges** ➡️
Connect nodes (static routing)
```python
graph.add_edge("node_a", "node_b")
```

### **Conditional Edges** 🔀
Dynamic routing based on state
```python
graph.add_conditional_edges(
    "agent",
    should_continue,  # Router function
    {
        "continue": "tools",
        "end": END
    }
)
```

</div>

</div>

---

# Building a LangGraph Workflow

<div class="grid grid-cols-2 gap-6">

<div>

## Step-by-Step Example

```python {all|1-5|7-9|11-14|16-19|21-24|26-29|all}
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor

# 1. Define nodes
def call_agent(state):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

def call_tools(state):
    tool_executor.invoke(
        state["messages"][-1].tool_calls
    )
    return {"messages": [tool_result]}

# 2. Create graph
graph = StateGraph(AgentState)
graph.add_node("agent", call_agent)
graph.add_node("tools", call_tools)

# 3. Add conditional routing
def should_continue(state):
    last = state["messages"][-1]
    return "tools" if last.tool_calls else "end"

graph.add_conditional_edges(
    "agent",
    should_continue,
    {"tools": "tools", "end": END}
)

# 4. Set entry and compile
graph.set_entry_point("agent")
graph.add_edge("tools", "agent")
app = graph.compile()
```

</div>

<div>

## Execution Flow

```mermaid
graph TB
    START([Start]) --> AGENT[Agent Node]
    AGENT --> DECIDE{should_continue?}
    DECIDE -->|tool_calls exist| TOOLS[Tools Node]
    DECIDE -->|no tools| END_NODE([End])
    TOOLS --> AGENT
    
    style START fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style END_NODE fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style AGENT fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    style TOOLS fill:#ffe1f5,stroke:#cc0066,stroke-width:2px
    style DECIDE fill:#f5e1ff,stroke:#9900cc,stroke-width:2px
```

<div class="mt-6">

### Key Features

- **Cyclic**: Tools → Agent loop
- **Conditional**: Router decides path
- **Stateful**: Messages accumulate
- **Flexible**: Easy to extend

</div>

</div>

</div>

---

# Advanced Features

<div class="grid grid-cols-2 gap-6">

<div>

## Human-in-the-Loop

```python
from langgraph.checkpoint import MemorySaver

# Enable persistence
memory = MemorySaver()
app = graph.compile(checkpointer=memory)

# Run until interrupt
config = {"configurable": {"thread_id": "1"}}
for event in app.stream(inputs, config):
    if event.get("needs_human"):
        break  # Pause for human input

# Resume after human input
app.invoke(
    {"human_response": "Approved"},
    config
)
```

<div class="mt-4 bg-green-50 p-3 rounded text-sm">

✅ Pause execution for approvals  
✅ Persist state across sessions  
✅ Resume from checkpoints  

</div>

</div>

<div>

## Cyclic Workflows

```python
def should_continue(state):
    if state["iterations"] >= 5:
        return "end"
    if state["quality_score"] < 0.8:
        return "refine"
    return "end"

graph.add_conditional_edges(
    "evaluate",
    should_continue,
    {
        "refine": "agent",  # Loop back
        "end": END
    }
)
```

<div class="mt-4">

```mermaid
graph LR
    A[Agent] --> B[Evaluate]
    B -->|quality < 0.8| A
    B -->|iterations ≥ 5| C[End]
    B -->|quality ≥ 0.8| C
    
    style A fill:#fff4e1
    style B fill:#f5e1ff
    style C fill:#e1f5ff
```

</div>

<div class="mt-2 text-sm bg-purple-50 p-3 rounded">

**Iterative refinement** until quality threshold or max iterations

</div>

</div>

</div>

---

# LangGraph vs Traditional Agents

<div class="grid grid-cols-2 gap-6">

<div>

## Traditional Agents (LangChain)

```python
from langchain.agents import AgentExecutor

agent = create_react_agent(
    llm, tools, prompt
)

executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=10
)

result = executor.invoke({"input": query})
```

### Limitations

- ❌ Fixed execution pattern
- ❌ Limited control flow
- ❌ Hard to customize loops
- ❌ No built-in state persistence
- ❌ Difficult multi-agent coordination

</div>

<div>

## LangGraph Agents

```python
from langgraph.prebuilt import create_react_agent

graph = StateGraph(AgentState)

# Full control over each step
graph.add_node("planner", plan_step)
graph.add_node("executor", execute_step)
graph.add_node("evaluator", evaluate_step)

# Custom routing logic
graph.add_conditional_edges(...)

app = graph.compile(
    checkpointer=MemorySaver()
)
```

### Advantages

- ✅ Explicit graph structure
- ✅ Flexible control flow
- ✅ Easy cyclic workflows
- ✅ Built-in checkpointing
- ✅ Multi-agent orchestration
- ✅ Human-in-the-loop support

</div>

</div>

---

# LangGraph Architecture Diagram

```mermaid
graph TB
    subgraph "LangGraph Application"
        START([User Input]) --> ROUTER{Router}
        
        subgraph "Agent Nodes"
            PLANNER[Planning Agent]
            RESEARCHER[Research Agent]
            WRITER[Writing Agent]
        end
        
        subgraph "Tool Nodes"
            SEARCH[Web Search]
            DB[Database Query]
            API[API Call]
        end
        
        subgraph "Control Nodes"
            EVAL[Evaluator]
            HUMAN[Human Review]
        end
        
        ROUTER -->|analyze| PLANNER
        ROUTER -->|research| RESEARCHER
        ROUTER -->|write| WRITER
        
        PLANNER --> EVAL
        RESEARCHER --> SEARCH
        RESEARCHER --> DB
        WRITER --> API
        
        SEARCH --> EVAL
        DB --> EVAL
        API --> EVAL
        
        EVAL -->|quality_check| DECISION{Quality OK?}
        DECISION -->|No| ROUTER
        DECISION -->|Needs Human| HUMAN
        DECISION -->|Yes| END_NODE([Final Output])
        
        HUMAN -->|approved| END_NODE
        HUMAN -->|revise| ROUTER
    end
    
    subgraph "State Management"
        STATE[(StateGraph)]
    end
    
    subgraph "Persistence Layer"
        CHECKPOINT[(Checkpointer)]
    end
    
    PLANNER -.->|read/write| STATE
    RESEARCHER -.->|read/write| STATE
    WRITER -.->|read/write| STATE
    EVAL -.->|read/write| STATE
    
    STATE -.->|save| CHECKPOINT
    CHECKPOINT -.->|restore| STATE
    
    style START fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style END_NODE fill:#e1f5ff,stroke:#0066cc,stroke-width:3px
    style PLANNER fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    style RESEARCHER fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    style WRITER fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    style SEARCH fill:#ffe1f5,stroke:#cc0066,stroke-width:2px
    style DB fill:#ffe1f5,stroke:#cc0066,stroke-width:2px
    style API fill:#ffe1f5,stroke:#cc0066,stroke-width:2px
    style EVAL fill:#d4f5e1,stroke:#00cc66,stroke-width:2px
    style HUMAN fill:#d4f5e1,stroke:#00cc66,stroke-width:2px
    style ROUTER fill:#f5e1ff,stroke:#9900cc,stroke-width:2px
    style DECISION fill:#f5e1ff,stroke:#9900cc,stroke-width:2px
    style STATE fill:#e8e8e8,stroke:#666666,stroke-width:2px
    style CHECKPOINT fill:#e8e8e8,stroke:#666666,stroke-width:2px
```

<div class="mt-4 grid grid-cols-4 gap-2 text-xs">
<div class="bg-blue-100 p-2 rounded">🔵 Entry/Exit Points</div>
<div class="bg-orange-100 p-2 rounded">🟠 Agent Nodes</div>
<div class="bg-pink-100 p-2 rounded">🔴 Tool Nodes</div>
<div class="bg-green-100 p-2 rounded">🟢 Control Nodes</div>
</div>

---

# Key Takeaways

<div class="grid grid-cols-2 gap-8">

<div>

## When to Use LangGraph

✅ **Multi-step reasoning** with iteration  
✅ **Complex control flow** beyond chains  
✅ **Human-in-the-loop** workflows  
✅ **Multi-agent collaboration**  
✅ **Stateful conversations** with memory  
✅ **Error handling** with retry logic  

<div class="mt-6 bg-blue-50 p-4 rounded">

### Best For

- Research assistants with iterative refinement
- Code generation with testing loops
- Customer support with escalation paths
- Data analysis with validation steps

</div>

</div>

<div>

## Core Concepts Recap

```python
# 1. Define state schema
class State(TypedDict):
    messages: list
    context: dict

# 2. Create graph
graph = StateGraph(State)

# 3. Add nodes (processing units)
graph.add_node("node_name", function)

# 4. Add edges (routing)
graph.add_edge("a", "b")  # Static
graph.add_conditional_edges(  # Dynamic
    "a", router_fn, mapping
)

# 5. Compile with features
app = graph.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["human_review"]
)

# 6. Execute
result = app.invoke(input, config)
```

</div>

</div>

<div class="mt-8 text-center text-xl">

🚀 **LangGraph enables production-grade agent applications with full control**

</div>
