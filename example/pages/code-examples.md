---
layout: two-cols
---

# Simple Agent Example

A complete working agent with function calling

```python {all|1-4|6-15|17-23|all}
from openai import OpenAI
import json

client = OpenAI()

# Define tools
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
}]

# Agent loop
messages = [{"role": "user", "content": "What's the weather in Paris?"}]

response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    tools=tools
)

# Handle tool call
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    result = get_weather(json.loads(tool_call.function.arguments))
    
    messages.append(response.choices[0].message)
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(result)
    })
    
    final_response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
```

::right::

## Key Components

<v-clicks>

- **Tools Definition**: JSON schema specifying available functions
- **Message History**: Maintains conversation context
- **Tool Execution**: Call actual functions when requested
- **Response Loop**: Send results back to get final answer

</v-clicks>

<v-click>

### Example Output
```
User: What's the weather in Paris?
Agent: [calls get_weather("Paris")]
Tool: {"temp": 18, "condition": "Cloudy"}
Agent: The weather in Paris is currently 
       18°C and cloudy.
```

</v-click>

---
layout: default
---

# Creating Custom Tools

Build reusable tools for your agents

<div class="grid grid-cols-2 gap-4">

<div>

## Tool Definition Pattern

```python
class WeatherTool:
    """Professional weather data retrieval"""
    
    @property
    def name(self) -> str:
        return "get_weather"
    
    @property
    def description(self) -> str:
        return "Get current weather for a location"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name or coordinates"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "default": "celsius"
                }
            },
            "required": ["location"]
        }
    
    def execute(self, location: str, 
                unit: str = "celsius") -> dict:
        """Execute the tool with given parameters"""
        # Call actual weather API
        api_key = os.getenv("WEATHER_API_KEY")
        url = f"https://api.weather.com/v1/current"
        params = {"q": location, "units": unit}
        
        response = requests.get(url, params=params,
                              headers={"X-API-Key": api_key})
        return response.json()
```

</div>

<div>

## Tool Registry

```python
class ToolRegistry:
    """Manage and execute multiple tools"""
    
    def __init__(self):
        self.tools = {}
    
    def register(self, tool):
        """Register a tool"""
        self.tools[tool.name] = tool
    
    def get_definitions(self) -> list:
        """Get OpenAI-compatible tool definitions"""
        return [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
        } for tool in self.tools.values()]
    
    def execute(self, name: str, **kwargs):
        """Execute a tool by name"""
        if name not in self.tools:
            raise ValueError(f"Tool {name} not found")
        return self.tools[name].execute(**kwargs)

# Usage
registry = ToolRegistry()
registry.register(WeatherTool())
registry.register(SearchTool())
registry.register(CalculatorTool())

# Pass to agent
tools = registry.get_definitions()
```

<v-click>

### Benefits
- ✅ Type-safe execution
- ✅ Easy testing
- ✅ Reusable across agents
- ✅ Clear documentation

</v-click>

</div>

</div>

---
layout: default
---

# Agent with Memory

Implementing conversation memory and context retention

<div class="grid grid-cols-2 gap-4">

<div>

## Simple Memory Implementation

```python {all|1-8|10-25|27-35}
class ConversationMemory:
    """Store and retrieve conversation history"""
    
    def __init__(self, max_messages: int = 50):
        self.messages = []
        self.max_messages = max_messages
        self.summary = None
    
    def add_message(self, role: str, content: str):
        """Add a message to memory"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now()
        })
        
        # Trim if too long
        if len(self.messages) > self.max_messages:
            self._summarize_old_messages()
    
    def _summarize_old_messages(self):
        """Summarize old messages to save context"""
        old_messages = self.messages[:10]
        self.summary = self._create_summary(old_messages)
        self.messages = self.messages[10:]
    
    def get_context(self) -> list:
        """Get messages formatted for LLM"""
        context = []
        if self.summary:
            context.append({
                "role": "system",
                "content": f"Previous context: {self.summary}"
            })
        context.extend(self.messages)
        return context
```

</div>

<div>

## Agent with Memory

```python
class MemoryAgent:
    """Agent with conversation memory"""
    
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.memory = ConversationMemory()
        self.client = OpenAI()
    
    def chat(self, user_message: str) -> str:
        """Chat with memory"""
        # Add user message
        self.memory.add_message("user", user_message)
        
        # Get response with full context
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.memory.get_context()
        )
        
        # Store assistant response
        assistant_message = response.choices[0].message.content
        self.memory.add_message("assistant", assistant_message)
        
        return assistant_message
    
    def clear_memory(self):
        """Reset conversation"""
        self.memory = ConversationMemory()

# Usage
agent = MemoryAgent()
agent.chat("My name is Alice")
agent.chat("What's the weather like?")
agent.chat("What's my name?")  
# Agent remembers: "Your name is Alice"
```

<v-click>

### Advanced: Vector Memory

```python
from pinecone import Pinecone

class VectorMemory:
    """Store memories as embeddings"""
    
    def __init__(self):
        self.pc = Pinecone()
        self.index = self.pc.Index("memories")
    
    def store(self, text: str, metadata: dict):
        embedding = get_embedding(text)
        self.index.upsert([(text, embedding, metadata)])
    
    def recall(self, query: str, top_k: int = 5):
        query_embedding = get_embedding(query)
        results = self.index.query(query_embedding, top_k=top_k)
        return results
```

</v-click>

</div>

</div>

---
layout: default
---

# LangGraph Workflow

Building complex multi-agent workflows with state management

```python {all|1-10|12-25|27-41|43-58|60-70}
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

# Define workflow state
class ResearchState(TypedDict):
    question: str
    search_results: Annotated[list, operator.add]
    analysis: str
    final_report: str

# Define agent nodes
def search_agent(state: ResearchState) -> ResearchState:
    """Search for relevant information"""
    query = state["question"]
    results = tavily_search(query)  # External search API
    return {"search_results": results}

def analysis_agent(state: ResearchState) -> ResearchState:
    """Analyze search results"""
    results = state["search_results"]
    analysis = llm.invoke(f"Analyze these results: {results}")
    return {"analysis": analysis.content}

def writer_agent(state: ResearchState) -> ResearchState:
    """Write final report"""
    prompt = f"""
    Question: {state['question']}
    Research: {state['search_results']}
    Analysis: {state['analysis']}
    
    Write a comprehensive report.
    """
    report = llm.invoke(prompt)
    return {"final_report": report.content}

def should_continue(state: ResearchState) -> str:
    """Decide whether to continue searching"""
    if len(state["search_results"]) < 5:
        return "search"
    return "analyze"

# Build the graph
workflow = StateGraph(ResearchState)

# Add nodes
workflow.add_node("search", search_agent)
workflow.add_node("analyze", analysis_agent)
workflow.add_node("write", writer_agent)

# Add edges
workflow.set_entry_point("search")
workflow.add_conditional_edges(
    "search",
    should_continue,
    {"search": "search", "analyze": "analyze"}
)
workflow.add_edge("analyze", "write")
workflow.add_edge("write", END)

# Compile and run
app = workflow.compile()

result = app.invoke({
    "question": "What are the latest developments in quantum computing?",
    "search_results": [],
    "analysis": "",
    "final_report": ""
})

print(result["final_report"])
```

<div class="mt-4 grid grid-cols-3 gap-4">

<v-click>

### State Management
- Typed state with TypedDict
- Automatic state merging
- Reducer functions for lists

</v-click>

<v-click>

### Conditional Routing
- Dynamic workflow paths
- Loop until conditions met
- Multi-agent coordination

</v-click>

<v-click>

### Benefits
- Clear workflow visualization
- Easy debugging
- Persistent checkpoints
- Human-in-the-loop support

</v-click>

</div>

---
layout: two-cols
---

# Real-World Use Case

Customer Support Automation System

```python {all|1-15|17-35|37-55|57-80}
from datetime import datetime
from enum import Enum

class TicketPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    URGENT = 4

class CustomerSupportAgent:
    """AI-powered customer support system"""
    
    def __init__(self):
        self.client = OpenAI()
        self.memory = ConversationMemory()
        self.ticket_system = TicketSystem()
        self.knowledge_base = VectorStore()
        
    def handle_inquiry(self, customer_message: str, 
                       customer_id: str) -> dict:
        """Process customer inquiry"""
        
        # 1. Classify intent and urgency
        classification = self._classify_message(
            customer_message
        )
        
        # 2. Search knowledge base
        relevant_docs = self.knowledge_base.search(
            customer_message, top_k=3
        )
        
        # 3. Check customer history
        history = self.ticket_system.get_history(
            customer_id
        )
        
        # 4. Generate response
        context = {
            "message": customer_message,
            "docs": relevant_docs,
            "history": history,
            "classification": classification
        }
        
        response = self._generate_response(context)
        
        # 5. Create ticket if needed
        if classification["priority"] >= TicketPriority.HIGH:
            ticket = self._create_ticket(
                customer_id, 
                customer_message,
                classification
            )
            response["ticket_id"] = ticket.id
        
        return response
    
    def _classify_message(self, message: str) -> dict:
        """Classify customer message"""
        tools = [{
            "type": "function",
            "function": {
                "name": "classify_inquiry",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["billing", "technical", 
                                   "general", "complaint"]
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["low", "medium", 
                                   "high", "urgent"]
                        },
                        "sentiment": {
                            "type": "string",
```

::right::

```python
                            "enum": ["positive", "neutral", 
                                   "negative"]
                        }
                    }
                }
            }
        }]
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[{
                "role": "user",
                "content": f"Classify: {message}"
            }],
            tools=tools,
            tool_choice={"type": "function", 
                        "function": {"name": "classify_inquiry"}}
        )
        
        return json.loads(
            response.choices[0].message.tool_calls[0]
            .function.arguments
        )
    
    def _generate_response(self, context: dict) -> dict:
        """Generate helpful response"""
        prompt = f"""
You are a helpful customer support agent.

Customer message: {context['message']}

Relevant knowledge base articles:
{context['docs']}

Customer history:
{context['history']}

Provide a helpful, empathetic response.
If you can't fully resolve, explain next steps.
"""
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return {
            "response": response.choices[0].message.content,
            "classification": context["classification"],
            "timestamp": datetime.now().isoformat()
        }

# Usage example
agent = CustomerSupportAgent()

result = agent.handle_inquiry(
    customer_message="I've been charged twice this month!",
    customer_id="CUST-12345"
)

print(f"Response: {result['response']}")
if "ticket_id" in result:
    print(f"Ticket created: {result['ticket_id']}")
```

<v-click>

## Key Features

- **Intent Classification**: Automatically categorize inquiries
- **Knowledge Base**: RAG for accurate information
- **Priority Routing**: Escalate urgent issues
- **Context Awareness**: Customer history integration
- **Ticket Creation**: Seamless handoff to humans

</v-click>

<v-click>

### Metrics to Track
- Response accuracy
- Resolution time
- Customer satisfaction
- Escalation rate
- Cost savings

</v-click>
