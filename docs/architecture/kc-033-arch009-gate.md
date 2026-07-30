# KC-033 — KC-ARCH-009 Gate (Operations Truth Convergence)

**Classification:** Refactor (architectural convergence — metric truth)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Request type:** Refactor  
**Nature:** No new user-facing features; no UI redesign; no Firestore schema changes unless strictly required to remove duplicate truth sources.

## Phase 0 — Root cause & impact

**Root cause (proven):** Architecture — dual Weekly Ijtema and Monthly Baitul Maal readers plus annexure-averaged “Campaign Health” still feed Automation, Cos strips, Rafeeq voice/secretary, and some mission-control builders, while Dashboard Health already uses event/cycle KPIs via `dashboardMetricsService` (KC-0110/0111/0112 deferred TODOs; KC-032 TD-01–03/15).

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / pages / routing | N | No redesign; consumers keep same surfaces |
| Hooks | Possibly Y | Only if a hook re-exports legacy metrics |
| Services / lib | Y | Automation, mission-control, Cos, Rafeeq ops answers, turnMetricsCache → canonical providers |
| Dashboard presentation | Y (read path only) | Hero/automation healthScore → four-slice Health; formulas unchanged |
| Repositories / Firestore / schema | N | Dual-write retention until explicit durability ticket |
| Auth / session / bootstrap | N | — |
| Campaign Health formulas | N | Canonical four-slice math preserved |
| Persistence write paths | N | Write adapters unchanged |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Dashboard Health panel | LOW | Already canonical; do not change formulas |
| Automation queues / reminders | MEDIUM | Counts may shift from legacy week/month docs to event/cycle KPIs — **intended truth** |
| Rafeeq briefing | LOW–MED | Prefer Health slices already in cache; drop legacy footguns |
| Cos communication context | MEDIUM | Status strings from adapters vs legacy |
| Dual-write / Excused / historical | LOW | Keep compatibility shims; do not delete Firestore docs |
| Auth / repos / Firestore | N/A | Unchanged |

### HIGH items

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Automation compliance pending counts | Switch SoR | Mission/reminders may change | Use same KPI as Health/Mission (`ruknsPending`) | `verify:automation` + WI/BM verifies | Revert engine imports |

Not Configuration/Infrastructure/Data/Ops-only — **software architecture debt**. Proceed with code.

## Phase 2 — Implementation plan

1. Document ARCH-009 gate (this file) + start canonical metric registry.
2. Rewire `campaignAutomationEngine` IJ/BM/healthScore to `dashboardMetricsService` / event-cycle KPIs / adapters.
3. Rewire mission-control Cos strips (`buildAdminMissionControl`, overview consumers used for production decisions, Rukn mission control) to canonical metrics; quarantine annexure overall as non-Health.
4. Rewire Rafeeq/Cos deferred readers: `turnMetricsCache`, `opsAnswers`, `buildPersonSecretaryReport`, `communicationContext`, `relationshipIntelligencePresentation`, achievement builders where they still call legacy helpers for IJ/BM.
5. Quarantine `getCampaignHealthFromAnnexure1` / legacy dashboard metric helpers — mark non-canonical; stop production decision paths.
6. Add `verify:kc0107` / `verify:kc0108` to package.json; refresh/retire obsolete verifies if needed.
7. Architecture docs: registry, removed paths, remaining shims, KC-0110/0111/0112 tracker updates.

**Order:** gate → registry stub → automation → mission-control → Rafeeq/Cos → quarantine annotations → verifies → docs.  
**Rollback:** Revert consumer rewires; adapters/KPIs unchanged.  
**Success:** One canonical provider per Connections/Visits/WI/BM/App/Health; KC0107/0108 pass; tsc clean.

## Phase 3 — Verification

- `npm run verify:kc0107`, `verify:kc0108`
- `npm run verify:automation`, `verify:reliability` (smoke), `verify:kc0101b` if Health contract touched
- TypeScript build / typecheck clean
- Grep audit: production decision paths must not call `getIjtemaAttendanceDashboardMetrics` / `getBaitulMaalDashboardMetrics` / `getCampaignHealthFromAnnexure1` for Health/pending KPIs (adapter internals + dual-write + Excused OK)

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES — dual readers + legacy Health (KC-032 / KC-0110–0112) |
| Software problem? | YES |
| Config / ops / data-only? | NO |
| Bootstrap / auth / repos / Firestore schema? | NO |
| Dashboard Health formula change? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit (post-implementation)

Workflows / contracts exercised:

- `npm run verify:kc0107`
- `npm run verify:kc0108`
- `npm run verify:kc-033`
- `npm run verify:automation`
- `npm run typecheck`

No Firestore schema, auth, bootstrap, or Campaign Health formula changes.

## Phase 5 — Certification

| Field | Value |
|-------|-------|
| Certification | **READY** |
| Known limitations | Dual-write + Excused/Exempt legacy fallback retained inside adapters; Recovery Center / Meta Cloud still out of scope |

## Phase 6 — Post-deploy

Record Admin/Rukn Campaign Health vs WI/BM module consistency after deploy (expected: same event/cycle SoR; Health uses assigned denom; reports may use marked-only %).
