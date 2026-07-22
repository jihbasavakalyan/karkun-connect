/** KC-0078 — Lightweight route chunk loading placeholder. */
export function RoutePageFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center px-4"
      aria-busy="true"
      aria-label="Loading page"
    >
      <p className="text-sm text-secondary">Loading…</p>
    </div>
  )
}
