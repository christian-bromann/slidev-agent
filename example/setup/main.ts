import { defineAppSetup } from "@slidev/types"

import langgraphConfig from "../langgraph.json"

declare global {
  interface Window {
    __SLIDEV_AGENT_CONFIG__?: {
      apiUrl?: string
      assistantId?: string
    }
  }
}

const assistantId = Object.keys(langgraphConfig.graphs ?? {})[0] || ""

export default defineAppSetup(() => {
  window.__SLIDEV_AGENT_CONFIG__ = {
    ...window.__SLIDEV_AGENT_CONFIG__,
    apiUrl: import.meta.env.VITE_LANGGRAPH_API_URL || "http://localhost:2024",
    assistantId,
  }
})
