# KC-0127 — KC-ARCH-009 Gate (Admin Command Center)

**Classification:** Enhancement (presentation / workflow UX) + Bug Fix (Monthly Baitul Maal batch UX)  
**Standards:** KC-ARCH-001 · KC-ARCH-009

## Phase 0 — Impact

- Admin Dashboard IA: Next Actions, Attention Required, Campaign Progress, Quick Actions.
- Registry deep-links via existing filter values (URL sync only).
- Rukn Monthly Baitul Maal: remove all-or-nothing submit; use existing single-mark write path.

No Firestore schema, repository, API, auth, or campaign calculation changes.

## Phase 1 — Regression risk

| Domain | Risk |
|--------|------|
| Persistence / Firestore / repos | N/A — reuse `updateMonthlyBaitulMaalContribution` / upsert |
| Campaign arithmetic | N/A — reuse existing achievement / health / KPI builders |
| Auth | N/A |
| UI / navigation | LOW — new panels + filter URL hydration |

## Phase 2 — Plan

1. Presentation builders for Next Actions + Attention Required (existing counts).
2. Campaign Progress panel from `buildAdminCampaignAchievementProgress`.
3. Sticky Quick Actions using existing routes.
4. Registry query-param sync for dashboard deep links.
5. Rukn BM page: per-person save; incremental copy.

## Phase 3 — Verification

Scoped lint · `tsc -b` · `npm run build` · production smoke of Admin Dashboard + BM page.

## Go / No-Go

Proceed — workflow efficiency and presentation only; single-person BM write already exists.
