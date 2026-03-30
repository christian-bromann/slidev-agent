# Welcome to [Slidev](https://github.com/slidevjs/slidev)

To start the slide show:

- `pnpm install`
- `cp .env.example .env` if you want to connect a LangGraph-hosted deep agent
- `pnpm dev`
- visit <http://localhost:3030>

Edit the [slides.md](./slides.md) to see the changes.

This example now includes:

- a right-side Slidev agent sidebar rendered from `global-top.vue`
- a custom nav control button rendered from `custom-nav-controls.vue`
- a `slidev-agent` wrapper CLI for running the local deck
- `langgraph.json` that points at `./node_modules/slidev-addon-agent/agent/index.ts:agent`
- `setup/main.ts`, which derives the sidebar assistant ID from `langgraph.json`

When no LangGraph env vars are configured, the sidebar falls back to a local demo mode.

Learn more about Slidev at the [documentation](https://sli.dev/).
