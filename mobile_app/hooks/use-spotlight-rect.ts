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

    // Immediately try to measure without waiting for the polling loop
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
        return true
      }
      return false
    }

    // Run immediate measurement pass
    const foundImmediately = tryMeasure()
    if (foundImmediately) return

    // Grace period fallback: poll only if element was not immediately found
    let attempts = 0
    const MAX_ATTEMPTS = 25
    const pollInterval = setInterval(() => {
      if (tryMeasure()) {
        clearInterval(pollInterval)
      } else {
        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollInterval)
          setNotFound(true)
        }
      }
    }, 50)

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

  // Re-measure on window resize with requestAnimationFrame throttling
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(measure)
      }, 80)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [measure])

  return { rect, notFound }
}
