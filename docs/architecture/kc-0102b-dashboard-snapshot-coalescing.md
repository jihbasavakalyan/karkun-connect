# KC-0102B — Dashboard Snapshot Coalescing (Phase B)

**Type:** Performance Optimization (render orchestration only)  
**Status:** Complete  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Basis:** [KC-0101.1](./kc-0101-1-bootstrap-timing-certification.md) Phase B · [KC-0102A](./kc-0102a-dashboard-readiness-ux.md)  
**Measurement export:** `production-data/exports/kc0101-1-bootstrap-timing-latest.json` (re-run after Phase B)

---

## KC-ARCH-009 — Phases 0–3 + Go/No-Go

### Phase 0

| Field | Value |
|-------|-------|
| Request type | **Performance Optimization** |
| Root cause | Multi-store publish fan-out invalidated command-center cache once per store during hydrate |
| Evidence | KC-0101.1 Admin **3** builds / Rukn **2** builds; 9 subscriptions in `useCampaignAutomationEngine` |
| Out of scope | Firestore, repos, auth, Phase C/D |

### Impact Matrix

| Area | Impacted? |
|------|-----------|
| Hooks / dashboard render orchestration | Y |
| Services / Repos / Firestore / Auth / schema | N |
| KC-0102A widget readiness | Preserved |

### Phase 1 — Regression risk

| Risk | Mitigation |
|------|------------|
| Stale metrics during coalesce | Trailing **200ms only while `!isBackgroundHydrationReady()`**; steady-state microtask |
| Fake zeros | Shell snapshot until first store publication; critical metrics still gated by KC-0102A `metricsReady` |
| Missing updates | Pending flag always flushed; hot-nav seed bump when already hydrated |

### Phase 2–3

Implemented coalescing + measured via bootstrap timing capture. Unit tests for coalescer pass.

### Go / No-Go

| Decision | Status |
|----------|--------|
| Phase B coding | **GO** (done) |
| Phase C / D | **NO-GO** this ticket |

### Phase 4–5

| Check | Result |
|-------|--------|
| No Firestore/repo/auth changes | Pass |
| Dashboard content / readiness | Pass (Phase A intact) |
| Deploy certification | **READY WITH KNOWN LIMITATIONS** — late post-hydrate publication may still add a second build (≤2 target met) |

---

## 1. Snapshot coalescing summary

**Problem:** During critical + background store rebuild, each store `notify()` immediately invalidated the automation snapshot cache and bumped React state → multiple `commandCenter.snapshot.build` calls for one logical hydrate.

**Solution (orchestration only):**

1. **`createCoalescedNotifier`** — microtask batch + optional trailing quiet window.  
2. **`useCampaignAutomationEngine`** — all 9 store subscriptions share one coalesced flush; trailing **200ms** while background hydrate is pending (merges critical→background storms); **0ms** after background ready.  
3. **Shell snapshot** until first coalesced publication — avoids a wasted full build on pre-hydrate mount.  
4. **Widget / version ticks** coalesced (assignment, guidance, Admin Command Center / Hero module ticks, Rukn execution widgets) so multi-store storms do not N-bump local React state.

No business logic, queries, repositories, auth, or readiness contract changes.

---

## 2. Before vs after — dashboard build counts

| Portal | KC-0101.1 baseline | After KC-0102B | Δ |
|--------|--------------------|----------------|---|
| **Admin** `commandCenter.snapshot.build` | **3** | **2** | −1 (−33%) |
| **Rukn** `commandCenter.snapshot.build` | **2** | **2** | 0 (already at ≤2) |

Admin build times (after): `3062ms`, `4361ms` (lifecycle `t`).  
Rukn build times (after): `2432ms`, `2867ms`.

Phase B target **≤1–2 builds**: **met** for both portals.

---

## 3. Before vs after — command-center recomputations

| Signal | Baseline (0101.1) | After 0102B |
|--------|-------------------|-------------|
| Admin builds (full recompute) | 3 | **2** |
| Admin cache hits | 7 | 2 (fewer thrash cycles) |
| Admin `coalesce_flush` | n/a | **2** (many store notifies → 2 publications) |
| Rukn builds | 2 | **2** |
| Rukn `coalesce_flush` | n/a | **2** |

Interpretation: hydrate store storms no longer map 1:1 to snapshot builds; flushes represent logical publications.

---

## 4. Before vs after — widget recomputation

| Area | Before | After |
|------|--------|-------|
| Admin Command Center `moduleTick` | Up to 5 setStates per hydrate storm | **1** coalesced tick per storm |
| Admin Hero `complianceTick` | Up to 4 setStates per storm | **1** coalesced tick |
| `useAssignmentEngine` / `useGuidance` | Per-store version bumps | **1** coalesced version bump |
| Rukn execution widgets (progress / matrix / focus / summary) | 3 setStates per storm | **1** coalesced tick |

Exact React render counts are not instrumented in production; tick coalescing is the measurable proxy.

---

## 5. Files modified

| File | Change |
|------|--------|
| `src/lib/dashboard/coalesceStoreNotifications.ts` | **New** coalescer |
| `src/lib/dashboard/coalesceStoreNotifications.test.ts` | **New** unit tests |
| `src/hooks/useCampaignAutomationEngine.ts` | Coalesce + shell deferral |
| `src/hooks/useAssignmentEngine.ts` | Coalesce version bumps |
| `src/hooks/useGuidance.ts` | Coalesce version bumps |
| `src/components/mission-control/AdminCommandCenter.tsx` | Coalesce module ticks |
| `src/components/mission-control/AdminMissionControlHero.tsx` | Coalesce compliance ticks |
| `src/components/execution/CampaignExecutionProgressCard.tsx` | Coalesce ticks |
| `src/components/execution/CampaignExecutionMatrix.tsx` | Coalesce ticks |
| `src/components/execution/RuknTodaysFocus.tsx` | Coalesce ticks |
| `src/components/execution/RuknExecutionSummaryCards.tsx` | Coalesce ticks |
| `src/components/execution/AdminExecutionSummaryWidgets.tsx` | Coalesce ticks |
| `src/components/execution/ConnectionQuickActionsPanel.tsx` | Coalesce ticks |
| `docs/architecture/kc-0102b-dashboard-snapshot-coalescing.md` | This report |
| `docs/architecture/index.md` | Link |

---

## 6. Regression verification

| Check | Result |
|-------|--------|
| Coalescer unit tests | Pass (3) |
| Typecheck | Pass |
| Firestore / repository / auth / permissions | Unchanged |
| KC-0102A readiness gates | Intact (`metricsReady` / `backgroundReady` / Rukn progressive shell) |
| Anti fake-zero | Intact (shell + hydrate gates; no fabricated connection values as ready) |
| Stale / missing updates | Trailing only during startup background gap; steady-state microtask |
| Phase C/D | Not started |

---

## 7. Updated performance observations

- Admin cold-load **dashboard.rendered** in this re-run ~**3052ms** (faster than 0101.1’s ~7504ms — environment variance; not claimed as Phase B sole cause).  
- Critical→background still nearly co-timed; **200ms trailing** successfully merges those store rebuilds into **one** coalesce flush.  
- A **second** flush after background ready remains (likely snapshot-listener / late store publish). That is acceptable within ≤2 builds; eliminating it would touch repository snapshot lifecycle (out of scope).  
- Progressive rendering from Phase A remains: widgets still unlock independently; coalescing only reduces redundant recomputes.

---

## Stop line

**Phase B complete.** Do not implement Phase C (duplicate read elimination) or Phase D (query shaping) in this ticket.
