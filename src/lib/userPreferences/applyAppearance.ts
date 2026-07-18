/**
 * KC-026 — Apply appearance preference to the document root.
 */

import type { AppearanceMode } from '@/types/userPreferences.types'

function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyAppearanceMode(mode: AppearanceMode): void {
  if (typeof document === 'undefined') return
  const resolved = mode === 'system' ? resolveSystemTheme() : mode
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.appearancePreference = mode
  document.documentElement.style.colorScheme = resolved
}
