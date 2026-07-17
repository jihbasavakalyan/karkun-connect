# P1 Rukn Dashboard Interaction — Root Cause

**Status:** Proven (do not implement yet per investigation rules)

## 1. Shared root cause

`RuknIjtemaAttendancePanel` always mounts on Rukn Home and runs:

```ts
const connected = getAssignedKarkunanForRukn(ruknId) // new array every render
useEffect(() => {
  setDraft(...)
  setRemarks(...)
  setMessage('')
}, [connected, weekEndingDate])
```

`getAssignedKarkunanForRukn` returns a **new array reference on every call** (`sameReferenceAcrossCalls: false` even when empty).

That makes the effect fire after every render → `setDraft`/`setRemarks` with new object literals → another render → **perpetual update loop** on `/rukn`.

Effects:

| Surface | Why it looks dead |
|--------|-------------------|
| Present / Absent / Excused | Selection is wiped on the next effect cycle |
| Mission Control actions + KPI cards | Same Home tree competes with continuous React updates; in-flow controls stop responding reliably |
| Bottom nav / header Logout / FABs | Live **outside** that panel’s update storm (`RuknLayout` chrome / `position: fixed`) |

Not a shared `DashboardCard` / `Button` base. Not a global `pointer-events` overlay. KPI cards already use `<Link>` (same mechanism as working FAB links), so a Link/NavLink swap is **not** the shared root cause.

## 2. Exact files responsible

1. `src/components/home/RuknIjtemaAttendancePanel.tsx` — unstable `connected` in effect deps + unconditional `setDraft`/`setRemarks`
2. `src/lib/assignmentEngine.ts` — `getAssignedKarkunanForRukn` always allocates a new array
3. `src/pages/rukn/RuknHomePage.tsx` — always mounts the panel (so the loop is on every Home visit)

## 3. Smallest possible fix (propose only)

In `RuknIjtemaAttendancePanel.tsx` only:

- Stabilize the list, e.g. `useMemo(() => getAssignedKarkunanForRukn(ruknId), [ruknId, assignmentVersion])` using `assignmentVersion` from `useAssignmentEngine()`, **or**
- Change effect deps to a stable key such as `weekEndingDate` + joined karkun ids (and only sync when that key changes).

Do not redesign MC/KPI components; do not convert them to Link as the primary fix.

## 4. Confidence

**High (Ijtema chips + Home update loop).**  
**Medium–High (MC / KPI non-response as cascade of that loop).**  
Overlay / empty-handler theories were checked and not supported; KPI already has `href`.

## Evidence

- `docs/p1-interaction-proof/evidence.json` — array identity unstable
- Mount harness: continuous React update/`act` warnings from `RuknIjtemaAttendancePanel` alone
