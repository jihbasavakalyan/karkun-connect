# KC-0102E — Dashboard Executive Metrics Restoration

**Type:** Enhancement (presentation restoration only)  
**Status:** Complete  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Preserves:** KC-0102A / 0102B / 0102C

## Phase 0 — Intake

| Field | Value |
|-------|-------|
| Request type | **Enhancement** (restore prior executive presentation) |
| Symptom | Post–KC-0109 dashboard simplification removed executive hero KPIs, Collective Overview, and Male/Female Rukn summaries |
| Desired outcome | Restore executive presentation; keep Campaign Health + Today's Mission; keep 0102A/B/C |
| Out of scope | Redesign, new KPIs, repos, Firestore schema/queries, routing, Phase D |

## Phase 1 — Impact Matrix

| Area | Impacted? | Notes |
|------|-----------|-------|
| Admin UI presentation | **Y** | Hero + overview grids |
| Campaign end date seed | **Y** | `mockMissions` + seed backup → `2026-08-02`; optional live `campaigns/campaign-active` field patch |
| Campaign Health / Today's Mission | **N** | Preserved |
| Widget readiness / boundaries | **N** | Reused for restored panels |
| Snapshot coalescing (0102B) | **N** | Preserved |
| Duplicate-read elimination (0102C) | **N** | Preserved |
| Repos / Auth / routing | **N** | Unchanged |

## Phase 2 — Blast Radius

- Presentation-only composition in `AdminMissionControlHero` + `AdminCommandCenter`
- Existing helper `buildAllActiveRuknPerformance()` reused (no new calculations engine)
- Verify scripts updated to expect restored surfaces
- Campaign duration display driven by existing `getActiveCampaign()` / timeline helpers

## Phase 3 — Go / No-Go

**GO** for presentation restore only.

## Implementation summary

1. **Executive Hero** — Campaign Progress ring, Connected / Remaining / Days Left, Momentum track, status line, quick actions; Urdu banner retained.
2. **Collective Overview** — Total Rukns, Assigned, Connected, Pending, Average Progress, Critical.
3. **Male / Female Rukns** — Total, Assigned, Connected, Pending, Connection %, Progress (+ progress indicators).
4. **Campaign Health + Today's Mission** — unchanged order relative to each other; executive blocks inserted above Health.
5. **Campaign end** — seed `2026-08-02` (`18 Jul 2026 → 2 Aug 2026`).

## Regression verification

- `npx vite-node scripts/verify-dashboard-ia-structure.ts`
- `npx vite-node scripts/verify-kc0109-command-center.ts`
- `npx tsc -b --pretty false` (app build)
- Evidence fixtures: `docs/kc-0102e-evidence/`

## Rollback

Revert the KC-0102E commit. If live `campaigns/campaign-active.endDate` was patched, set it back to prior value (`2026-07-26`).
