import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createDeepAgent, LocalShellBackend } from "deepagents"
import {
  SLIDEV_AGENT_DEFAULT_SYSTEM_PROMPT,
  SLIDEV_SLIDE_GENERATOR_SUBAGENT_DESCRIPTION,
  SLIDEV_SLIDE_GENERATOR_SYSTEM_PROMPT,
} from "./constants.js"
import { slidevGoToSlide } from "../lib/headless-tools.js"
import { dynamicSystemPromptMiddleware } from "langchain"
import { z } from "zod"

type SlidevDeepAgentOptions = {
  model?: string
  systemPrompt?: string
  rootDir?: string
  virtualMode?: boolean
  skills?: string[]
}

const providerPackageMap: Record<string, string> = {
  anthropic: "@langchain/anthropic",
  google: "@langchain/google",
  openai: "@langchain/openai",
}

const providerApiKeyMap: Record<string, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GOOGLE_API_KEY"],
  openai: ["OPENAI_API_KEY"]
}

export const slidevAgentContextSchema = z.object({
  currentSlide: z.object({
    page: z.number().optional(),
    layout: z.string().optional(),
    route: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
})

function env(name: string, fallback = ""): string {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function resolveSystemPrompt(): string {
  const customPrompt = env("SLIDEV_AGENT_SYSTEM_PROMPT")
  if (customPrompt)
    return customPrompt

  return SLIDEV_AGENT_DEFAULT_SYSTEM_PROMPT
}

export function getSlidevAgentProviderDiagnostics(model = env("SLIDEV_AGENT_MODEL")) {
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

function normalizeSkillPath(skillPath: string): string {
  if (!skillPath)
    return skillPath

  const normalized = skillPath.replaceAll(path.sep, "/")
  return normalized.startsWith("/") ? normalized : `/${normalized}`
}

function resolveSlidevSkillPaths(rootDir: string): string[] {
  const explicitSkillsPath = env("SLIDEV_AGENT_SKILLS_PATH")
  if (explicitSkillsPath) {
    return explicitSkillsPath
      .split(",")
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(normalizeSkillPath)
  }

  const packagedSkillsDir = fileURLToPath(new URL("./skills", import.meta.url))
  const relativeSkillsDir = path.relative(rootDir, packagedSkillsDir)

  if (relativeSkillsDir.startsWith(".."))
    return []

  return [normalizeSkillPath(relativeSkillsDir)]
}

export function createSlidevDeepAgent(options: SlidevDeepAgentOptions = {}) {
  const model = options.model || env("SLIDEV_AGENT_MODEL")
  const systemPrompt = options.systemPrompt || resolveSystemPrompt()
  const rootDir = options.rootDir
    ? path.resolve(options.rootDir)
    : path.resolve(env("SLIDEV_AGENT_ROOT_DIR") || process.cwd())

  const skills = options.skills || resolveSlidevSkillPaths(rootDir)

  fs.mkdirSync(rootDir, { recursive: true })

  return createDeepAgent({
    ...(model ? { model } : {}),
    systemPrompt,
    tools: [slidevGoToSlide],
    ...(skills.length > 0 ? { skills } : {}),
    subagents: [
      {
        name: "slide_generator",
        description: SLIDEV_SLIDE_GENERATOR_SUBAGENT_DESCRIPTION,
        systemPrompt: SLIDEV_SLIDE_GENERATOR_SYSTEM_PROMPT,
        ...(skills.length > 0 ? { skills } : {}),
      },
    ],
    contextSchema: slidevAgentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware((_state, runtime) => {
        const context = (runtime.context ?? {}) as z.infer<typeof slidevAgentContextSchema>
        const currentSlide = context.currentSlide
        if (!currentSlide)
          return ""

        const details = [
          currentSlide.page ? `Current visible slide number: ${currentSlide.page}.` : "",
          currentSlide.layout ? `Current slide layout: ${currentSlide.layout}.` : "",
          currentSlide.route ? `Current slide route: ${currentSlide.route}.` : "",
          currentSlide.title ? `Current slide title: ${currentSlide.title}.` : "",
          "Use this as strong context when the user asks to update or extend the current slide.",
        ].filter(Boolean)

        return details.join("\n")
      }),
    ],
    backend: new LocalShellBackend({
      rootDir,
      virtualMode: options.virtualMode ?? true,
      inheritEnv: true,
    }),
  })
}

export const agent = createSlidevDeepAgent()
