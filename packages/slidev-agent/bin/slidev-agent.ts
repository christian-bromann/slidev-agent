#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { stat } from "node:fs/promises"
import { spawn, type ChildProcess } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

import { writeLanggraphJsonIfMissing } from "../lib/langgraph-init.js"
import { pullRemoteSlides, pushRemoteSlides, resolveSlideEntry } from "../lib/bridge.js"

const [, , command = "dev", ...rest] = process.argv
const require = createRequire(import.meta.url)

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx"
}

function spawnCommand(commandName: string, args: string[], options: Record<string, unknown> = {}) {
  return spawn(commandName, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...options,
  })
}

function resolvePackageBin(packageName: string, preferredBinName?: string) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
  const packageRoot = path.dirname(packageJsonPath)

  if (typeof packageJson.bin === "string")
    return path.resolve(packageRoot, packageJson.bin)

  if (packageJson.bin && typeof packageJson.bin === "object") {
    const selectedBin = preferredBinName
      ? packageJson.bin[preferredBinName]
      : Object.values(packageJson.bin)[0]

    if (typeof selectedBin === "string")
      return path.resolve(packageRoot, selectedBin)
  }

  throw new Error(`Could not resolve a binary for ${packageName}`)
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath)
    return true
  }
  catch {
    return false
  }
}

function ensureLanggraphJsonForDev(cwd: string) {
  if (process.env.SLIDEV_AGENT_DISABLE_LANGGRAPH === "1")
    return

  try {
    writeLanggraphJsonIfMissing(cwd)
  }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`slidev-agent: could not create langgraph.json (${msg}). LangGraph dev will not start.`)
  }
}

async function startLangGraphDev() {
  if (process.env.SLIDEV_AGENT_DISABLE_LANGGRAPH === "1")
    return null

  const configPath = path.join(process.cwd(), "langgraph.json")
  if (!await fileExists(configPath))
    return null

  const langgraphBin = resolvePackageBin("@langchain/langgraph-cli", "langgraphjs")

  return spawnCommand(process.execPath, [
    langgraphBin,
    "dev",
    "--config",
    "langgraph.json",
    "--no-browser",
  ])
}

/** Resolves when `child` has exited (immediately if it already has). */
function onceChildExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    child.once("exit", () => resolve())
  })
}

const CHILD_SHUTDOWN_TIMEOUT_MS = 10_000

async function waitForChildrenThenExit(
  slidevChild: ChildProcess,
  langgraphChild: ChildProcess | null,
  exitCode: number,
) {
  const waitFor = [onceChildExit(slidevChild)]
  if (langgraphChild)
    waitFor.push(onceChildExit(langgraphChild))

  const timeout = setTimeout(() => {
    langgraphChild?.kill("SIGKILL")
    slidevChild.kill("SIGKILL")
  }, CHILD_SHUTDOWN_TIMEOUT_MS)

  try {
    await Promise.all(waitFor)
  }
  finally {
    clearTimeout(timeout)
  }

  process.exit(exitCode)
}

async function run() {
  if (command === "sync") {
    const subcommand = rest[0] || "pull"
    if (subcommand === "pull") {
      const result = await pullRemoteSlides(process.cwd())
      if (result.mode === "local")
        console.log(`No remote bridge configured, using local entry at ${result.entry}`)
      else
        console.log(`Pulled ${result.manifest.files.length} files into ${result.manifest.generatedRoot}`)
      return
    }

    if (subcommand === "push") {
      await pushRemoteSlides(process.cwd())
      console.log("Pushed generated slides back to the bridge.")
      return
    }

    throw new Error(`Unknown sync subcommand: ${subcommand}`)
  }

  const { entry } = await resolveSlideEntry(process.cwd())
  const slidevArgs = command === "dev"
    ? [entry, ...rest]
    : [command, entry, ...rest]

  if (command === "dev")
    ensureLanggraphJsonForDev(process.cwd())

  const langgraphChild = command === "dev" ? await startLangGraphDev() : null
  const slidevChild = spawnCommand(getNpxCommand(), ["slidev", ...slidevArgs])

  let isShuttingDown = false

  function shutdown(exitCode = 0) {
    if (isShuttingDown) {
      // Second Ctrl+C (or SIGTERM) while waiting for children: force quit.
      langgraphChild?.kill("SIGKILL")
      slidevChild.kill("SIGKILL")
      process.exit(exitCode)
      return
    }

    isShuttingDown = true

    langgraphChild?.kill("SIGTERM")
    slidevChild.kill("SIGTERM")

    void waitForChildrenThenExit(slidevChild, langgraphChild, exitCode)
  }

  process.on("SIGINT", () => shutdown(0))
  process.on("SIGTERM", () => shutdown(0))

  langgraphChild?.on("exit", (code: number | null) => {
    if (isShuttingDown)
      return
    if ((code ?? 0) !== 0)
      shutdown(code ?? 1)
  })

  slidevChild.on("exit", (code: number | null) => {
    if (isShuttingDown)
      return
    shutdown(code ?? 1)
  })
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
