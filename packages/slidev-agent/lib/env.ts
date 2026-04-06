export function env(
  source: Record<string, unknown>,
  name: string,
): string | undefined
export function env<Fallback extends string>(
  source: Record<string, unknown>,
  name: string,
  fallback: Fallback,
): string | Fallback
export function env(
  source: Record<string, unknown>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = source[name]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

const globalEnv = "process" in globalThis ? globalThis.process.env : import.meta.env
const anthropicEnv = env(globalEnv, "ANTHROPIC_API_KEY")
const googleEnv = env(globalEnv, "GOOGLE_API_KEY")
const openaiEnv = env(globalEnv, "OPENAI_API_KEY")

export const model = env(globalEnv, "SLIDEV_AGENT_MODEL") ?? (
  anthropicEnv
    ? "anthropic:claude-sonnet-4-6"
    : googleEnv
      ? "google:gemini-2.5-flash"
      : openaiEnv
        ? "openai:gpt-5.4"
        : undefined
)