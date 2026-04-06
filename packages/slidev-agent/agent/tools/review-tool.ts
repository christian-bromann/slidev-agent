import path from "node:path"
import { fileURLToPath } from "node:url"
import { readFile, realpath, stat } from "node:fs/promises"

import { initChatModel, tool } from "langchain"
import { z } from "zod"

import { model } from "../../lib/env.js"

const slidevReviewScreenshotSchema = z.object({
  imagePath: z.string().min(1).describe("Path to the exported PNG screenshot file. Use a path inside the project root, for example `.slidev-agent-artifacts/verify-5/1.png`."),
  slideIndex: z.number().int().positive().optional().describe("Optional 1-based slide index represented by the screenshot."),
  focus: z.string().optional().describe("Optional short note about what to scrutinize most closely."),
})

const slidevReviewScreenshotResultSchema = z.object({
  pass: z.boolean().describe("Whether the slide looks presentation-ready in the screenshot."),
  summary: z.string().describe("Short visual verdict."),
  issues: z.array(z.string()).describe("Concrete visual problems found in the screenshot."),
  suggestions: z.array(z.string()).describe("Targeted improvements to address the issues."),
})

function isWithinRoot(rootDir: string, candidatePath: string) {
  return candidatePath === rootDir || candidatePath.startsWith(`${rootDir}${path.sep}`)
}

function normalizeImagePathInput(imagePath: string) {
  const trimmed = imagePath.trim()
  if (!trimmed)
    return trimmed

  if (trimmed.startsWith("file://"))
    return fileURLToPath(trimmed)

  return trimmed
}

async function resolveImagePath(rootDir: string, imagePath: string) {
  const absoluteRoot = path.resolve(rootDir)
  const normalizedImagePath = normalizeImagePathInput(imagePath)
  const resolved = path.isAbsolute(normalizedImagePath)
    ? path.resolve(normalizedImagePath)
    : path.resolve(absoluteRoot, normalizedImagePath)

  if (resolved === absoluteRoot)
    throw new Error("Screenshot path must point to an image file, not the project root.")

  if (isWithinRoot(absoluteRoot, resolved))
    return resolved

  const [realRoot, realResolved] = await Promise.all([
    realpath(absoluteRoot).catch(() => absoluteRoot),
    realpath(resolved).catch(() => resolved),
  ])

  if (!isWithinRoot(realRoot, realResolved)) {
    throw new Error(
      `Screenshot path must stay within the project root (${absoluteRoot}). Export the PNG into a project-local folder such as ".slidev-agent-artifacts/verify-<slideIndex>" and pass that PNG file path to slidev_review_screenshot.`,
    )
  }

  return realResolved
}

function isPngBuffer(fileBuffer: Buffer) {
  return fileBuffer.length >= 8
    && fileBuffer[0] === 0x89
    && fileBuffer[1] === 0x50
    && fileBuffer[2] === 0x4E
    && fileBuffer[3] === 0x47
    && fileBuffer[4] === 0x0D
    && fileBuffer[5] === 0x0A
    && fileBuffer[6] === 0x1A
    && fileBuffer[7] === 0x0A
}

export function createSlidevReviewScreenshotTool(rootDir: string) {
  return tool(async ({ imagePath, slideIndex, focus }) => {
    const resolvedImagePath = await resolveImagePath(rootDir, imagePath)
    const fileInfo = await stat(resolvedImagePath).catch(() => null)
    if (!fileInfo?.isFile())
      throw new Error(`Screenshot not found: ${imagePath}`)

    const imageBuffer = await readFile(resolvedImagePath)
    if (path.extname(resolvedImagePath).toLowerCase() !== ".png") {
      throw new Error(
        `slidev_review_screenshot only accepts PNG files. Got: ${path.extname(resolvedImagePath) || "unknown"}`,
      )
    }

    if (!isPngBuffer(imageBuffer))
      throw new Error(`slidev_review_screenshot expected a real PNG file at: ${imagePath}`)

    const imageData = imageBuffer.toString("base64")
    const reviewModel = await initChatModel(model, {
      temperature: 0,
    })
    const structuredReviewer = reviewModel.withStructuredOutput(slidevReviewScreenshotResultSchema)

    const review = await structuredReviewer.invoke([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Review this rendered Slidev slide screenshot${slideIndex ? ` for slide ${slideIndex}` : ""}.`,
              "Judge only what is visible in the image. Do not guess about hidden or source markdown content.",
              "Mark the slide as failing if you notice clipped or off-screen content, overflow, cramped layout, collisions, unreadable or tiny text, broken wrapping, poor contrast, or obvious alignment problems.",
              "Only pass the slide if it looks presentation-ready.",
              focus ? `Pay extra attention to: ${focus}` : "",
              "Return concise structured output.",
            ].filter(Boolean).join("\n"),
          },
          {
            type: "image",
            source_type: "base64",
            data: imageData,
            mimeType: "image/png",
            mime_type: "image/png",
          },
        ],
      },
    ])

    return {
      ...review,
      imagePath: path.relative(rootDir, resolvedImagePath) || path.basename(resolvedImagePath),
      slideIndex: slideIndex || null,
    }
  }, {
    name: "slidev_review_screenshot",
    description: "Review an exported PNG slide screenshot with a multimodal model and report visual issues such as clipping, overflow, collisions, poor contrast, and unreadable text.",
    schema: slidevReviewScreenshotSchema,
  })
}
