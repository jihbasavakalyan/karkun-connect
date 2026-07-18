/**
 * KC-027D — React.lazy wrapper that recovers once from stale deployment chunks.
 *
 * After a Vercel deploy, an open tab may still hold an old parent bundle that
 * references a deleted hashed chunk. Missing /assets/* can also be rewritten to
 * index.html (200 HTML), which surfaces as:
 *   TypeError: Failed to fetch dynamically imported module
 *
 * Recovery: one sessionStorage-guarded full reload, then rethrow to the boundary.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_KEY = 'kc027d.chunkReload'

function isDynamicImportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|Loading chunk [\d]+ failed|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches React.lazy factory typing
export function lazyWithChunkReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory()
      try {
        sessionStorage.removeItem(RELOAD_KEY)
      } catch {
        // private mode / quota
      }
      return module
    } catch (error) {
      if (typeof window !== 'undefined' && isDynamicImportFailure(error)) {
        let alreadyReloaded = false
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
        } catch {
          alreadyReloaded = false
        }

        if (!alreadyReloaded) {
          try {
            sessionStorage.setItem(RELOAD_KEY, '1')
          } catch {
            // still attempt a single reload
          }
          window.location.reload()
          // Suspend forever while the document unloads — avoid ErrorBoundary flash.
          return new Promise(() => {})
        }
      }
      throw error
    }
  })
}
