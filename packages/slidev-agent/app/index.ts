import path from "node:path"
import { readFile, stat } from "node:fs/promises"

import { Hono } from "hono"

function env(name: string, fallback = ""): string {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function resolveRootDir() {
  return path.resolve(env("SLIDEV_AGENT_ROOT_DIR") || process.cwd())
}

function normalizeBasePath(basePath: string) {
  if (!basePath.startsWith("/"))
    return `/${basePath}`

  return basePath.replace(/\/+$/, "")
}

function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8"
    case ".js":
      return "application/javascript; charset=utf-8"
    case ".mjs":
      return "application/javascript; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".json":
      return "application/json; charset=utf-8"
    case ".svg":
      return "image/svg+xml"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".woff":
      return "font/woff"
    case ".woff2":
      return "font/woff2"
    default:
      return "application/octet-stream"
  }
}

async function exists(filePath: string) {
  try {
    await stat(filePath)
    return true
  }
  catch {
    return false
  }
}

async function proxyToDevServer(requestUrl: URL, assetPath: string) {
  const devServerUrl = new URL(env("SLIDEV_AGENT_DEV_URL", "http://localhost:3030"))
  const targetUrl = new URL(assetPath || "/", devServerUrl)
  targetUrl.search = requestUrl.search

  const response = await fetch(targetUrl)
  const body = await response.arrayBuffer()

  return new Response(body, {
    status: response.status,
    headers: response.headers,
  })
}

const app = new Hono()

const basePath = normalizeBasePath(env("SLIDEV_AGENT_APP_BASE_PATH", "/slidev-agent"))

app.get("/", c => c.redirect(`${basePath}/`, 302))
app.get(basePath, c => c.redirect(`${basePath}/`, 302))

app.get(`${basePath}/*`, async (c) => {
  const requestUrl = new URL(c.req.url)
  const assetPath = requestUrl.pathname.slice(basePath.length) || "/"
  const distRoot = path.join(resolveRootDir(), "dist")

  if (await exists(path.join(distRoot, "index.html"))) {
    const candidatePath = path.normalize(path.join(distRoot, assetPath))
    const safeRoot = `${distRoot}${path.sep}`
    const safeCandidate = candidatePath === distRoot || candidatePath.startsWith(safeRoot)

    if (!safeCandidate)
      return c.text("Invalid asset path", 400)

    const isSpaRoute = !path.extname(assetPath)
    const filePath = await exists(candidatePath)
      ? candidatePath
      : isSpaRoute
        ? path.join(distRoot, "index.html")
        : ""

    if (!filePath)
      return c.text("Asset not found", 404)

    const content = await readFile(filePath)
    return new Response(content, {
      headers: {
        "content-type": getMimeType(filePath),
      },
    })
  }

  try {
    return await proxyToDevServer(requestUrl, assetPath)
  }
  catch {
    return c.text(
      `Slidev app is not available yet. Start \`slidev-agent dev\` or build the deck so LangGraph can serve it from ${basePath}/.`,
      503,
    )
  }
})

export { app }
