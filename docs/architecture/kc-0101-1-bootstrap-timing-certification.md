# KC-0101.1 — Production Bootstrap Timing Certification

**Type:** Diagnostics / certification only (no dashboard fixes implemented)  
**Status:** Complete  
**Date:** 2026-07-24  
**Project:** `karkun-connect-75c68`  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Predecessor:** [KC-0101](./kc-0101-dashboard-bootstrap-investigation.md)  
**Raw export:** `production-data/exports/kc0101-1-bootstrap-timing-latest.json`  
**Capture script:** `scripts/admin/kc0101-1-capture-bootstrap-timing.mjs`

---

## KC-ARCH-009 — Governance (Phases 0–3)

### Phase 0 — Classification

| Field | Value |
|-------|-------|
| Request type | **Performance / reliability diagnostics** (certification), not implementation |
| Suspected domain | Bootstrap / hydration / dashboard readiness (unchanged from KC-0101) |
| Evidence basis | Production Firestore wall-clock (Admin SDK) + authenticated browser lifecycle against production Firebase project |
| Live ms timings | **Captured** (this ticket) |

### Impact Matrix (if future fixes proceed)

Unchanged from KC-0101: bootstrap, dashboard, repositories, Firestore, session, metrics, campaign automation, caching, persistence, performance. Auth claims **provisioning** remains out of scope.

### Phase 1 — Regression risk (future implementation)

| Category | Risk | Notes |
|----------|------|-------|
| Bootstrap | HIGH | Hydrate order / readiness gates |
| Dashboard | HIGH | Dual-gate UX is intentional |
| Firestore | HIGH | Critical fail-fast / collection reads |
| Persistence | HIGH | Store rebuild guards |
| Race conditions | HIGH | Auth attach vs hydrate |
| Performance | HIGH | Snapshot coalesce changes |

### Phase 2 — Implementation plan

See §7 Phased implementation plan. **Not executed in this ticket.**

### Phase 3 — Verification plan (for future tickets)

| Check | Method |
|-------|--------|
| Admin cold load | Re-run capture script; `dashboard.rendered` &lt; warn threshold or justified |
| Rukn cold load | `dashboard.firstInteractive` after critical; no full-page skeleton beyond critical |
| Snapshot thrash | `commandCenter.snapshot.build` count ≤ 1–2 per cold load |
| Anti fake-zero | Critical connection failure still blocks fabricated 0 metrics |
| Auth | Claims → first critical start gap remains near-zero; no claims-missing events |

### Go / No-Go checklist (this certification)

| Question | Answer |
|----------|--------|
| Root cause proven with timings? | **Yes** for primary KC-0101 causes (see §4–5) |
| Objective evidence available? | **Yes** — export + stage tables below |
| Software problem? | **Yes** |
| Configuration / operational? | **No** for measured symptoms |
| Ready to implement fixes? | **CONDITIONAL GO** — phased plan only; preserve fail-closed connection hydrate |

---

## Methodology

| Layer | Method | What it proves |
|-------|--------|----------------|
| Firestore query timings | Firebase Admin SDK against `karkun-connect-75c68` | Production data-plane wall-clock for critical/background collections |
| Browser bootstrap | Playwright + custom-token sign-in against Vite (`127.0.0.1:5173`) using **production** Firebase config | Auth restore, claims, hydrate lifecycle (`window.__KC027G_LIFECYCLE__`), timing marks, command-center rebuilds |
| Production CDN | Referenced (`karkun-connect.vercel.app`) — **not** cold-asset timed in this run | Asset TTFB may add constant overhead; data-plane findings remain valid |

**Subjects:** Admin `VQkrDSDGoQUptRlyghtlFxmcJN03`; Rukn R026 (`IUP8qiPLPVYJ5rAFAiDhwhpKeLC2`).

**Thresholds used**

| Stage | Warn | Fail |
|-------|------|------|
| Critical `Promise.all` (Admin SDK) | 1500 ms | 4000 ms |
| Background parallel (Admin SDK) | 2000 ms | — |
| Dashboard interactive / rendered | 5000 ms | 10000 ms |

---

## 1. Production timing report

### 1.1 Firestore critical / background (Admin SDK, production project)

| Stage | Duration | Detail |
|-------|----------|--------|
| `critical.campaigns` | 629 ms | 0 docs |
| `critical.rukns` | 182 ms | 49 docs |
| `critical.karkuns` | **862 ms** | **528 docs** (slowest sequential peer) |
| `critical.connections` | 407 ms | 311 docs |
| `critical.settings.karkunCounter` | 156 ms | exists |
| `critical.settings.connectionMeta` | 126 ms | exists |
| **`critical.Promise.all(6)`** | **1365 ms** | Parallel; ≈ max peers (efficiency ~0.63 vs sum 2362 ms) |
| `background.activityLogs` | 589 ms | limit 500 |
| `background.executions` | 166 ms | 30 |
| `background.followUps` | 155 ms | 5 |
| `background.compliance` | 281 ms | 51 |
| `background.settings.collection` | **141 ms** | **4 docs — settings re-read** |
| `extra.settings.karkunRequests` | **141 ms** | **exists — Pending queue getDoc cost** |
| **`background.Promise.all(approx)`** | **762 ms** | Parallel soft reads |

**Sequential vs parallel:** Critical peers are **parallel by design**. Sum of sequential peers (2362 ms) ≫ parallel (1365 ms). Bottleneck is largest peer (`karkuns`), not artificial serialization of the six reads.

### 1.2 Admin browser bootstrap timeline (lifecycle `t` ms from first mark)

| Stage | t (ms) | Δ notes |
|-------|--------|---------|
| `auth.authStateReady` | 447 | Auth restore |
| `auth.claims.available` | 866 | role=`administrator` |
| `repository.initialized` | 867 | |
| `firestore.first_critical_read.start` | 884 | +18 ms after claims |
| `ProtectedRoute.shellVisible` (`isHydrated:false`) | 2355 | Progressive Admin shell |
| `firestore.first_critical_read.complete` | 4619 | **client critical ~3735 ms** |
| `criticalHydrate.complete` | 4643 | |
| `backgroundHydrate.complete` | 4775 | +132 ms after critical (parallel start) |
| `commandCenter.snapshot.build` #2 | 4991 | rebuild after hydrate |
| **`dashboard.rendered`** | **7504** | **warn threshold exceeded** |
| `ProtectedRoute.canRender` / `firstInteractive` | 7507 | |
| `commandCenter.snapshot.build` #3 | 8649 | post-render thrash |

**Admin stage gaps**

| Gap | ms |
|-----|-----|
| Auth restore → claims | 419 |
| Claims → first critical start | **18** |
| First critical duration (client) | **3735** |
| Critical → background complete | 132 |
| Critical → dashboard.rendered | **2861** |
| Wall clock (nav → settle) | ~14968 |

**Command center:** **3 builds**, 7 cache hits.  
**Hydration attr:** `ready`. **Firestore requests observed:** 26 (channel multiplex; use lifecycle as primary).

### 1.3 Rukn browser bootstrap timeline (R026)

| Stage | t (ms) |
|-------|--------|
| `auth.authStateReady` | 380 |
| `auth.claims.available` | 725 (`ruknId: R026`) |
| `repository.initialized` | 726 |
| `firestore.first_critical_read.start` | 746 |
| `firestore.first_critical_read.complete` | 2432 (7 connections scoped) |
| `criticalHydrate.complete` | 2436 |
| `backgroundHydrate.complete` | 2468 |
| `commandCenter.snapshot.build` #1 | 2505 |
| `ProtectedRoute.canRender` / `firstInteractive` | **4182–4183** |
| `commandCenter.snapshot.build` #2 | 4440 |

| Gap | ms |
|-----|-----|
| Auth → claims | 345 |
| Claims → first critical start | 21 |
| First critical duration | **1686** (scoped; faster than Admin) |
| Critical → firstInteractive | ~1746 |
| `dashboard.rendered` | **not emitted** (Admin-only mark) |

**Command center:** **2 builds**, 6 cache hits. Hydration `ready`.

### 1.4 Stages exceeding thresholds

| Stage | Observed | Severity |
|-------|----------|----------|
| Admin `dashboard.rendered` | 7504 ms (≥ 5000 warn) | **Warn** |
| Admin SDK critical parallel | 1365 ms (&lt; 1500) | OK |
| Client Admin critical | 3735 ms | Above SDK; dominant path cost |
| Rukn firstInteractive | 4183 ms | Under warn |

### 1.5 Per-widget render timings

Lifecycle does **not** emit per-widget paint marks. Proxy evidence:

- Admin shell can show before hydrate (`shellVisible` @ 2355, `isHydrated:false`).
- Metrics/dashboard gate unlocks only at ~7504 ms (Admin).
- Multiple `commandCenter.snapshot.build` events ⇒ widgets re-derive aggregates after hydrate and again after render.
- Code-level: Campaign Health still requires `metricsReady && backgroundReady` (KC-0101); in **this** cold sample background landed ~132 ms after critical, so dual-gate stagger was small — post-critical **UI/aggregation** gap (~2.8 s) dominated.

---

## 2. Correlation with KC-0101

| KC-0101 finding | Timing evidence | Verdict |
|-----------------|-----------------|---------|
| RC-1 Dual readiness (critical vs background) | Background completes ~132 ms (Admin) / ~32 ms (Rukn) after critical; dashboard still much later | **Confirmed as architecture**; **partial UX impact in this sample** (stagger small); still blocks Campaign Health by contract |
| RC-2 Rukn full-page hydrate gate | Rukn `canRender` only after critical; no early interactive content marks | **Confirmed** |
| RC-3 Critical `Promise.all` fail-fast + volume | Admin client critical **3735 ms**; SDK parallel **1365 ms**; `karkuns` 528 docs dominate | **Confirmed** (volume/latency); fail-fast not exercised this run |
| RC-4 Snapshot rebuild thrash | Admin **3** builds; Rukn **2** builds; builds after hydrate and after render | **Confirmed** |
| RC-5 Residual JWT→Firestore race | Claims → critical start **18–21 ms**; no `auth.claims.missing` | **Not observed this run** — remains residual risk, not primary |
| Settings re-read | Background `settings` collection **141 ms** after critical settings docs | **Confirmed** |
| Pending queue extra `getDoc` | `settings/karkunRequests` **141 ms**, exists | **Confirmed (cost exists)** |
| Duplicate in-memory aggregation | Multiple snapshot builds | **Confirmed** |
| Missing widget isolation | No per-widget failure this run; code still has no widget ErrorBoundary; Rukn layout gate | **Confirmed by code**; runtime failure isolation **not exercised** |
| Repository init bottleneck | Repo init @ ~867 ms Admin; then critical dominates | **Confirmed** (init small; critical reads are bottleneck) |
| Bootstrap serialization | Auth→claims→critical serial by design; claims→critical ~18 ms | **Confirmed as intentional**; **not** a pathological delay |

---

## 3. Confirmed root causes (timing + code)

1. **Admin critical collection volume / client critical duration** — ~3.7 s client first critical; `karkuns` + `connections` dominate.  
2. **Post-critical dashboard unlock gap** — ~2.8 s Admin from `criticalHydrate.complete` → `dashboard.rendered` (store rebuild + React + command-center).  
3. **Command-center snapshot rebuild thrash** — 3 Admin / 2 Rukn builds per cold load.  
4. **Rukn layout gate** — interactive only after critical (~4.2 s firstInteractive).  
5. **Settings collection re-read** on background path (~141 ms).  
6. **Extra `settings/karkunRequests` getDoc** available as Pending-queue cost (~141 ms).  
7. **Dual readiness model** — still present; background nearly co-timed with critical in this sample, so UX “stagger” often comes from (2)+(3) more than background lag.

---

## 4. Root causes rejected (for this evidence set)

| Hypothesis | Why rejected / downgraded |
|------------|---------------------------|
| Missing / invalid Auth claims (KC-0100 class) | Claims present; Admin + R026 roles correct; claims→critical ~20 ms |
| Critical reads run sequentially | SDK parallel 1365 ms vs sequential sum 2362 ms |
| Pathological claims→Firestore serialization | Gap 18–21 ms |
| Background Firestore as primary Admin delay (this sample) | Background complete +132 ms after critical; dashboard +2861 ms after critical |
| Production project / Admin SDK mismatch | `projectId` = `karkun-connect-75c68` |
| Hydration never completing | Both portals `data-hydration=ready` |

---

## 5. Updated Go / No-Go recommendation

| Decision | Status |
|----------|--------|
| Implement dashboard fixes **inside KC-0101.1** | **NO-GO** (diagnostics-only mandate) |
| Proceed to **phased implementation tickets** | **CONDITIONAL GO** |
| Speculative Firestore schema / pagination rewrite | **NO-GO** until Phase A–B UX/coalesce measured |
| Reopen Auth claims provisioning for bootstrap UX | **NO-GO** |
| Preserve fail-closed critical **connections** hydrate | **REQUIRED** (KC-ARCH-001 / anti fake-zero) |

**Certification:** Timing evidence **confirms** KC-0101 architectural causes. Implementation may proceed under the phased plan below with ARCH-009 Phase 0–3 completed per change ticket.

---

## 6. KC-ARCH-001 notes

- Do **not** show fabricated zeros if critical connection hydrate fails.  
- Coalesce / progressive UX must not weaken persistence or silent empty-cache rebuilds.  
- Any query shaping of `connections` / `karkuns` requires explicit anti-fake-zero verification.

---

## 7. Phased implementation plan (ordered by risk ↑ / impact ↓)

**Do not implement in this ticket.**

### Phase A — Low risk / high UX impact (readiness contract)

1. Admin: unlock critical KPI slices at `metricsReady`; keep only true background widgets on `backgroundReady`.  
2. Campaign Health: split critical vs background sections so background lag cannot blank critical health.  
3. Rukn: progressive shell (nav/header always; section skeletons) — remove full-Outlet block on `!isHydrated`.  

**Expected impact:** Removes “whole dashboard blank / late pop-in” without touching Firestore shapes.  
**Risk:** MEDIUM (metric consistency); verify no fake zeros.

### Phase B — Low–medium risk / high smoothness

4. Coalesce `useCampaignAutomationEngine` invalidation (microtask/rAF batch) so cold load yields **≤1–2** `commandCenter.snapshot.build`.  
5. Optional: share matrix/health aggregates across Hero + Command Center (single derive per tick).  

**Expected impact:** Cuts post-critical ~2–3 s churn; matches confirmed rebuild thrash.  
**Risk:** MEDIUM (stale one-frame metrics).

### Phase C — Medium risk / modest latency

6. Deduplicate settings: reuse critical settings docs in background or skip full `settings` collection if unused fields already loaded.  
7. Defer Pending-queue `karkunRequests` getDoc until queue panel mounts / idle (if not already).  

**Expected impact:** ~100–300 ms + fewer duplicate reads.  
**Risk:** LOW–MEDIUM.

### Phase D — High risk / only after A–B metrics

8. Consider Admin `karkuns` / `connections` query shaping or pagination **only if** Phase A–B leave `dashboard.rendered` above fail threshold.  
9. Soft-isolate non-connection critical peers **without** relaxing connection fail-closed.  

**Expected impact:** Could cut client critical from ~3.7 s — **HIGH regression risk** (ARCH-009).  
**Risk:** HIGH.

### Phase E — Observability (supports all)

10. Expose production-safe export of lifecycle + timing marks (Runtime Diagnostics) so Vercel CDN cold starts can be certified without Vite.

---

## 8. Success criteria (KC-0101.1)

| Deliverable | Met? |
|-------------|------|
| Complete bootstrap timeline | Yes (§1.2–1.3) |
| Per-stage durations | Yes |
| Repository init timings | Yes (~867 ms Admin / ~726 ms Rukn) |
| Firestore query timings | Yes (§1.1) |
| Auth restore / claims timings | Yes |
| Campaign / command-center init | Yes (builds + cache hits) |
| Per-widget timings | Partial (proxied via gates + builds; no per-widget paint API) |
| Duplicate Firestore / aggregation | Yes (settings re-read, karkunRequests, snapshot builds) |
| Sequential vs parallel | Yes |
| Threshold exceedances | Yes (Admin dashboard.rendered warn) |
| Correlation with KC-0101 | Yes (§2) |
| Confirmed / rejected RCs | Yes (§3–4) |
| Updated Go/No-Go + phased plan | Yes (§5, §7) |
| No implementation of fixes | Yes |

---

## Appendix — Reproduce

```bash
# terminal A
npm run dev -- --host 127.0.0.1 --port 5173

# terminal B
npx playwright install chromium   # once
node --env-file=.env.local scripts/admin/kc0101-1-capture-bootstrap-timing.mjs
```

Outputs:

- `production-data/exports/kc0101-1-bootstrap-timing-latest.json`
- `production-data/exports/kc0101-1-bootstrap-timing-<stamp>.json`
