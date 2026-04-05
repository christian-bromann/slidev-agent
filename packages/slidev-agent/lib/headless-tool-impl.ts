import { nextTick, unref } from "vue"

import { slidevGoToSlide as slidevGoToSlideDefinition } from "./headless-tools"

type SlidevNavAdapter = {
  go: (page: number) => void | Promise<void>
  currentPage: unknown
}

export function createSlidevHeadlessTools(nav: SlidevNavAdapter) {
  const slidevGoToSlide = slidevGoToSlideDefinition.implement(async ({ page, reason }) => {
    await Promise.resolve(nav.go(page))
    await nextTick()

    const currentPage = Number(unref(nav.currentPage)) || page

    return {
      success: currentPage === page,
      page,
      currentPage,
      reason: reason || undefined,
    }
  })

  return [slidevGoToSlide]
}
