/**
 * KC-016 — Track on-screen keyboard inset for sticky form actions.
 * Sets --keyboard-inset on :root (presentation only).
 */

import { useEffect } from 'react'

export function useKeyboardInset() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const root = document.documentElement
    const sync = () => {
      const viewport = window.visualViewport
      if (!viewport) return
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`)
    }

    sync()
    window.visualViewport.addEventListener('resize', sync)
    window.visualViewport.addEventListener('scroll', sync)
    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      root.style.removeProperty('--keyboard-inset')
    }
  }, [])
}
