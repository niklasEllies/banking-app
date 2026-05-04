import { useRef, useState, useCallback } from 'react'

interface SheetSwipeConfig {
  onDismiss: () => void
  enabled?: boolean
  threshold?: number
}

/**
 * Split-zone touch handling for a swipe-to-dismiss BottomSheet.
 *
 * - `handleProps` go on the visible drag handle / header area: pulling down here
 *   ALWAYS tracks the gesture and dismisses past `threshold` (default 80px).
 * - `contentProps` go on the scrollable content. The gesture is only "armed"
 *   when `scrollTop === 0` at touchstart, and is released the moment the user
 *   actually scrolls up — so swiping doesn't fight native scroll.
 *
 * Returns a live `dragY` value (>= 0) that callers can apply as a translateY
 * on the sheet for visual feedback during the drag.
 */
export function useSheetSwipe({ onDismiss, enabled = true, threshold = 80 }: SheetSwipeConfig) {
  const startYRef = useRef<number | null>(null)
  const armedFromContentRef = useRef(false)
  const contentElRef = useRef<HTMLElement | null>(null)
  const [dragY, setDragY] = useState(0)

  const reset = useCallback(() => {
    startYRef.current = null
    armedFromContentRef.current = false
    setDragY(0)
  }, [])

  // ---- Handle (always-armed) handlers ----
  const handleHandleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    startYRef.current = e.touches[0].clientY
    armedFromContentRef.current = false
  }, [enabled])

  const handleHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }, [])

  const handleHandleTouchEnd = useCallback(() => {
    if (dragY > threshold) onDismiss()
    reset()
  }, [dragY, threshold, onDismiss, reset])

  // ---- Content (scroll-aware) handlers ----
  const setContentRef = useCallback((el: HTMLElement | null) => {
    contentElRef.current = el
  }, [])

  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const el = contentElRef.current
    if (el && el.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
      armedFromContentRef.current = true
    } else {
      // User starts at scrolled position → don't intercept; native scroll wins.
      startYRef.current = null
      armedFromContentRef.current = false
    }
  }, [enabled])

  const handleContentTouchMove = useCallback((e: React.TouchEvent) => {
    if (!armedFromContentRef.current || startYRef.current === null) return
    const el = contentElRef.current
    // If user has scrolled at all since touchstart, abandon dismiss.
    if (el && el.scrollTop > 0) {
      startYRef.current = null
      armedFromContentRef.current = false
      setDragY(0)
      return
    }
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }, [])

  const handleContentTouchEnd = useCallback(() => {
    if (armedFromContentRef.current && dragY > threshold) onDismiss()
    reset()
  }, [dragY, threshold, onDismiss, reset])

  return {
    dragY,
    handleProps: {
      onTouchStart: handleHandleTouchStart,
      onTouchMove: handleHandleTouchMove,
      onTouchEnd: handleHandleTouchEnd,
    },
    contentProps: {
      ref: setContentRef as (el: HTMLDivElement | null) => void,
      onTouchStart: handleContentTouchStart,
      onTouchMove: handleContentTouchMove,
      onTouchEnd: handleContentTouchEnd,
    },
  }
}
