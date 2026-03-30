import path from "node:path"

import { createDeepAgent, FilesystemBackend } from "deepagents"

type SlidevDeepAgentOptions = {
  model?: string
  systemPrompt?: string
  rootDir?: string
  virtualMode?: boolean
}

const providerPackageMap: Record<string, string> = {
  anthropic: "@langchain/anthropic",
  google: "@langchain/google-genai",
  "google-genai": "@langchain/google-genai",
  openai: "@langchain/openai",
  openrouter: "@langchain/openrouter",
}

const providerApiKeyMap: Record<string, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_API_KEY"],
  "google-genai": ["GOOGLE_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
}

function env(name: string, fallback = ""): string {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function resolveSystemPrompt(): string {
  const customPrompt = env("SLIDEV_AGENT_SYSTEM_PROMPT")
  if (customPrompt)
    return customPrompt

  return [
    "You are Slidev Agent, an expert presentation author for Slidev decks.",
    "Your job is to create and revise deck files directly in the local Slidev project filesystem.",
    "Treat the filesystem as the source of truth for deck content.",
    "Prefer editing existing files over creating many new files when possible.",
    "Use Slidev-compatible markdown, frontmatter, layouts, and Vue component syntax.",
    "When asked to make deck changes, inspect current files first, then write or edit the relevant markdown files directly.",
    "Keep deck structure coherent, with a main entry file such as /slides.md and supporting files under /pages, /components, or /snippets when useful.",
    "Explain major file changes briefly to the user after you finish.",
  ].join("\n")
}

export function getSlidevAgentModel(): string {
  return env("SLIDEV_AGENT_MODEL")
}

export function getSlidevAgentProviderDiagnostics(model = getSlidevAgentModel()) {
  if (!model || !model.includes(":")) {
    return {
      model,
      provider: "",
      packageName: "",
      apiKeyEnvVars: [] as string[],
      hasExplicitModel: false,
      hasProviderPackageHint: false,
      hasApiKeyHint: false,
    }
  }

  const provider = model.split(":")[0].trim()
  const packageName = providerPackageMap[provider] || ""
  const apiKeyEnvVars = providerApiKeyMap[provider] || []

  return {
    model,
    provider,
    packageName,
    apiKeyEnvVars,
    hasExplicitModel: true,
    hasProviderPackageHint: Boolean(packageName),
    hasApiKeyHint: apiKeyEnvVars.some(name => Boolean(process.env[name]?.trim())),
  }
}

function resolveRootDir(rootDir?: string): string {
  if (rootDir)
    return path.resolve(rootDir)

  return path.resolve(env("SLIDEV_AGENT_ROOT_DIR") || process.cwd())
}

export function createSlidevFilesystemBackend(options: Pick<SlidevDeepAgentOptions, "rootDir" | "virtualMode"> = {}) {
  return new FilesystemBackend({
    rootDir: resolveRootDir(options.rootDir),
    virtualMode: options.virtualMode ?? true,
  })
}

export function createSlidevDeepAgent(options: SlidevDeepAgentOptions = {}) {
  const model = options.model || env("SLIDEV_AGENT_MODEL")
  const systemPrompt = options.systemPrompt || resolveSystemPrompt()

  return createDeepAgent({
    ...(model ? { model } : {}),
    systemPrompt,
    backend: createSlidevFilesystemBackend({
      rootDir: options.rootDir,
      virtualMode: options.virtualMode,
    }),
  })
}

export const agent = createSlidevDeepAgent()
export const graph = agent
