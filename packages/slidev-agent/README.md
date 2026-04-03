# `slidev-addon-agent`

Slidev addon components and a wrapper CLI for LangChain-powered slide authoring.

## What it includes

- `SlidevAgentSidebar` for a persistent right-side agent panel
- `SlidevAgentNavButton` for a Slidev nav control toggle
- `slidev-agent` CLI for running a local Slidev deck and related tasks
- `slidev-addon-agent/agent` for a Deep Agent that edits the local deck filesystem

## Setup

### Prerequisites

- Slidev: `@slidev/cli` and `vue` (peer dependencies).
- LangGraph: `@langchain/langgraph` for the deep agent runtime.
- Chat model: install one of `@langchain/openai`, `@langchain/anthropic`, or `@langchain/google`, and set the matching API key in the environment your LangGraph server uses.

### Install

In your Slidev project (or LangGraph app that bundles the agent):

```bash
# base setup
pnpm add slidev-addon-agent @slidev/cli vue @langchain/langgraph
# LLM provider
pnpm add @langchain/openai   # or @langchain/anthropic / @langchain/google
```

Register the addon in `slidev` config (see Slidev docs) and wire `SlidevAgentSidebar` / `SlidevAgentNavButton` as in [Example wiring](#example-wiring).

### Agent environment variables

The deep agent uses your project directory as the filesystem root (virtualMode) and bundled Slidev skills when those paths are reachable. Set these in `.env` (or your LangGraph deployment) for the **server** that runs the graph:

| Variable | Purpose |
|----------|---------|
| `SLIDEV_AGENT_MODEL` | Model id, e.g. `openai:gpt-5.4`, `anthropic:claude-sonnet-4-6`. |
| `SLIDEV_AGENT_SYSTEM_PROMPT` | Replaces the default system prompt when set. |
| `SLIDEV_AGENT_ROOT_DIR` | Filesystem root for deck files (defaults to `process.cwd()`). |
| `SLIDEV_AGENT_SKILLS_PATH` | Comma-separated extra skill directories (POSIX paths relative to the backend root). |
| `SLIDEV_AGENT_DISABLE_LANGGRAPH` | Set to `1` to skip spawning `langgraph dev` alongside Slidev when using `slidev-agent dev`. |

## Example wiring

Add the addon to your Slidev project and render the components from root layer files:

```vue
<!-- global-top.vue -->
<template>
  <SlidevAgentSidebar v-if="!$nav.isPresenter" />
</template>
```

```vue
<!-- custom-nav-controls.vue -->
<template>
  <SlidevAgentNavButton v-if="!$nav.isPresenter" />
</template>
```
