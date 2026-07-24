# KC-0102A — Dashboard Readiness UX (Phase A)

**Type:** Enhancement (presentation / readiness only)  
**Status:** Complete  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Basis:** [KC-0101.1](./kc-0101-1-bootstrap-timing-certification.md) Phase A · [KC-0101](./kc-0101-dashboard-bootstrap-investigation.md)

---

## KC-ARCH-009 — Phases 0–3 + Go/No-Go

### Phase 0 — Classification & root cause

| Field | Value |
|-------|-------|
| Request type | **Enhancement** (perceived performance / readiness UX) |
| Root cause class | **Architecture** (dual global readiness gates; Rukn full-page skeleton) |
| Evidence | KC-0101.1 timings — post-critical gap ~2.8s Admin; Campaign Health blanked on `metricsReady && backgroundReady` |
| Out of scope | Firestore, repos, snapshot coalesce, caching, auth (Phase B+) |

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages | Y | `AdminHomePage`, `RuknHomePage`, `RuknLayout` |
| Components | Y | `CampaignHealthPanel`, `AdminCommandCenter`, `WidgetErrorBoundary` |
| Hooks / Services / Repos / Firestore | N | |
| Authentication / Session / Bootstrap | N | |
| Dashboard / Metrics | Y | Presentation gates only |
| Routing | Partial | Rukn nav available during hydrate |

### Phase 1 — Regression risk

| Category | Risk | Mitigation |
|----------|------|------------|
| Dashboard | MEDIUM | Per-gate skeletons; values only after gate |
| Fake zeros | HIGH | Admin critical-failure panel unchanged; Rukn main content still blocked until `isHydrated` |
| Layout shift | MEDIUM | Campaign Health always 4-card grid; Pending queue placeholder |

### Phase 2 — Implementation (done)

1. `CAMPAIGN_HEALTH_METRIC_READINESS` + per-metric panel  
2. Admin section `WidgetErrorBoundary` + Pending placeholder  
3. Rukn progressive shell (header/nav always)  
4. Rukn home section boundaries  

### Phase 3 — Verification (done)

- Unit tests for readiness gates (pass)  
- `tsc --noEmit` clean  
- Static review: no Firestore/repo/auth changes  

### Go / No-Go

| Question | Answer |
|----------|--------|
| **Go for Phase A coding?** | **GO** (executed) |
| Phase B? | **NO-GO** this ticket |

### Phase 4–5 (post-coding)

| Check | Result |
|-------|--------|
| No data-path changes | Pass |
| Anti fake-zero preserved | Pass (Admin fail panel; Rukn Outlet after hydrate only) |
| Deploy certification | **READY WITH KNOWN LIMITATIONS** — Visits % may refine when annexure background lands; CDN cold-start not re-timed |

---

## 1. Summary of readiness implementation

Phase A removes “wait for everything” **presentation** gates without changing hydrate/query/auth:

- **Admin Campaign Health** unlocks **Visits** at critical (`metricsReady`); Ijtema / Baitul Maal / App Registration wait on `backgroundReady` **inside the same grid**.
- **Admin sections** (Health, Mission, Pending, Priority, Trends, Timeline, Hero) are isolated with `WidgetErrorBoundary`.
- **Pending queue** keeps layout with a skeleton panel until background ready (no sudden insert).
- **Rukn** always shows header + bottom nav during load; main shows skeleton until critical hydrate (still prevents false “0 connected”).

---

## 2. Widgets converted to independent readiness

| Widget / section | Portal | Gate |
|------------------|--------|------|
| Campaign Health — Visits | Admin | `metricsReady` |
| Campaign Health — Weekly Ijtema | Admin | `backgroundReady` |
| Campaign Health — Monthly Baitul Maal | Admin | `backgroundReady` |
| Campaign Health — App Registration | Admin | `backgroundReady` |
| Today's Mission / Action Center | Admin | `backgroundReady` (unchanged; already independent) |
| Top Priority Rukns | Admin | `backgroundReady` (unchanged) |
| Progress Trends | Admin | `backgroundReady` (unchanged) |
| Activity Timeline | Admin | `backgroundReady` (unchanged) |
| Pending Karkun requests | Admin | `backgroundReady` + reserved skeleton |
| Admin Hero connected caption | Admin | `metricsReady` (unchanged) |
| Rukn shell (header/nav) | Rukn | Immediate (progressive) |
| Rukn main / Outlet | Rukn | `isHydrated` (anti fake-zero) |
| Rukn Home Mission / Execution / Follow-up | Rukn | Error isolation after hydrate |

---

## 3. Widgets not converted (and why)

| Widget | Why |
|--------|-----|
| Rukn execution cards / matrix before critical hydrate | Single critical `Promise.all`; showing counts early would fabricate 0 connected (KC-ARCH-001) |
| Admin critical-failure full-page panel | Intentional fail-closed for connection metrics |
| Per-Rukn list pages during hydrate | Outlet still deferred until hydrate; shell/nav progressive is Phase A item 3 |
| Snapshot / Firestore timing | Phase B+ (explicitly out of scope) |

---

## 4. Regression verification results

| Check | Result |
|-------|--------|
| Readiness unit tests | Pass (3) |
| Typecheck | Pass |
| Firestore / repo / auth / routing logic | Unchanged |
| Admin fail-closed hydrate error | Preserved |
| Rukn fail-closed (no fake 0 connected) | Preserved (Outlet after `isHydrated`) |
| Layout: Campaign Health 4-card grid while partial | Yes |
| Phase B not started | Yes |

---

## 5. Before vs after (qualitative)

| | Before | After |
|--|--------|-------|
| Admin Campaign Health | Entire panel “Loading…” until **both** critical and background | Grid visible; Visits can show at critical; other three show `…` until background |
| Admin Pending queue | Missing until background → layout jump | Placeholder panel, then real queue |
| Admin widget throw | Could take down large tree via app boundary | Section shows inline error + Retry |
| Rukn cold load | Full page skeleton **without** bottom nav | Header + **nav visible**; skeleton only in main |
| Data loading | Unchanged | Unchanged |

---

## Files touched

- `src/components/mission-control/dashboardMetricReadiness.ts` (+ test)
- `src/components/mission-control/CampaignHealthPanel.tsx`
- `src/components/mission-control/AdminCommandCenter.tsx`
- `src/components/mission-control/WidgetErrorBoundary.tsx` (new)
- `src/components/mission-control/index.ts`
- `src/pages/admin/AdminHomePage.tsx`
- `src/pages/rukn/RuknHomePage.tsx`
- `src/layouts/RuknLayout.tsx`
