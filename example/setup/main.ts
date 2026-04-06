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

// Slidev accepts a plain default-exported setup function here, which avoids
// requiring the example app to depend on `@slidev/types` directly under pnpm.
export default () => {
  window.__SLIDEV_AGENT_CONFIG__ = {
    ...window.__SLIDEV_AGENT_CONFIG__,
    apiUrl: import.meta.env.VITE_LANGGRAPH_API_URL || "http://localhost:2024",
    assistantId,
  }
}
