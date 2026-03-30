import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

const GENERATED_ROOT = ".slidev-agent/generated"
const MANIFEST_PATH = ".slidev-agent/manifest.json"

function env(name, fallback = "") {
  return process.env[name]?.trim() || fallback
}

function resolveBridgeConfig(cwd) {
  return {
    apiUrl: env("SLIDEV_AGENT_API_URL"),
    deckId: env("SLIDEV_AGENT_DECK_ID"),
    namespace: env("SLIDEV_AGENT_NAMESPACE"),
    entry: env("SLIDEV_AGENT_ENTRY", "slides.md"),
    routePrefix: env("SLIDEV_AGENT_ROUTE_PREFIX", "/slidev-agent"),
    cwd,
  }
}

function isRemoteBridgeEnabled(config) {
  return Boolean(config.apiUrl && config.deckId)
}

function normalizeRoutePrefix(routePrefix) {
  if (!routePrefix.startsWith("/"))
    return `/${routePrefix}`

  return routePrefix.replace(/\/$/, "")
}

function createDeckUrl(config) {
  const prefix = normalizeRoutePrefix(config.routePrefix)
  const url = new URL(`${prefix}/decks/${encodeURIComponent(config.deckId)}`, config.apiUrl)

  if (config.namespace)
    url.searchParams.set("namespace", config.namespace)

  return url
}

function normalizePayload(payload, fallbackEntry) {
  const entry = typeof payload.entry === "string" && payload.entry
    ? payload.entry
    : fallbackEntry

  if (Array.isArray(payload.files)) {
    return {
      entry,
      files: payload.files.map(file => ({
        path: file.path,
        content: file.content,
      })),
    }
  }

  if (payload.slides && typeof payload.slides === "object") {
    return {
      entry,
      files: Object.entries(payload.slides).map(([filePath, content]) => ({
        path: filePath,
        content: String(content),
      })),
    }
  }

  throw new Error("Unsupported response shape. Expected `files` or `slides` in the bridge response.")
}

async function ensureParentDirectory(targetFile) {
  await mkdir(path.dirname(targetFile), { recursive: true })
}

async function writeManifest(cwd, manifest) {
  const manifestFile = path.join(cwd, MANIFEST_PATH)
  await ensureParentDirectory(manifestFile)
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

async function readManifest(cwd) {
  const manifestFile = path.join(cwd, MANIFEST_PATH)
  const content = await readFile(manifestFile, "utf8")
  return JSON.parse(content)
}

export async function pullRemoteSlides(cwd = process.cwd()) {
  const config = resolveBridgeConfig(cwd)
  if (!isRemoteBridgeEnabled(config)) {
    return {
      mode: "local",
      entry: path.join(cwd, config.entry),
      manifest: null,
    }
  }

  const response = await fetch(createDeckUrl(config), {
    headers: {
      accept: "application/json",
    },
  })

  if (!response.ok)
    throw new Error(`Bridge pull failed with ${response.status} ${response.statusText}`)

  const payload = normalizePayload(await response.json(), config.entry)
  const generatedRoot = path.join(cwd, GENERATED_ROOT)

  await rm(generatedRoot, { recursive: true, force: true })
  await mkdir(generatedRoot, { recursive: true })

  for (const file of payload.files) {
    const outputFile = path.join(generatedRoot, file.path)
    await ensureParentDirectory(outputFile)
    await writeFile(outputFile, file.content, "utf8")
  }

  const manifest = {
    entry: payload.entry,
    generatedRoot: GENERATED_ROOT,
    files: payload.files.map(file => file.path),
  }

  await writeManifest(cwd, manifest)

  return {
    mode: "remote",
    entry: path.join(generatedRoot, payload.entry),
    manifest,
  }
}

export async function pushRemoteSlides(cwd = process.cwd()) {
  const config = resolveBridgeConfig(cwd)
  if (!isRemoteBridgeEnabled(config))
    throw new Error("Remote sync is not configured. Set SLIDEV_AGENT_API_URL and SLIDEV_AGENT_DECK_ID.")

  const manifest = await readManifest(cwd)
  const generatedRoot = path.join(cwd, manifest.generatedRoot)

  const files = []
  for (const filePath of manifest.files) {
    const absoluteFile = path.join(generatedRoot, filePath)
    files.push({
      path: filePath,
      content: await readFile(absoluteFile, "utf8"),
    })
  }

  const response = await fetch(createDeckUrl(config), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      entry: manifest.entry,
      files,
    }),
  })

  if (!response.ok)
    throw new Error(`Bridge push failed with ${response.status} ${response.statusText}`)
}

export async function resolveSlideEntry(cwd = process.cwd()) {
  const config = resolveBridgeConfig(cwd)
  if (isRemoteBridgeEnabled(config))
    return pullRemoteSlides(cwd)

  const entryFile = path.join(cwd, config.entry)
  await stat(entryFile)

  return {
    mode: "local",
    entry: entryFile,
    manifest: null,
  }
}
