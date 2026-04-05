import { tool } from "langchain"
import { z } from "zod"

export const slidevGoToSlide = tool({
  name: "slidev_go_to_slide",
  description: "Navigate the active Slidev presentation in the user's browser to a specific 1-based slide number. Use this after creating a new slide when you know its final index.",
  schema: z.object({
    page: z.number().int().positive().describe("The 1-based Slidev page number to open."),
    reason: z.string().optional().describe("Optional short explanation for the navigation."),
  }),
})
