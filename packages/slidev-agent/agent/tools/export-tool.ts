import path from "node:path"
import { mkdir, readFile, readdir, realpath } from "node:fs/promises"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

import { tool } from "langchain"
import { z } from "zod"

import { resolveDeckExecutionContext } from "../deck-context.js"

const slidevExportScreenshotSchema = z.object({
  slideIndex: z.number().int().positive().describe("1-based slide index to export as PNG."),
  outputDir: z.string().optional().describe("Optional output directory. Prefer omitting this unless you need a custom project-local path."),
  timeout: z.number().int().positive().optional().describe("Optional Slidev export timeout in milliseconds. Defaults to 60000."),
  wait: z.number().int().nonnegative().optional().describe("Optional Slidev export wait in milliseconds. Defaults to 500."),
})

function isWithinRoot(rootDir: string, candidatePath: string) {
  return candidatePath === rootDir || candidatePath.startsWith(`${rootDir}${path.sep}`)
}

async function resolveOutputDir(rootDir: string, deckHostDir: string, slideIndex: number, outputDir?: string) {
  const fallbackOutputDir = path.join(deckHostDir, ".slidev-agent-artifacts", `verify-${slideIndex}`)
  const requestedOutputDir = outputDir?.trim() || fallbackOutputDir
  const resolvedOutputDir = path.isAbsolute(requestedOutputDir)
    ? path.resolve(requestedOutputDir)
    : path.resolve(deckHostDir, requestedOutputDir)

  const [realRoot, realOutputDirParent] = await Promise.all([
    realpath(rootDir).catch(() => rootDir),
    realpath(path.dirname(resolvedOutputDir)).catch(() => path.dirname(resolvedOutputDir)),
  ])

  if (!isWithinRoot(realRoot, realOutputDirParent) && !isWithinRoot(rootDir, resolvedOutputDir)) {
    throw new Error(`slidev_export_screenshot outputDir must stay within the project root (${rootDir}).`)
  }

  return resolvedOutputDir
}

function getPnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm"
}

type SlidevCliModule = {
  resolveOptions?: (
    options: { entry: string, theme?: string },
    mode: string,
  ) => Promise<{ data?: { slides?: unknown[] } }>
}

const ANSI_ESCAPE_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

async function resolveDeckSlideCount(deckHostDir: string, entryPath: string) {
  const requireFromDeck = createRequire(path.join(deckHostDir, "package.json"))
  const slidevCliPackageJsonPath = requireFromDeck.resolve("@slidev/cli/package.json")
  const slidevCliPackageJson = JSON.parse(
    await readFile(slidevCliPackageJsonPath, "utf8"),
  ) as { module?: string, main?: string }
  const slidevCliEntry = path.resolve(
    path.dirname(slidevCliPackageJsonPath),
    slidevCliPackageJson.module || slidevCliPackageJson.main || "dist/index.mjs",
  )
  const slidevCli = await import(pathToFileURL(slidevCliEntry).href) as SlidevCliModule
  const resolved = await slidevCli.resolveOptions?.({ entry: entryPath }, "export")
  return Array.isArray(resolved?.data?.slides) ? resolved.data.slides.length : null
}

function stripAnsi(output: string) {
  return output.replace(ANSI_ESCAPE_PATTERN, "")
}

function extractLikelyBuildError(output: string) {
  const cleanedOutput = stripAnsi(output)
  const lines = cleanedOutput.split(/\r?\n/)
  const errorStartIndex = lines.findIndex(line =>
    /\[vite\].*(Pre-transform error|Internal server error)/.test(line)
    || /Plugin:\s+vite:vue/.test(line)
    || /Failed to resolve import/i.test(line)
    || /Invalid end tag\./.test(line),
  )

  if (errorStartIndex === -1)
    return null

  const errorLines: string[] = []
  for (let index = errorStartIndex; index < lines.length; index += 1) {
    const line = lines[index]

    if (index > errorStartIndex && !line.trim())
      break

    if (/^\s*✓\s+exported to\b/.test(line))
      break

    errorLines.push(line)

    if (errorLines.length >= 30)
      break
  }

  return errorLines.join("\n").trim() || null
}

function runCommand(cwd: string, args: string[]) {
  return new Promise<{ exitCode: number, output: string }>((resolve, reject) => {
    const child = spawn(getPnpmCommand(), args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let output = ""

    child.stdout.on("data", (chunk) => {
      output += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      output += chunk.toString()
    })

    child.on("error", reject)
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        output,
      })
    })
  })
}

export function createSlidevExportScreenshotTool(rootDir: string) {
  return tool(async ({ slideIndex, outputDir, timeout, wait }) => {
    const deckContext = resolveDeckExecutionContext(path.resolve(rootDir))
    const resolvedOutputDir = await resolveOutputDir(deckContext.rootDir, deckContext.deckHostDir, slideIndex, outputDir)
    const totalSlides = await resolveDeckSlideCount(deckContext.deckHostDir, deckContext.entryPath).catch(() => null)

    if (totalSlides !== null && slideIndex > totalSlides) {
      throw new Error([
        `slidev_export_screenshot requested slide ${slideIndex}, but the resolved deck only has ${totalSlides} slides.`,
        `Resolved deck entry: ${path.relative(deckContext.rootDir, deckContext.entryPath) || path.basename(deckContext.entryPath)}`,
        "This usually means the slide is not imported into the final deck yet or the 1-based slide index was counted incorrectly.",
      ].join("\n"))
    }

    await mkdir(resolvedOutputDir, { recursive: true })

    const args = [
      "exec",
      "slidev-agent",
      "export",
      "--format",
      "png",
      "--range",
      String(slideIndex),
      "--per-slide",
      "--output",
      resolvedOutputDir,
      "--timeout",
      String(timeout ?? 60000),
      "--wait",
      String(wait ?? 500),
      "--scale",
      "1",
    ]

    const result = await runCommand(deckContext.deckHostDir, args)
    if (result.exitCode !== 0) {
      throw new Error([
        `slidev_export_screenshot failed with exit code ${result.exitCode}.`,
        `Deck directory: ${deckContext.deckHostDir}`,
        `Command: ${getPnpmCommand()} ${args.join(" ")}`,
        result.output.trim(),
      ].filter(Boolean).join("\n"))
    }

    const imageFiles = (await readdir(resolvedOutputDir))
      .filter(fileName => fileName.toLowerCase().endsWith(".png"))
      .sort((a, b) => a.localeCompare(b))

    if (imageFiles.length === 0) {
      const buildError = extractLikelyBuildError(result.output)
      if (buildError) {
        throw new Error([
          "slidev_export_screenshot hit a Slidev/Vite build error and produced no PNG files.",
          `Deck directory: ${deckContext.deckHostDir}`,
          `Command: ${getPnpmCommand()} ${args.join(" ")}`,
          buildError,
        ].join("\n"))
      }

      throw new Error([
        `slidev_export_screenshot succeeded but produced no PNG files in ${resolvedOutputDir}.`,
        totalSlides !== null ? `Resolved deck slide count: ${totalSlides}. Requested slide: ${slideIndex}.` : "",
        "This usually means the requested 1-based slide index does not exist in the final rendered deck yet.",
      ].filter(Boolean).join("\n"))
    }

    const imagePaths = imageFiles.map(fileName => path.join(resolvedOutputDir, fileName))

    return {
      slideIndex,
      deckDir: deckContext.deckHostDir,
      outputDir: resolvedOutputDir,
      imagePaths,
      primaryImagePath: imagePaths[0],
      command: `${getPnpmCommand()} ${args.join(" ")}`,
    }
  }, {
    name: "slidev_export_screenshot",
    description: "Export one Slidev slide to PNG from the correct deck directory and return the generated image path.",
    schema: slidevExportScreenshotSchema,
  })
}
