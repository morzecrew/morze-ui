/**
 * `new ResizeObserver(…)` behind a guard. jsdom has no ResizeObserver, and a
 * component that constructs one unguarded throws on mount there — before a
 * test's first assertion, and in every host's test suite (#10). Without one
 * the component just never re-measures, which is all a DOM without layout
 * could have told it anyway. Returns the disconnect.
 */
export function observeResize(
  element: Element,
  callback: (entries: ResizeObserverEntry[]) => void
): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {}
  const observer = new ResizeObserver(callback)
  observer.observe(element)
  return () => observer.disconnect()
}
