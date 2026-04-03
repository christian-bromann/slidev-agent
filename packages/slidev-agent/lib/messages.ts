function stringifyContentPart(part: unknown): string {
  if (typeof part === "string")
    return part

  if (part && typeof part === "object") {
    const maybeText = Reflect.get(part, "text")
    if (typeof maybeText === "string")
      return maybeText

    const maybeType = Reflect.get(part, "type")
    if (maybeType === "tool_call" || maybeType === "tool_result")
      return ""
  }

  return ""
}

type MessageToolCall = {
  id: string
  name: string
  args?: unknown
}

function parseToolCallLike(value: unknown): MessageToolCall | null {
  if (!value || typeof value !== "object")
    return null

  const directId = Reflect.get(value, "id")
  const nestedFunction = Reflect.get(value, "function")
  const nestedId = Reflect.get(value, "tool_call_id")
  const directName = Reflect.get(value, "name")
  const nestedName = nestedFunction && typeof nestedFunction === "object"
    ? Reflect.get(nestedFunction, "name")
    : undefined
  const directArgs = Reflect.get(value, "args")
  const nestedArgs = nestedFunction && typeof nestedFunction === "object"
    ? Reflect.get(nestedFunction, "arguments")
    : undefined

  const id = typeof directId === "string"
    ? directId
    : typeof nestedId === "string"
      ? nestedId
      : ""
  const name = typeof directName === "string"
    ? directName
    : typeof nestedName === "string"
      ? nestedName
      : ""
  const args = directArgs ?? nestedArgs

  if (!id && !name)
    return null

  return { id, name, args }
}

export function getMessageRole(message: unknown): string {
  if (message && typeof message === "object") {
    const getType = Reflect.get(message, "getType")
    if (typeof getType === "function")
      return String(getType.call(message))

    const type = Reflect.get(message, "type")
    if (typeof type === "string")
      return type
  }

  return "assistant"
}

export function getMessageContent(message: unknown): string {
  if (!message || typeof message !== "object")
    return ""

  const content = Reflect.get(message, "content")
  if (typeof content === "string")
    return content

  if (Array.isArray(content))
    return content.map(stringifyContentPart).filter(Boolean).join("\n\n")

  return ""
}

export function getMessageToolCalls(message: unknown): MessageToolCall[] {
  if (!message || typeof message !== "object")
    return []

  const toolCalls: MessageToolCall[] = []
  const seen = new Set<string>()
  const content = Reflect.get(message, "content")

  if (Array.isArray(content)) {
    content.forEach((part) => {
      if (!part || typeof part !== "object" || Reflect.get(part, "type") !== "tool_call")
        return

      const toolCall = parseToolCallLike(part)
      if (!toolCall)
        return

      const key = toolCall.id || `${toolCall.name}:${JSON.stringify(toolCall.args ?? "")}`
      if (seen.has(key))
        return

      seen.add(key)
      toolCalls.push(toolCall)
    })
  }

  const kwargs = Reflect.get(message, "additional_kwargs")
  const nestedToolCalls = kwargs && typeof kwargs === "object"
    ? Reflect.get(kwargs, "tool_calls")
    : undefined

  if (Array.isArray(nestedToolCalls)) {
    nestedToolCalls.forEach((entry) => {
      const toolCall = parseToolCallLike(entry)
      if (!toolCall)
        return

      const key = toolCall.id || `${toolCall.name}:${JSON.stringify(toolCall.args ?? "")}`
      if (seen.has(key))
        return

      seen.add(key)
      toolCalls.push(toolCall)
    })
  }

  return toolCalls
}

export function getMessageToolName(message: unknown): string {
  if (!message || typeof message !== "object")
    return ""

  const directName = Reflect.get(message, "name")
  if (typeof directName === "string")
    return directName

  const kwargs = Reflect.get(message, "additional_kwargs")
  if (kwargs && typeof kwargs === "object") {
    const nestedName = Reflect.get(kwargs, "name")
    if (typeof nestedName === "string")
      return nestedName
  }

  return ""
}

export function getMessageToolCallId(message: unknown): string {
  if (!message || typeof message !== "object")
    return ""

  const directId = Reflect.get(message, "tool_call_id")
  if (typeof directId === "string")
    return directId

  const kwargs = Reflect.get(message, "additional_kwargs")
  if (kwargs && typeof kwargs === "object") {
    const nestedId = Reflect.get(kwargs, "tool_call_id")
    if (typeof nestedId === "string")
      return nestedId
  }

  return ""
}
