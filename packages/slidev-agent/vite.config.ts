import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

function resolveProjectRoot() {
  const configuredRoot = process.env.SLIDEV_AGENT_ROOT_DIR?.trim()
  return path.resolve(configuredRoot || process.cwd())
}

function collectExportedSubpaths(pkgName: string) {
  const packageJsonPath = require.resolve(`${pkgName}/package.json`)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  const exportEntries = packageJson.exports && typeof packageJson.exports === "object"
    ? Object.keys(packageJson.exports)
    : []

  return exportEntries
    .filter(key => key.startsWith("./") && key !== "./package.json")
    .map(key => path.posix.join(pkgName, key.slice(2)))
}

function detectAssistantId() {
  const explicitAssistantId = process.env.VITE_LANGGRAPH_ASSISTANT_ID?.trim()
  if (explicitAssistantId)
    return explicitAssistantId

  try {
    const langgraphJsonPath = path.join(resolveProjectRoot(), "langgraph.json")
    const langgraphConfig = JSON.parse(fs.readFileSync(langgraphJsonPath, "utf8"))
    const graphKeys = langgraphConfig.graphs && typeof langgraphConfig.graphs === "object"
      ? Object.keys(langgraphConfig.graphs).filter(Boolean)
      : []

    if (graphKeys.length === 1)
      return graphKeys[0]
  }
  catch {}

  return undefined
}

const assistantId = detectAssistantId()

export default {
  optimizeDeps: {
    // The addon renders LangChain/LangSmith browser code from package files.
    // Prebundle the top-level packages so Vite can synthesize interop for
    // transitive CommonJS dependencies before they reach the client.
    include: [
      "@langchain/vue",
      "@langchain/langgraph-sdk",
      "@langchain/langgraph-sdk/ui",
      "@langchain/core",
      ...collectExportedSubpaths("@langchain/core"),
      "langsmith",
      "langsmith/client",
      "langsmith/run_trees",
      "langsmith/schemas",
      "langsmith/singletons/traceable",
    ],
  },
  define: assistantId
    ? {
        "import.meta.env.VITE_LANGGRAPH_ASSISTANT_ID": JSON.stringify(assistantId),
      }
    : undefined,
}
