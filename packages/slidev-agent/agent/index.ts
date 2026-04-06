import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createDeepAgent, LocalShellBackend } from "deepagents"
import { dynamicSystemPromptMiddleware } from "langchain"
import { z } from "zod"

import { createFilesystemPathGuardMiddleware } from "./middleware.js"
import { model, env } from "../lib/env.js"
import { slidevGoToSlide } from "../lib/headless-tools.js"

import { resolveDeckExecutionContext } from "./deck-context.js"
import { createSlidevExportScreenshotTool } from "./tools/export-tool.js"
import { createSlidevReviewScreenshotTool } from "./tools/review-tool.js"
import {
  SLIDEV_AGENT_DEFAULT_SYSTEM_PROMPT,
  SLIDEV_SLIDE_GENERATOR_SUBAGENT_DESCRIPTION,
  SLIDEV_SLIDE_GENERATOR_SYSTEM_PROMPT,
} from "./constants.js"

type SlidevDeepAgentOptions = {
  model?: string
  systemPrompt?: string
  rootDir?: string
  virtualMode?: boolean
  skills?: string[]
}

export const slidevAgentContextSchema = z.object({
  currentSlide: z.object({
    page: z.number().optional(),
    layout: z.string().optional(),
    route: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
})

function resolveSystemPrompt(): string {
  const customPrompt = env(process.env, "SLIDEV_AGENT_SYSTEM_PROMPT")
  if (customPrompt)
    return customPrompt

  return SLIDEV_AGENT_DEFAULT_SYSTEM_PROMPT
}

function normalizeSkillPath(skillPath: string): string {
  if (!skillPath)
    return skillPath

  const normalized = skillPath.replaceAll(path.sep, "/")
  return normalized.startsWith("/") ? normalized : `/${normalized}`
}

function resolveSlidevSkillPaths(rootDir: string): string[] {
  const explicitSkillsPath = env(process.env, "SLIDEV_AGENT_SKILLS_PATH")
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

function buildSlideGeneratorRuntimePrompt(rootDir: string) {
  const deckContext = resolveDeckExecutionContext(rootDir)
  const deckHostDir = deckContext.deckHostDir
  const entryPath = deckContext.entryPath
  const artifactDir = path.join(deckHostDir, ".slidev-agent-artifacts", "verify-<slideIndex>")
  const generatedImagePath = path.join(artifactDir, "<generated-file>.png")
  const reviewImageRelativePath = deckContext.deckDir === "."
    ? `.slidev-agent-artifacts/verify-<slideIndex>/<generated-file>.png`
    : `${deckContext.deckDir}/.slidev-agent-artifacts/verify-<slideIndex>/<generated-file>.png`
  const directExportCommand = [
    `cd "${deckHostDir}"`,
    "mkdir -p .slidev-agent-artifacts/verify-<slideIndex> &&",
    "pnpm exec slidev-agent export",
    "--format png",
    "--range <slideIndex>",
    "--per-slide",
    "--output ./.slidev-agent-artifacts/verify-<slideIndex>",
    "--timeout 60000",
    "--wait 500",
    "--scale 1",
  ].join(" ")
  const rootScriptExportCommand = deckContext.rootExportScript
    ? [
        `cd "${rootDir}"`,
        "pnpm export --",
        "--format png",
        "--range <slideIndex>",
        "--per-slide",
        "--output ./.slidev-agent-artifacts/verify-<slideIndex>",
        "--timeout 60000",
        "--wait 500",
        "--scale 1",
      ].join(" ")
    : null

  const lines = [
    "## Runtime deck execution context",
    "Filesystem tools are rooted at the agent project root. Use project-relative paths like `/example/slides.md` there, never host paths like `/Users/.../example/slides.md`.",
    `Inside \`execute\`, paths like \`/\` refer to the real host filesystem root. Do not treat \`/\` as a virtual project root.`,
    `Agent root for this run: \`${rootDir}\`.`,
    `Configured Slidev entry for this run: \`${entryPath}\`.`,
    `Runnable deck package directory for exports: \`${deckHostDir}\`. Always run export there unless you are intentionally invoking a wrapper script from \`${rootDir}\`.`,
    "For screenshot export, use the dedicated `slidev_export_screenshot` tool first instead of hand-writing shell commands.",
    "If there is any uncertainty about the current assembled deck length after imports or reordering, recount from the fully assembled deck before choosing a validation index. Do not guess or clamp the index.",
    "When revising an existing slide file that is already imported into the deck, its validation index usually stays the same. Do not add 1 just because you edited the file.",
    `If you need to debug manually, this is the known-good fallback command: \`${directExportCommand}\`.`,
    rootScriptExportCommand
      ? `Optional root-package wrapper command: \`${rootScriptExportCommand}\`. Use it only if you specifically want the root package script.`
      : "",
    "The `execute` shell starts in the deck package directory already. Keep export commands cwd-relative and do not `cd /` before exporting.",
    `Write export artifacts under \`${artifactDir}\` using a relative path like \`./.slidev-agent-artifacts/...\` or that full host path.`,
    "Never use `/.slidev-agent-artifacts`, `pnpm --prefix /`, or any other host-root path unless the project itself actually lives at filesystem root.",
    "Logical project paths such as `/pages/foo.md` or `/slides.md` are for filesystem tools, not shell paths. For `execute`, strip the leading slash and use cwd-relative paths instead.",
    `When calling \`slidev_review_screenshot\`, prefer the real host PNG path \`${generatedImagePath}\`. A root-relative alternative within the agent root is \`${reviewImageRelativePath}\`.`,
    "If screenshot export says the deck has fewer slides than requested, or says it produced no PNGs, your slide index is wrong or the slide is not imported into the final deck yet. Fix the deck/import/index mismatch before retrying.",
    "Do not scan `/Users`, `/node_modules`, or the whole filesystem to locate Slidev once the deck context above is available.",
  ].filter(Boolean)

  return lines.join("\n")
}

export function createSlidevDeepAgent(options: SlidevDeepAgentOptions = {}) {
  const systemPrompt = options.systemPrompt || resolveSystemPrompt()
  const rootDir = options.rootDir
    ? path.resolve(options.rootDir)
    : path.resolve(env(process.env, "SLIDEV_AGENT_ROOT_DIR") || process.cwd())

  const skills = options.skills || resolveSlidevSkillPaths(rootDir)
  const filesystemPathGuardMiddleware = createFilesystemPathGuardMiddleware(rootDir)
  const slidevExportScreenshot = createSlidevExportScreenshotTool(path.resolve(rootDir))
  const slidevReviewScreenshot = createSlidevReviewScreenshotTool(path.resolve(rootDir))
  const slideGeneratorSystemPrompt = [
    SLIDEV_SLIDE_GENERATOR_SYSTEM_PROMPT,
    buildSlideGeneratorRuntimePrompt(rootDir),
  ].join("\n\n")

  fs.mkdirSync(rootDir, { recursive: true })
  if (!model) {
    throw new Error("No model or API key is configured. Set `SLIDEV_AGENT_MODEL` or `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `OPENAI_API_KEY` to a valid API key.")
  }

  return createDeepAgent({
    model,
    systemPrompt,
    tools: [
      slidevGoToSlide,
      slidevExportScreenshot,
      slidevReviewScreenshot
    ],
    ...(skills.length > 0 ? { skills } : {}),
    subagents: [
      {
        name: "slide_generator",
        description: SLIDEV_SLIDE_GENERATOR_SUBAGENT_DESCRIPTION,
        systemPrompt: slideGeneratorSystemPrompt,
        middleware: [filesystemPathGuardMiddleware],
        ...(skills.length > 0 ? { skills } : {}),
      },
    ],
    contextSchema: slidevAgentContextSchema,
    middleware: [
      filesystemPathGuardMiddleware,
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
