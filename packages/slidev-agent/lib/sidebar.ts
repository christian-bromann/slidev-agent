import { unref } from "vue"

import {
  getMessageContent,
  getMessageRole,
  getMessageToolCallId,
  getMessageToolCalls,
  getMessageToolName,
} from "./messages"

export type ToolCallResult = {
  call?: {
    id?: string
    name?: string
    args?: unknown
  }
  result?: unknown
  /** From LangGraph SDK `getToolCallsWithResults`; omitted in some code paths. */
  state?: "pending" | "completed" | "error"
}

export type StreamToolCall = ToolCallResult

export type StreamSubagent = {
  id: string
  status: string
  messages: unknown[]
  toolCall: {
    args?: Record<string, unknown>
    id?: string
  }
  toolCalls: StreamToolCall[]
}

export type SubagentActivity = {
  id: string
  type: string
  typeHeadline: string
  status: string
  statusLabel: string
  initiatorToolCallId: string
  taskSummary: string
  latestToolName: string
  latestToolHeadline: string
  latestToolArgs: string
  /** Lifecycle of the **last** subagent tool only (max one row in the UI). */
  latestToolState: "pending" | "completed" | "error"
  latestToolStateLabel: string
  latestToolSummary: string
  files: string[]
  messageCount: number
  hasVisibleActivity: boolean
}

type SidebarBaseMessage = {
  key: string
  role: string
}

export type SidebarToolMessage = SidebarBaseMessage & {
  kind: "tool"
  toolName: string
  toolHeadline: string
  argsSummary: string
  resultSummary: string
}

export type SidebarTextMessage = SidebarBaseMessage & {
  kind: "message"
  messageId: string
  label: string
  content: string
  subagents: SubagentActivity[]
}

export type SidebarMessage = SidebarToolMessage | SidebarTextMessage

export function normalizeMessages(value: unknown) {
  const unwrapped = unref(value)
  return Array.isArray(unwrapped) ? unwrapped : []
}

export function getMessageId(message: unknown): string {
  if (!message || typeof message !== "object")
    return ""

  const id = Reflect.get(message, "id")
  return typeof id === "string" ? id : ""
}

export function buildToolCallLookup(toolCalls: unknown, rawMessages: unknown[]) {
  const lookup = new Map<string, ToolCallResult>()

  normalizeMessages(toolCalls).forEach((entry) => {
    if (!entry || typeof entry !== "object")
      return

    const call = Reflect.get(entry, "call")
    if (!call || typeof call !== "object")
      return

    const id = Reflect.get(call, "id")
    if (typeof id !== "string" || !id)
      return

    lookup.set(id, {
      call: {
        id,
        name: typeof Reflect.get(call, "name") === "string"
          ? Reflect.get(call, "name") as string
          : undefined,
        args: Reflect.get(call, "args"),
      },
      result: Reflect.get(entry, "result"),
    })
  })

  rawMessages.forEach((message) => {
    getMessageToolCalls(message).forEach((toolCall) => {
      if (!toolCall.id || lookup.has(toolCall.id))
        return

      lookup.set(toolCall.id, { call: toolCall })
    })
  })

  return lookup
}

export function collectActiveSubagentIds(activeSubagents: unknown) {
  const ids = new Set<string>()

  normalizeMessages(activeSubagents).forEach((subagent) => {
    if (!subagent || typeof subagent !== "object")
      return

    const id = Reflect.get(subagent, "id")
    if (typeof id === "string" && id)
      ids.add(id)
  })

  return ids
}

export function truncateText(value: string, maxLength = 96) {
  if (value.length <= maxLength)
    return value

  return `${value.slice(0, maxLength - 1)}...`
}

const TOOL_HEADLINES: Record<string, string> = {
  slide_generator: "Generate or revise a slide",
  slidev_go_to_slide: "Open generated slide",
  slidev_review_screenshot: "Review slide screenshot",
  read_file: "Read file",
  write_file: "Write file",
  edit_file: "Edit file",
  ls: "List directory",
  glob: "Find files",
  grep: "Search in files",
  execute: "Run command",
}

function titleCaseFromSnake(name: string) {
  return name
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

/** User-facing label for a tool or subagent identifier (snake_case). */
export function toolCallHeadline(rawName: string) {
  const trimmed = rawName.trim()
  if (!trimmed)
    return "Tool"

  const mapped = TOOL_HEADLINES[trimmed]
  if (mapped)
    return mapped

  return titleCaseFromSnake(trimmed)
}

export function summarizeToolResult(toolName: string, content: string) {
  const trimmed = content.trim()
  if (toolName === "slidev_go_to_slide") {
    const toolUse = JSON.parse(content)
    const payload = toolUse[Object.keys(toolUse)[0]]
    return `Page: ${payload.page}`
  }

  if (!trimmed)
    return "Completed"

  const lines = trimmed.split("\n").map(line => line.trim()).filter(Boolean)
  if (toolName === "read_file" && lines.length > 0)
    return `${lines.length} line${lines.length === 1 ? "" : "s"}`

  if (["ls", "glob", "grep"].includes(toolName) && lines.length > 0)
    return `${lines.length} item${lines.length === 1 ? "" : "s"}`

  return truncateText(lines[0] || trimmed)
}

export function formatToolArgs(args: unknown) {
  if (!args || typeof args !== "object")
    return ""

  const preferredKeys = ["path", "filePath", "file_path", "pattern", "glob", "command", "page"]
  return preferredKeys
    .map((key) => {
      const value = Reflect.get(args, key)
      if (typeof value !== "string" || !value.trim())
        return ""

      return `${key}: ${truncateText(value.trim(), 48)}`
    })
    .filter(Boolean)
    .join(" · ")
}

/** Prefer path-like fields; otherwise a compact JSON snapshot for subagent progress. */
export function formatToolArgsWithFallback(args: unknown, maxLength = 140) {
  const preferred = formatToolArgs(args)
  if (preferred)
    return preferred

  if (!args || typeof args !== "object")
    return ""

  try {
    return truncateText(JSON.stringify(args), maxLength)
  }
  catch {
    return ""
  }
}

function stringifyUnknownResult(value: unknown): string {
  if (typeof value === "string")
    return value

  if (Array.isArray(value))
    return value.map(entry => stringifyUnknownResult(entry)).filter(Boolean).join("\n")

  if (!value || typeof value !== "object")
    return ""

  const content = Reflect.get(value, "content")
  if (typeof content === "string")
    return content

  const text = Reflect.get(value, "text")
  if (typeof text === "string")
    return text

  return ""
}

function getStreamToolCallState(entry: StreamToolCall | undefined): "pending" | "completed" | "error" {
  if (!entry)
    return "pending"

  if (entry.state)
    return entry.state

  const result = entry.result
  if (result == null)
    return "pending"

  if (typeof result === "object" && Reflect.get(result, "status") === "error")
    return "error"

  return "completed"
}

function labelForSubagentToolState(state: "pending" | "completed" | "error") {
  switch (state) {
    case "pending":
      return "Running…"
    case "completed":
      return "Done"
    case "error":
      return "Error"
  }
}

function extractSubagentTask(toolCall: { args?: Record<string, unknown> } | undefined) {
  const args = toolCall?.args
  if (!args)
    return ""

  const preferredKeys = ["task", "prompt", "description", "instructions", "content", "goal"]
  for (const key of preferredKeys) {
    const value = Reflect.get(args, key)
    if (typeof value === "string" && value.trim())
      return truncateText(value.trim(), 140)
  }

  return ""
}

function getSubagentType(toolCall: { args?: Record<string, unknown> } | undefined) {
  const subagentType = toolCall?.args?.subagent_type
  return typeof subagentType === "string" && subagentType
    ? subagentType
    : "subagent"
}

function normalizePossiblePath(value: unknown): string | null {
  if (typeof value !== "string")
    return null

  const normalized = value.trim()
  if (!normalized)
    return null

  if (
    normalized.includes("/")
    || normalized.endsWith(".md")
    || normalized.endsWith(".vue")
    || normalized.endsWith(".ts")
  ) {
    return normalized
  }

  return null
}

function collectPathsFromUnknown(value: unknown, files: Set<string>) {
  if (typeof value === "string") {
    const maybePath = normalizePossiblePath(value)
    if (maybePath)
      files.add(maybePath)
    return
  }

  if (Array.isArray(value)) {
    value.forEach(entry => collectPathsFromUnknown(entry, files))
    return
  }

  if (!value || typeof value !== "object")
    return

  Object.entries(value).forEach(([key, entry]) => {
    if (["path", "filePath", "file_path", "paths", "glob"].includes(key))
      collectPathsFromUnknown(entry, files)
  })
}

function extractTouchedFiles(toolCalls: Array<{ call?: { name?: string, args?: unknown } }> | undefined) {
  const files = new Set<string>()

  toolCalls?.forEach((toolCall) => {
    const callName = toolCall.call?.name
    if (!callName)
      return

    if ([
      "read_file",
      "write_file",
      "edit_file",
      "ls",
      "glob",
      "grep",
      "execute",
    ].includes(callName)) {
      collectPathsFromUnknown(toolCall.call?.args, files)
    }
  })

  return Array.from(files).slice(0, 8)
}

export function getSubagentStatusPriority(status: string) {
  switch (status) {
    case "running":
      return 0
    case "pending":
      return 1
    case "error":
      return 2
    case "complete":
      return 3
    default:
      return 4
  }
}

export function summarizeSubagent(subagent: StreamSubagent, activeSubagentIds: Set<string>): SubagentActivity {
  const type = getSubagentType(subagent.toolCall)
  const taskSummary = extractSubagentTask(subagent.toolCall)
  const files = extractTouchedFiles(subagent.toolCalls)
  const messageCount = subagent.messages.length
  const latestToolCall = subagent.toolCalls.at(-1)
  const latestToolName = latestToolCall?.call?.name || ""
  const latestToolHeadline = latestToolName ? toolCallHeadline(latestToolName) : ""
  const latestToolArgs = formatToolArgsWithFallback(latestToolCall?.call?.args)
  const latestToolState = getStreamToolCallState(latestToolCall)
  const latestToolStateLabel = labelForSubagentToolState(latestToolState)
  const resultText = stringifyUnknownResult(latestToolCall?.result)
  const latestToolSummary = latestToolName && latestToolState !== "pending"
    ? summarizeToolResult(latestToolName, resultText)
    : ""
  const isActive = activeSubagentIds.has(subagent.id) || ["running", "pending"].includes(subagent.status)
  const status = isActive ? "running" : subagent.status
  const statusLabel = status === "running" ? "running..." : status

  return {
    id: subagent.id,
    type,
    typeHeadline: toolCallHeadline(type),
    status,
    statusLabel,
    initiatorToolCallId: subagent.toolCall?.id || "",
    taskSummary,
    latestToolName,
    latestToolHeadline,
    latestToolArgs,
    latestToolState,
    latestToolStateLabel,
    latestToolSummary,
    files,
    messageCount,
    hasVisibleActivity: Boolean(
      taskSummary
      || latestToolName
      || files.length > 0
      || messageCount > 0,
    ),
  }
}

export function summarizeSubagentActivities(
  subagents: StreamSubagent[],
  activeSubagentIds: Set<string>,
) {
  return subagents
    .map(subagent => summarizeSubagent(subagent, activeSubagentIds))
    .filter(subagent => subagent.hasVisibleActivity || ["running", "pending", "error"].includes(subagent.status))
    .sort((left, right) => {
      const statusPriority = getSubagentStatusPriority(left.status) - getSubagentStatusPriority(right.status)
      if (statusPriority !== 0)
        return statusPriority

      return left.type.localeCompare(right.type)
    })
}

function getRoleLabel(role: string) {
  if (role === "human")
    return "You"

  if (role === "assistant" || !role)
    return "Agent"

  return role.charAt(0).toUpperCase() + role.slice(1)
}

function getMessageKey(message: unknown, role: string, index: number) {
  const messageId = getMessageId(message)
  if (messageId)
    return `message:${messageId}`

  const toolCallId = getMessageToolCallId(message)
  if (toolCallId)
    return `tool:${toolCallId}`

  const content = getMessageContent(message).trim()
  return `${role || "message"}:${index}:${truncateText(content, 24)}`
}

export function buildSidebarMessages(options: {
  rawMessages: unknown[]
  toolCallLookup: Map<string, ToolCallResult>
  getSubagentsByMessage: (messageId: string) => StreamSubagent[]
  activeSubagentIds: Set<string>
  knownSubagentIds: Set<string>
}) {
  return options.rawMessages.map((message, index): SidebarMessage => {
    const role = getMessageRole(message)
    const key = getMessageKey(message, role, index)

    if (role === "tool") {
      const toolCallId = getMessageToolCallId(message)
      const toolCall = toolCallId ? options.toolCallLookup.get(toolCallId) : undefined
      const inlineToolCall = getMessageToolCalls(message).at(0)
      const toolName = toolCall?.call?.name || inlineToolCall?.name || getMessageToolName(message) || "tool"
      const argsSummary = formatToolArgs(toolCall?.call?.args ?? inlineToolCall?.args)
      const resultSummary = summarizeToolResult(toolName, getMessageContent(message))

      return {
        key,
        kind: "tool",
        role,
        toolName,
        toolHeadline: toolCallHeadline(toolName),
        argsSummary,
        resultSummary,
      }
    }

    const messageId = getMessageId(message)
    const subagents = messageId
      ? options.getSubagentsByMessage(messageId)
        .map(subagent => summarizeSubagent(subagent, options.activeSubagentIds))
        .filter(subagent => {
          return (
            options.knownSubagentIds.has(subagent.id)
            || options.activeSubagentIds.has(subagent.id)
            || subagent.hasVisibleActivity
          )
        })
      : []

    return {
      key,
      kind: "message",
      role,
      messageId,
      label: getRoleLabel(role),
      content: getMessageContent(message),
      subagents,
    }
  })
}

/** Parent `task` tool calls only spawn subagents; subagent cards already represent that work. */
const HIDDEN_TOOL_NAMES = new Set(["task"])

export function filterVisibleSidebarMessages(messages: SidebarMessage[]) {
  return messages.filter((message) => {
    if (message.kind === "tool") {
      if (HIDDEN_TOOL_NAMES.has(message.toolName))
        return false

      return true
    }

    if (message.content.trim())
      return true

    return message.subagents.length > 0
  })
}

export function getMappedSubagentIds(messages: SidebarMessage[]) {
  const ids = new Set<string>()

  messages.forEach((message) => {
    if (message.kind !== "message")
      return

    message.subagents.forEach(subagent => ids.add(subagent.id))
  })

  return ids
}

export function createSubagentActivityMessage(subagent: SubagentActivity): SidebarTextMessage {
  return {
    key: `subagent:${subagent.id}`,
    kind: "message",
    role: "subagent",
    messageId: "",
    label: "Subagent",
    content: "",
    subagents: [subagent],
  }
}
