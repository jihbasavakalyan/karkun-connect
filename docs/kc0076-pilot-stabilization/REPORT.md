# KC-007.6 — Rukn Portal Pilot Stabilization

## Part A — Mission Control UX

- Removed Connect / Connected / Record from Mission Control (bottom nav remains the only module navigation).
- Single contextual CTA: Record Visit / Continue Visit / Continue Today's Work.
- Mission summary: Assigned to Me, Visits Today, Registration Pending, Participation in Tarbiyati Programme, Participation in Weekly Ijtema.

## Part B — Interactive controls

**Root cause:** `RuknIjtemaAttendancePanel` used an unstable `connected` array as a `useEffect` dependency, causing a perpetual draft reset / update storm on Home.

**Fix:** Memoize assigned Karkuns with `assignmentVersion`; sync draft only when that list, week, or attendance store version changes.

### Render metrics (6 Home re-renders, no assignment change)

| | Home renders | Panel renders | useEffect runs |
|--|-------------:|--------------:|---------------:|
| **Before** (unstable `connected`) | 6 | 46 | 46 |
| **After** (`useMemo` + `assignmentVersion`) | 6 | 7 | **1** |

## Part C — Connection integrity (ONE KARKUN = ONE ACTIVE RUKN)

- Store guard in `appendAssignment` rejects a second Active row.
- Connect lists exclude Karkuns with any Active assignment (registry + store).
- Connected lists dedupe by `karkunId`.
- Friendly validation: “already connected… Use Transfer to reassign.”

## Verification

```bash
npx vite-node scripts/verify-kc0076-ijtema-render-metrics.ts
npx vite-node scripts/verify-mc-quick-actions.ts
npx vite-node scripts/verify-kc0076-connection-integrity.ts
npx vite-node scripts/verify-kc0076-ijtema-interaction.ts
npx vite-node scripts/verify-inline-assignment.ts
npm run build
```
