import { useState, useEffect, useRef, useCallback } from "react"

/**
 * useSpotlightRect — Returns a live DOMRect for the element with
 * data-tutorial-id="<id>", updated on resize/scroll/mutation.
 * Returns null when the element cannot be found after a grace period.
 */
export function useSpotlightRect(tutorialId: string | null, padding = 10) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [notFound, setNotFound] = useState(false)
  const rafRef = useRef<number | null>(null)
  const notFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const measure = useCallback(() => {
    if (!tutorialId) {
      setRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tutorialId}"]`)
    if (!el) return

    const r = el.getBoundingClientRect()
    // Expand by padding
    const padded = new DOMRect(
      r.left - padding,
      r.top - padding,
      r.width + padding * 2,
      r.height + padding * 2
    )
    setRect(padded)
    setNotFound(false)
    if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current)
  }, [tutorialId, padding])

  useEffect(() => {
    if (!tutorialId) {
      setRect(null)
      setNotFound(false)
      return
    }

    setRect(null)
    setNotFound(false)

    // Immediately try to measure
    const tryMeasure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tutorialId}"]`)
      if (el) {
        measure()
        // Set up ResizeObserver on the found element
        if (observerRef.current) observerRef.current.disconnect()
        observerRef.current = new ResizeObserver(() => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(measure)
        })
        observerRef.current.observe(el)
        observerRef.current.observe(document.documentElement)
        if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current)
      }
    }

    // Grace period: poll every 100ms for up to 2.5s for the element to appear
    let attempts = 0
    const MAX_ATTEMPTS = 25
    const pollInterval = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tutorialId}"]`)
      if (el) {
        clearInterval(pollInterval)
        tryMeasure()
      } else {
        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollInterval)
          setNotFound(true)
        }
      }
    }, 100)

    // Scroll listener
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener("scroll", onScroll, { capture: true } as any)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current)
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [tutorialId, measure])

  // Re-measure on window resize
  useEffect(() => {
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [measure])

  return { rect, notFound }
}
