import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

import { tool } from "langchain"
import { z } from "zod"

function env(name: string, fallback = ""): string {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function normalizeOrigin(raw: string): string {
  return raw.replace(/\/$/, "")
}

const SLIDE_OVERFLOW_EVAL_SCRIPT = `(() => {
  const root = document.querySelector("#slide-content") || document.querySelector(".slidev-slide-content")
  if (!root || !(root instanceof HTMLElement))
    return { ok: false, error: "no_slide_content" }

  const tolerance = 2
  const rootRect = root.getBoundingClientRect()

  let maxRight = rootRect.left
  let maxBottom = rootRect.top
  let minLeft = rootRect.right
  let minTop = rootRect.bottom

  const walk = (el) => {
    if (!(el instanceof HTMLElement))
      return
    const style = window.getComputedStyle(el)
    if (style.visibility === "hidden" || style.display === "none")
      return
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 && rect.height < 1)
      return
    maxRight = Math.max(maxRight, rect.right)
    maxBottom = Math.max(maxBottom, rect.bottom)
    minLeft = Math.min(minLeft, rect.left)
    minTop = Math.min(minTop, rect.top)
    for (const c of el.children)
      walk(c)
  }

  walk(root)

  const horizontalOverflow = maxRight > rootRect.right + tolerance || minLeft < rootRect.left - tolerance
  const verticalOverflow = maxBottom > rootRect.bottom + tolerance || minTop < rootRect.top - tolerance

  return {
    ok: true,
    overflow: { horizontal: horizontalOverflow, vertical: verticalOverflow },
    slideRect: {
      left: rootRect.left,
      top: rootRect.top,
      right: rootRect.right,
      bottom: rootRect.bottom,
      width: rootRect.width,
      height: rootRect.height,
    },
    contentBounds: { minLeft, minTop, maxRight, maxBottom },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }
})()`

function getAgentBrowserJsPath(): string | null {
  const custom = env("SLIDEV_AGENT_BROWSER_PATH")
  if (custom)
    return custom

  try {
    const require = createRequire(import.meta.url)
    const pkgDir = path.dirname(require.resolve("agent-browser/package.json"))
    return path.join(pkgDir, "bin", "agent-browser.js")
  }
  catch {
    return null
  }
}

function parseEvalResultStdout(stdout: string): unknown {
  const trimmed = stdout.trim()
  if (!trimmed)
    throw new Error("empty eval output")
  const parsed = JSON.parse(trimmed) as {
    success?: boolean
    data?: { origin?: string; result?: unknown } | null
    error?: string | null
  }
  if (parsed.success === false)
    throw new Error(parsed.error || "agent-browser eval failed")

  if (parsed.data && typeof parsed.data === "object" && "result" in parsed.data)
    return parsed.data.result

  return parsed.data
}

type RunResult = { ok: boolean; stdout: string; stderr: string }

function runAgentBrowser(args: string[], stdin?: string): RunResult {
  const jsPath = getAgentBrowserJsPath()
  if (!jsPath) {
    return {
      ok: false,
      stdout: "",
      stderr: "agent-browser is not installed. Add it to the project (e.g. pnpm add -D agent-browser) and run `agent-browser install` once to fetch Chrome for Testing, or install the agent-browser CLI globally.",
    }
  }

  const r = spawnSync(process.execPath, [jsPath, ...args], {
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    input: stdin,
    env: process.env,
  })

  const stdout = r.stdout ?? ""
  const stderr = r.stderr ?? ""
  const ok = r.status === 0 && !r.error
  if (r.error)
    return { ok: false, stdout, stderr: `${r.error.message}\n${stderr}` }

  return { ok, stdout, stderr }
}

export function createInspectSlidePreviewTool() {
  return tool(
    async (input) => {
      const slideNumber = Math.floor(input.slideNumber)
      if (!Number.isFinite(slideNumber) || slideNumber < 1) {
        return JSON.stringify({
          ok: false,
          error: "slideNumber must be a positive integer (Slidev route index, e.g. 1 for /1).",
        })
      }

      const origin = normalizeOrigin(
        input.origin || env("SLIDEV_AGENT_PREVIEW_ORIGIN", "http://127.0.0.1:3030"),
      )
      const url = `${origin}/${slideNumber}`
      const session = env("SLIDEV_AGENT_BROWSER_SESSION", "slidev-agent-preview")

      const sessionArgs = ["--json", "--session", session] as const

      const viewport = runAgentBrowser([...sessionArgs, "set", "viewport", "1920", "1080"])
      if (!viewport.ok)
        return formatToolError(url, viewport, "set viewport")

      const opened = runAgentBrowser([...sessionArgs, "open", url])
      if (!opened.ok) {
        runAgentBrowser([...sessionArgs, "close"])
        return JSON.stringify({
          ok: false,
          error: `Could not open ${url}. Is the Slidev dev server running and SLIDEV_AGENT_PREVIEW_ORIGIN correct?`,
          detail: combineOut(opened),
          url,
        })
      }

      const load = runAgentBrowser([...sessionArgs, "wait", "--load", "domcontentloaded"])
      if (!load.ok)
        void load

      const settle = runAgentBrowser([...sessionArgs, "wait", "600"])
      if (!settle.ok)
        void settle

      let dom: Record<string, unknown>
      try {
        const ev = runAgentBrowser(
          [...sessionArgs, "eval", "--stdin"],
          SLIDE_OVERFLOW_EVAL_SCRIPT,
        )
        if (!ev.ok) {
          runAgentBrowser([...sessionArgs, "close"])
          return JSON.stringify({
            ok: false,
            error: "eval failed while measuring slide layout.",
            detail: combineOut(ev),
            url,
          })
        }
        dom = parseEvalPayload(ev.stdout)
      }
      catch (e) {
        runAgentBrowser([...sessionArgs, "close"])
        const message = e instanceof Error ? e.message : String(e)
        return JSON.stringify({
          ok: false,
          error: `Could not parse slide inspection result: ${message}`,
          url,
        })
      }

      runAgentBrowser([...sessionArgs, "close"])

      if (dom.ok === false || dom.error) {
        return JSON.stringify({
          ok: false,
          error: `Loaded ${url} but could not find slide content (#slide-content).`,
          url,
        })
      }

      const overflow = dom.overflow as { horizontal?: boolean; vertical?: boolean } | undefined
      const horizontal = Boolean(overflow?.horizontal)
      const vertical = Boolean(overflow?.vertical)
      const hasOverflow = horizontal || vertical

      return JSON.stringify({
        ok: true,
        url,
        engine: "agent-browser",
        overflow: { horizontal, vertical },
        hasOverflow,
        slideRect: dom.slideRect,
        contentBounds: dom.contentBounds,
        viewport: dom.viewport,
        hint: hasOverflow
          ? "Content appears clipped or extending past the slide frame. Remove or shrink elements, split into another slide, simplify diagrams, or reduce columns/font sizes; then re-run this check."
          : "No obvious overflow detected against the slide content box.",
      })
    },
    {
      name: "inspect_slide_preview",
      description: [
        "Verify how a Slidev slide renders in the running dev server before finishing slide work.",
        "Uses the agent-browser CLI (Vercel) to open the slide in Chrome and detect whether content extends outside the slide content box (overflow/clipping).",
        "Requires agent-browser on PATH or as a dependency, a one-time `agent-browser install` for Chrome for Testing, a running Slidev preview (default origin http://127.0.0.1:3030), and optional env SLIDEV_AGENT_PREVIEW_ORIGIN.",
        "Optional: SLIDEV_AGENT_BROWSER_PATH (path to agent-browser.js), SLIDEV_AGENT_BROWSER_SESSION (isolated session name).",
        "Pass the 1-based slide index as shown in the app URL (e.g. slide 3 → slideNumber: 3).",
        "If the new slide is not imported into the deck yet, skip this tool and say so; the supervisor can re-run after updating slides.md.",
      ].join(" "),
      schema: z.object({
        slideNumber: z.number().describe("1-based Slidev slide number in the URL path (e.g. 5 for /5)."),
        origin: z.string().optional().describe("Preview server origin, e.g. http://127.0.0.1:3030. Defaults to SLIDEV_AGENT_PREVIEW_ORIGIN or http://127.0.0.1:3030."),
      }),
    },
  )
}

function combineOut(r: RunResult): string {
  return [r.stderr, r.stdout].filter(Boolean).join("\n").trim()
}

function formatToolError(url: string, r: RunResult, step: string): string {
  return JSON.stringify({
    ok: false,
    skipped: true,
    error: `agent-browser failed during ${step}. Install: https://github.com/vercel-labs/agent-browser — add the npm package or global CLI, run \`agent-browser install\` once, then retry.`,
    detail: combineOut(r),
    url,
  })
}

function parseEvalPayload(stdout: string): Record<string, unknown> {
  const raw = parseEvalResultStdout(stdout)
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    return raw as Record<string, unknown>

  if (typeof raw === "string")
    return JSON.parse(raw) as Record<string, unknown>

  throw new Error("unexpected eval payload shape")
}
