import { reactive } from "vue"

const storageKey = "slidev-agent:ui"

function readInitialState() {
  if (typeof window === "undefined")
    return { isOpen: false }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw)
      return { isOpen: false }

    const parsed = JSON.parse(raw)
    return {
      isOpen: Boolean(parsed.isOpen),
    }
  }
  catch {
    return { isOpen: false }
  }
}

export const slidevAgentUiState = reactive(readInitialState())

export function setSlidevAgentOpen(nextValue: boolean) {
  slidevAgentUiState.isOpen = nextValue

  if (typeof window === "undefined")
    return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      isOpen: slidevAgentUiState.isOpen,
    }))
  }
  catch {
    // Ignore storage failures so the sidebar still works.
  }
}

export function toggleSlidevAgent() {
  setSlidevAgentOpen(!slidevAgentUiState.isOpen)
}
