import DOMPurify from "dompurify"
import { marked } from "marked"

marked.setOptions({
  gfm: true,
  breaks: true,
})

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank")
    node.setAttribute("rel", "noopener noreferrer")
  }
})

export function renderChatMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(html)
}
