/**
 * KC-016 — Scroll to top on route change (presentation only).
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const target = id ? document.getElementById(id) : null
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }

    window.scrollTo({ top: 0, left: 0 })
  }, [pathname, search, hash])

  return null
}
