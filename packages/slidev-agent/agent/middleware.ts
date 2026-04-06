import path from "node:path"

import { createMiddleware, ToolMessage } from "langchain"

const FILESYSTEM_TOOL_NAMES = new Set([
  "ls",
  "read_file",
  "write_file",
  "edit_file",
  "glob",
  "grep",
])

const SINGLE_PATH_ARG_KEYS = ["path", "file_path"] as const
const ARRAY_PATH_ARG_KEYS = ["paths"] as const
const HOST_ABSOLUTE_PREFIXES = [
  "/Users/",
  "/private/",
  "/var/",
  "/tmp/",
  "/etc/",
  "/opt/",
  "/Volumes/",
  "/home/",
]
const HOST_RELATIVE_PREFIXES = HOST_ABSOLUTE_PREFIXES.map(prefix => prefix.slice(1))

function isWithinRoot(rootDir: string, candidatePath: string) {
  const relativePath = path.relative(rootDir, candidatePath)
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
}

function toProjectRelativePath(rootDir: string, candidatePath: string) {
  const relativePath = path.relative(rootDir, candidatePath).replaceAll(path.sep, "/")
  return relativePath ? `/${relativePath}` : "/"
}

function looksLikeHostAbsolutePath(value: string) {
  return HOST_ABSOLUTE_PREFIXES.some(prefix => value.startsWith(prefix))
}

function looksLikeMissingLeadingSlashHostPath(value: string) {
  return HOST_RELATIVE_PREFIXES.some(prefix => value.startsWith(prefix))
}

function normalizeFilesystemPath(rootDir: string, rawValue: string) {
  const value = rawValue.trim()
  if (!value)
    return { normalized: rawValue, error: null }

  if (looksLikeHostAbsolutePath(value)) {
    const candidatePath = path.resolve(value)
    if (isWithinRoot(rootDir, candidatePath)) {
      return { normalized: toProjectRelativePath(rootDir, candidatePath), error: null }
    }

    return {
      normalized: rawValue,
      error: [
        `Filesystem tools are rooted at the agent project, so host absolute paths are not allowed here: ${value}`,
        "Use a project-root-relative path such as `/slides.md`, `/pages/foo.md`, or `/example/slides.md` instead.",
      ].join("\n"),
    }
  }

  if (looksLikeMissingLeadingSlashHostPath(value)) {
    const candidatePath = path.resolve(path.sep, value)
    if (isWithinRoot(rootDir, candidatePath))
      return { normalized: toProjectRelativePath(rootDir, candidatePath), error: null }

    return {
      normalized: rawValue,
      error: [
        `Filesystem tools received a host-style path instead of a project-relative path: ${value}`,
        "Use a project-root-relative path such as `/slides.md`, `/pages/foo.md`, or `/example/slides.md` instead.",
      ].join("\n"),
    }
  }

  return { normalized: rawValue, error: null }
}

function toolErrorMessage(toolCallId: string | undefined, content: string) {
  return new ToolMessage({
    content,
    tool_call_id: toolCallId || "",
  })
}

export function createFilesystemPathGuardMiddleware(rootDir: string) {
  const absoluteRootDir = path.resolve(rootDir)

  return createMiddleware({
    name: "FilesystemPathGuardMiddleware",
    wrapToolCall: async (request, handler) => {
      const { toolCall } = request
      const { args: rawArgs, id: toolCallId, name: toolName } = toolCall

      if (!FILESYSTEM_TOOL_NAMES.has(toolName)) {
        return handler(request)
      }

      if (!rawArgs || typeof rawArgs !== "object" || Array.isArray(rawArgs)) {
        return handler(request)
      }

      let changed = false
      const nextArgs: Record<string, unknown> = { ...rawArgs as Record<string, unknown> }

      for (const key of SINGLE_PATH_ARG_KEYS) {
        const value = nextArgs[key]
        if (typeof value !== "string")
          continue

        const { normalized, error } = normalizeFilesystemPath(absoluteRootDir, value)
        if (error) {
          return toolErrorMessage(toolCallId, error)
        }

        if (normalized !== value) {
          nextArgs[key] = normalized
          changed = true
        }
      }

      for (const key of ARRAY_PATH_ARG_KEYS) {
        const value = nextArgs[key]
        if (!Array.isArray(value))
          continue

        const normalizedPaths: unknown[] = []
        for (const entry of value) {
          if (typeof entry !== "string") {
            normalizedPaths.push(entry)
            continue
          }

          const { normalized, error } = normalizeFilesystemPath(absoluteRootDir, entry)
          if (error) {
            return toolErrorMessage(toolCallId, error)
          }

          normalizedPaths.push(normalized)
          if (normalized !== entry)
            changed = true
        }

        nextArgs[key] = normalizedPaths
      }

      if (!changed)
        return handler(request)

      return handler({
        ...request,
        toolCall: {
          ...toolCall,
          args: nextArgs,
        },
      })
    },
  })
}
