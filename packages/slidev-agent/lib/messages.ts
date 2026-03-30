function stringifyContentPart(part: unknown): string {
  if (typeof part === "string")
    return part

  if (part && typeof part === "object") {
    const maybeText = Reflect.get(part, "text")
    if (typeof maybeText === "string")
      return maybeText

    const maybeType = Reflect.get(part, "type")
    if (maybeType === "tool_call")
      return "[Tool call]"

    if (maybeType === "tool_result")
      return "[Tool result]"
  }

  return ""
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
