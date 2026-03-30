#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { stat } from "node:fs/promises"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

import { pullRemoteSlides, pushRemoteSlides, resolveSlideEntry } from "../lib/bridge.mjs"

const [, , command = "dev", ...rest] = process.argv
const require = createRequire(import.meta.url)

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx"
}

function spawnCommand(commandName, args, options = {}) {
  return spawn(commandName, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...options,
  })
}

function resolvePackageBin(packageName, preferredBinName) {
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

async function fileExists(filePath) {
  try {
    await stat(filePath)
    return true
  }
  catch {
    return false
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

  const langgraphChild = command === "dev" ? await startLangGraphDev() : null
  const slidevChild = spawnCommand(getNpxCommand(), ["slidev", ...slidevArgs])

  let isShuttingDown = false

  function shutdown(exitCode = 0) {
    if (isShuttingDown)
      return

    isShuttingDown = true

    langgraphChild?.kill("SIGTERM")
    slidevChild.kill("SIGTERM")

    process.exit(exitCode)
  }

  process.on("SIGINT", () => shutdown(0))
  process.on("SIGTERM", () => shutdown(0))

  langgraphChild?.on("exit", (code) => {
    if (!isShuttingDown && (code ?? 0) !== 0)
      shutdown(code ?? 1)
  })

  slidevChild.on("exit", (code) => {
    shutdown(code ?? 1)
  })
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
