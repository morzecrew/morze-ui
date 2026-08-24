'use client'

import * as React from 'react'

/**
 * Viewport-width check for layout decisions that CSS cannot make on its own —
 * the sidebar swaps to an overlay sheet rather than restyling in place.
 * Returns false during SSR and the first client render, so hydration matches.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}
