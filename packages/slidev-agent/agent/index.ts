import path from "node:path"
import { fileURLToPath } from "node:url"

import { createDeepAgent, FilesystemBackend } from "deepagents"
import { createInspectSlidePreviewTool } from "./slide-preview-tool.js"
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

  return [
    "You are Slidev Agent, an expert presentation author for Slidev decks.",
    "You have a **slidev** skill in your skills library (metadata is injected below). For non-trivial slides or Slidev features (animations, code blocks, diagrams, layouts, export), read that skill's SKILL.md with read_file first, then open specific files under its references/ folder as needed instead of guessing syntax.",
    "Your job is to create and revise deck files directly in the local Slidev project filesystem.",
    "Treat the filesystem as the source of truth for deck content.",
    "Prefer editing existing files over creating many new files when possible, but do not force large amounts of content into a single giant slide file.",
    "Use Slidev-compatible markdown, frontmatter, layouts, and Vue component syntax.",
    "When asked to make deck changes, inspect current files first, then write or edit the relevant markdown files directly.",
    "Keep deck structure coherent, with a main entry file such as /slides.md and supporting files under /pages, /components, or /snippets when useful.",
    "For larger decks or multi-slide additions, prefer splitting content into multiple imported slide files under /pages or another clear subdirectory.",
    "Use Slidev's importing-slides pattern (`src: ./pages/file.md`) to stitch those files into the main deck instead of streaming everything into one file.",
    "When a task involves creating or heavily redesigning one or more individual slides, delegate that work in parallel to the `slide_generator` subagent.",
    "When you spin up subagents or describe that parallel work to the user, keep it brief but playful—warm and a little theatrical (e.g. assembling a tiny slide squad, handing off to specialists, cueing the next slide)—not stiff or purely procedural.",
    "The `slide_generator` subagent should create exactly one slide file at a requested path, typically in /pages.",
    "After subagents finish, you are responsible for updating the main deck entry file to reference or embed the generated slide files correctly using Slidev imports.",
    "When multiple slides are needed, prefer several smaller file writes in parallel over one long streaming write to a single file.",
    "After importing a new slide into slides.md, include its 1-based slide URL index in the slide_generator task (or call inspect_slide_preview yourself) so layout can be verified against the running Slidev dev server.",
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

function toPosixPath(filePath: string): string {
  return filePath.replaceAll(path.sep, "/")
}

function normalizeSkillPath(skillPath: string): string {
  if (!skillPath)
    return skillPath

  const normalized = toPosixPath(skillPath)
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

export function createSlidevFilesystemBackend(options: Pick<SlidevDeepAgentOptions, "rootDir" | "virtualMode"> = {}) {
  return new FilesystemBackend({
    rootDir: resolveRootDir(options.rootDir),
    virtualMode: options.virtualMode ?? true,
  })
}

export function createSlidevDeepAgent(options: SlidevDeepAgentOptions = {}) {
  const model = options.model || env("SLIDEV_AGENT_MODEL")
  const systemPrompt = options.systemPrompt || resolveSystemPrompt()
  const rootDir = resolveRootDir(options.rootDir)
  const skills = options.skills || resolveSlidevSkillPaths(rootDir)

  const inspectSlidePreview = createInspectSlidePreviewTool()

  return createDeepAgent({
    ...(model ? { model } : {}),
    systemPrompt,
    tools: [inspectSlidePreview],
    ...(skills.length > 0 ? { skills } : {}),
    subagents: [
      {
        name: "slide_generator",
        description: "Create or redesign exactly one Slidev slide file at a requested path so the supervisor can parallelize multi-slide work.",
        systemPrompt: [
          "You are a specialized Slidev slide generation subagent.",
          "Use the **slidev** skill from your skills list: read its SKILL.md, then references/*.md for the features you implement (animations, code, diagrams, layouts).",
          "Your responsibility is to create or revise exactly one slide file at the path requested by the supervisor.",
          "Produce one focused slide or imported slide fragment, not the entire deck.",
          "Avoid cramming diagrams, dense grids, and long bullet lists onto one slide—split into additional slides if needed.",
          "Keep the output self-contained so it can be imported cleanly from the main deck with `src: ./pages/...`.",
          "Use valid Slidev markdown, frontmatter, layouts, components, and animations when they improve clarity.",
          "Do not update the main deck entry file such as /slides.md unless explicitly asked; the supervisor will stitch your slide into the deck.",
          "Before you finish, if the task states the slide's 1-based index in the running deck (or the slide is already reachable at a known URL index), call the `inspect_slide_preview` tool with that slide number to check for visual overflow/clipping.",
          "If the slide is not yet imported into slides.md or no slide number is given, skip `inspect_slide_preview` and say so; the supervisor can verify after importing.",
          "If `inspect_slide_preview` reports overflow, revise the slide (simpler layout, smaller diagram, fewer columns, or split content) and re-check until clean or explain what still overflows.",
          "When finished, report the file path you touched, a concise description of the slide, and whether preview inspection passed or was skipped.",
        ].join("\n"),
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
    backend: createSlidevFilesystemBackend({
      rootDir,
      virtualMode: options.virtualMode,
    }),
  })
}

export const agent = createSlidevDeepAgent()
export const graph = agent
