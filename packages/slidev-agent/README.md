# `slidev-addon-agent`

Slidev addon components and a wrapper CLI for LangChain-powered slide authoring.

## What it includes

- `SlidevAgentSidebar` for a persistent right-side agent panel
- `SlidevAgentNavButton` for a Slidev nav control toggle
- `slidev-agent` CLI for running a local Slidev deck
- `slidev-addon-agent/agent` for a Deep Agent that edits the local deck filesystem

## Deep Agent export

The package publishes a LangGraph-ready deep agent entrypoint at `slidev-addon-agent/agent`.

It exports:

- `agent`
- `graph`
- `createSlidevDeepAgent()`
- `createSlidevFilesystemBackend()`

Example `langgraph.json`:

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./node_modules/slidev-addon-agent/agent/index.ts:agent"
  },
  "env": ".env"
}
```

Current LangGraph JS loading is path-based, so reference the installed file in
`node_modules` rather than a bare package subpath.

The exported agent uses `FilesystemBackend` rooted at the current working directory by default,
with `virtualMode` enabled. That makes the Slidev project files the source of truth.

The agent also includes bundled Slidev authoring guidance distilled from the official
Slidev AI skill, so it has built-in awareness of Slidev syntax, layouts, animations,
code features, diagrams, and presentation authoring best practices.
In addition, the exported Deep Agent now points its `skills` configuration at the packaged
`agent/skills` directory so the full bundled Slidev skill references are available to the agent
at runtime when they are reachable from the project root.

Optional agent env vars:

- `SLIDEV_AGENT_MODEL`
- `SLIDEV_AGENT_SYSTEM_PROMPT`
- `SLIDEV_AGENT_ROOT_DIR`
- `SLIDEV_AGENT_SKILLS_PATH` (comma-separated skill source paths relative to the backend root)

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

## Frontend env vars

The sidebar reads these Vite env vars:

- `VITE_LANGGRAPH_API_URL`
- `VITE_LANGGRAPH_ASSISTANT_ID` (optional if your app injects it)
- `VITE_LANGGRAPH_THREAD_ID` (optional)
- `VITE_SLIDEV_AGENT_DECK_ID` (optional)
- `VITE_SLIDEV_AGENT_PLACEHOLDER` (optional)

`VITE_LANGGRAPH_API_URL` defaults to `http://localhost:2024` in local development. If the
assistant ID is not available, the sidebar falls back to an offline demo mode.
