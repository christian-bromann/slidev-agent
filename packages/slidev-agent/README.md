# `slidev-addon-agent`

Slidev addon components and a wrapper CLI for agent-powered slide authoring.

## Setup

### Prerequisites

- Slidev: `@slidev/cli` and `vue` (peer dependencies).
- LangGraph: `@langchain/langgraph` for the deep agent runtime.
- Chat model: install one of `@langchain/openai`, `@langchain/anthropic`, or `@langchain/google`, and set the matching API key in the environment your LangGraph server uses.
- Optional screenshot verification: install `playwright-chromium` in the Slidev project so the agent can export PNGs and visually review rendered slides.

### Install

In your Slidev project (or LangGraph app that bundles the agent):

```bash
# base setup
pnpm add slidev-addon-agent @slidev/cli vue @langchain/langgraph
# LLM provider
pnpm add @langchain/openai   # or @langchain/anthropic / @langchain/google
# optional: PNG screenshot verification during slide review
pnpm add -D playwright-chromium
```

Replace your usual `slidev` CLI scripts with the wrapper CLI from this package so deck commands run through `slidev-agent` instead:

```json
{
  "scripts": {
    "dev": "slidev-agent dev --open",
    "build": "slidev-agent build",
    "export": "slidev-agent export"
  }
}
```

This wrapper still runs the Slidev CLI, but it also resolves the correct deck entry and starts `langgraph dev` automatically during `slidev-agent dev`. See [`example/package.json`](../../example/package.json) for a working setup.

Also register the addon in your Slidev project's `package.json`:

```json
{
  "slidev": {
    "addons": [
      "slidev-addon-agent"
    ]
  }
}
```

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

### Agent environment variables

The deep agent uses your project directory as the filesystem root (virtualMode) and bundled Slidev skills when those paths are reachable. Set these in `.env` (or your LangGraph deployment) for the **server** that runs the graph:

| Variable | Purpose |
| ---------- | --------- |
| `SLIDEV_AGENT_MODEL` | Model id, e.g. `openai:gpt-5.4`, `anthropic:claude-sonnet-4-6`. |
| `SLIDEV_AGENT_REVIEW_MODEL` | Optional override for screenshot review; defaults to `SLIDEV_AGENT_MODEL` and should be a vision-capable model. |
| `SLIDEV_AGENT_SYSTEM_PROMPT` | Replaces the default system prompt when set. |
| `SLIDEV_AGENT_ROOT_DIR` | Filesystem root for deck files (defaults to `process.cwd()`). |
| `SLIDEV_AGENT_SKILLS_PATH` | Comma-separated extra skill directories (POSIX paths relative to the backend root). |
| `SLIDEV_AGENT_DISABLE_LANGGRAPH` | Set to `1` to skip spawning `langgraph dev` alongside Slidev when using `slidev-agent dev`. |
