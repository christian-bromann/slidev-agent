import { existsSync } from "node:fs"
import { writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

export interface LanggraphJsonShape {
  node_version: string
  dependencies: string[]
  graphs: Record<string, string>
  http: { app: string }
  env: string
}

function posixRelativeToCwd(cwd: string, absoluteFile: string): string {
  const rel = path.relative(cwd, absoluteFile).replace(/\\/g, "/")
  if (!rel)
    return "."
  return rel.startsWith(".") ? rel : `./${rel}`
}

/**
 * Resolves installed `slidev-addon-agent` entry files and returns graph spec strings
 * for langgraph.json (path + export name).
 */
export function resolveSlidevAddonGraphSpecs(cwd: string): { agent: string; app: string } {
  const packageJsonPath = path.join(cwd, "package.json")
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `No package.json in ${cwd}. Run slidev-agent dev from your Slidev project root (where package.json lives).`,
    )
  }

  const require = createRequire(packageJsonPath)
  let pkgRoot: string
  try {
    pkgRoot = path.dirname(require.resolve("slidev-addon-agent"))
  }
  catch {
    throw new Error(
      "Could not resolve \"slidev-addon-agent\". Install it in this project, e.g. pnpm add slidev-addon-agent",
    )
  }

  const agentFile = path.join(pkgRoot, "agent", "index.ts")
  const appFile = path.join(pkgRoot, "app", "index.ts")

  return {
    agent: `${posixRelativeToCwd(cwd, agentFile)}:agent`,
    app: `${posixRelativeToCwd(cwd, appFile)}:app`,
  }
}

export function buildLanggraphJson(cwd: string): LanggraphJsonShape {
  const { agent, app } = resolveSlidevAddonGraphSpecs(cwd)
  return {
    node_version: "20",
    dependencies: ["."],
    graphs: {
      agent,
    },
    http: {
      app,
    },
    env: ".env",
  }
}

/**
 * Writes `langgraph.json` when it is missing (first `slidev-agent dev`).
 * Does not overwrite an existing file.
 */
export function writeLanggraphJsonIfMissing(cwd: string): void {
  const outPath = path.join(cwd, "langgraph.json")
  if (existsSync(outPath))
    return

  const config = buildLanggraphJson(cwd)
  writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
