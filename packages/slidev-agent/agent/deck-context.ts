import fs from "node:fs"
import path from "node:path"

import { env } from "../lib/env.js"

type PackageJsonWithScripts = {
  scripts?: Record<string, unknown>
}

export function normalizeProjectRelativePath(filePath: string) {
  const normalized = filePath.replaceAll(path.sep, "/").replace(/^\/+/, "")
  return normalized || "."
}

function readPackageJson(packageJsonPath: string): PackageJsonWithScripts | null {
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageJsonWithScripts
  }
  catch {
    return null
  }
}

export function readPackageScript(rootDir: string, scriptName: string) {
  const packageJson = readPackageJson(path.join(rootDir, "package.json"))
  const script = packageJson?.scripts?.[scriptName]
  return typeof script === "string" && script.trim() ? script.trim() : null
}

export function extractWorkingDirFromScript(script: string) {
  const pnpmDirMatch = script.match(/(?:^|\s)pnpm\s+(?:--dir|-C)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/)
  const cdMatch = script.match(/(?:^|\s)cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&]+))/)
  const workingDir = pnpmDirMatch?.[1] || pnpmDirMatch?.[2] || pnpmDirMatch?.[3] || cdMatch?.[1] || cdMatch?.[2] || cdMatch?.[3]
  return workingDir ? normalizeProjectRelativePath(workingDir) : null
}

export type SlidevDeckExecutionContext = {
  rootDir: string
  configuredEntry: string
  deckDir: string
  deckHostDir: string
  entryPath: string
  rootExportScript: string | null
}

export function resolveDeckExecutionContext(rootDir: string): SlidevDeckExecutionContext {
  const configuredEntry = normalizeProjectRelativePath(env(process.env, "SLIDEV_AGENT_ENTRY", "slides.md"))
  const configuredEntryDir = path.posix.dirname(configuredEntry)
  const rootExportScript = readPackageScript(rootDir, "export")
  const inferredDeckDir = rootExportScript ? extractWorkingDirFromScript(rootExportScript) : null
  const deckDir = configuredEntryDir !== "." ? configuredEntryDir : inferredDeckDir || "."
  const deckHostDir = deckDir === "."
    ? rootDir
    : path.resolve(rootDir, deckDir)
  const entryPath = configuredEntryDir !== "."
    ? path.resolve(rootDir, configuredEntry)
    : path.resolve(deckHostDir, configuredEntry)

  return {
    rootDir,
    configuredEntry,
    deckDir,
    deckHostDir,
    entryPath,
    rootExportScript,
  }
}
