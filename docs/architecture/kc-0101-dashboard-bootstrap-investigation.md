# KC-0101 — Dashboard Bootstrap & Rendering Reliability Investigation

**Type:** Investigation / root-cause analysis only  
**Status:** Complete (no application code modified)  
**Date:** 2026-07-25  
**Project:** `karkun-connect-75c68`  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Auth precondition:** KC-0100.5 / .6 / .7 certified healthy — authentication is **not** treated as root cause unless evidence proves otherwise.

---

## KC-ARCH-009 — Governance (Phases 0–3 + Go/No-Go)

### Phase 0 — Classification & root cause framing

| Field | Value |
|-------|-------|
| Request type | **Bug Fix** investigation (intermittent reliability) — not implementation |
| Suspected domain | Bootstrap / hydration / async readiness (not Auth claims provisioning) |
| Evidence basis | Static code path analysis + existing startup instrumentation (`logStartupTiming`, `markStartupLifecycle`, KC-0058.* probes) |
| Live ms timings | **Insufficient** in this investigation — production console timing is DEV-gated; see §Additional diagnostics |

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages | Y | `AdminHomePage`, `RuknHomePage`, layouts |
| Components | Y | Mission Control / Command Center widgets, skeletons |
| Hooks | Y | `useRepositoryHydration`, `useBackgroundHydration`, `useCampaignAutomationEngine`, `useGuidance` |
| Services | Y | `campaignAutomationEngine`, MetricsService / mission-control builders |
| Repositories | Y | Firestore hydrate critical + background |
| Firestore | Y | Parallel `getDocs`/`getDoc` at startup |
| Authentication | Partial | Token/claims gate before critical reads (already mitigated; residual race) |
| Authorization | Partial | Rules deny critical reads if claims late |
| Session | Y | Auth restore vs deferred hydrate |
| Bootstrap | Y | `main.tsx` deferred bootstrap |
| Dashboard | Y | Dual readiness gates |
| Metrics | Y | Staggered critical vs background |
| Campaign / Automation Engine | Y | Snapshot rebuild on every store bump |
| Caching | Y | In-memory automation snapshot cache + Firestore persistence |
| Persistence | Y | Store rebuild after hydrate |
| Routing | Y | `ProtectedRoute` progressive shell |
| State Management | Y | Multi-store subscriptions |
| Performance | Y | Large snapshot rebuilds; full-page Rukn skeleton |
| Monitoring / Logging | Y | Lifecycle marks exist; prod console quiet |
| Voice / Notifications / API | N (secondary) | Rafeeq idle-scheduled off critical path |

### Phase 1 — Regression risk (if fixes proceed later)

| Category | Risk | Notes |
|----------|------|-------|
| Bootstrap | HIGH | Changing hydrate order affects all portals |
| Dashboard | HIGH | Dual-gate UX is intentional KC-0058.7 contract |
| Firestore | HIGH | Critical `Promise.all` fail-fast |
| Authentication | MEDIUM | Claims-before-read already present |
| Persistence | HIGH | Store rebuild guards (empty cache) |
| Race Conditions | HIGH | Auth restore vs hydrate; background apply vs UI |
| Performance | HIGH | Snapshot rebuild fan-out |
| UI | MEDIUM | Skeletons vs progressive metrics |

**Operational classification:** This is an **Engineering** reliability concern (architecture of bootstrap/readiness), not ops/config/onboarding.

### Phase 2–3

Implementation plan and verification plan are **deferred** — this ticket forbids coding. See §Go/No-Go and §Recommendations for the smallest future solution shape.

### Go / No-Go checklist (investigation complete)

| Question | Answer |
|----------|--------|
| Root cause proven? | **Partially** — architectural causes verified in code; intermittent frequency needs production timing traces |
| Objective evidence available? | **Yes** (code + instrumentation contracts); **No** for wall-clock ms in production |
| Software problem? | **Yes** |
| Configuration / operational? | **No** (for the described symptoms) |
| Affects bootstrap / auth / repos / Firestore / dashboard / persistence / caching / async / races / startup / workflows? | **Yes** to all except pure routing |

**Go/No-Go for implementation of fixes:** **NO-GO until** production bootstrap timing evidence is captured (§Additional diagnostics).  
**Go/No-Go for this investigation report:** **GO** — investigation deliverable complete.

---

## 1. Dashboard bootstrap timeline

### 1.1 Designed sequence (code)

```
Browser load
  → main.bootstrap()
      → installStartupRejectionLogging
      → react.mount (StrictMode) ············· SYNC, non-blocking
      → void runDeferredBootstrap() ·········· ASYNC (not awaited by React)
           → initializeRepositories()
                → authStateReady()
                → [no user] return deferred OR
                → ensureJwtRoleClaimPresent (force refresh)
                → beginPhasedStartupHydrate()
                     ├─ critical Promise.all (6 reads) → store rebuild → markRepositoryHydrationReady
                     └─ background Promise.all (7 soft reads) → later store rebuild → markBackgroundHydrationReady
           → productionMigration (only if hydration ready)
           → requestIdleCallback → initializeRuntime (Digital Rafeeq)
  → AuthProvider.subscribe(onAuthStateChanged)
      → mapFirebaseUser → refreshFirestoreAfterAuth (may coalesce with startup)
  → ProtectedRoute
      → isInitializing → AuthLoadingScreen
      → else shell (children) with aria-busy until isHydrated
  → Admin: metricsReady=isHydrated; many widgets also wait backgroundReady
  → Rukn: RuknLayout blocks Outlet with HomePageSkeleton until isHydrated
  → Dashboard interactive (partial Admin shell earlier; full metrics later)
```

### 1.2 Stage table

| Stage | Blocking? | Async deps | Failure handling | Retry |
|-------|-----------|------------|------------------|-------|
| React mount | Blocks first paint of React tree | None | Throws if no `#root` | None |
| Deferred `initializeRepositories` | Does **not** block React mount | Dynamic import | Marks hydration failed | — |
| `authStateReady` | Blocks hydrate | Firebase Auth | — | — |
| No current user | Hydrate **deferred** | Login later | Avoids poison fail | `refreshFirestoreAfterAuth` |
| JWT claims force-refresh | Blocks critical reads | `ensureJwtRoleClaimPresent` | Throws → transient retry path | 1× @ 400ms |
| Critical Firestore `Promise.all` | Blocks `isHydrated` | 6 parallel reads | Fail-fast entire critical | 1 automatic retry |
| Store rebuild (critical) | Sync after critical | In-memory stores | Skip if empty+failed | — |
| Background Firestore | Parallel start; completes later | Soft reads | Logged; no ready if critical failed | None |
| Store rebuild (background) | After background | Triggers UI bumps | Skipped if critical failed | — |
| Snapshot listeners | After background success | `onSnapshot` → full rehydrate cycle | Queued refresh | Loop while queued |
| Migration | After ready | — | Logged | None |
| Digital Rafeeq | Idle / timeout 2s | Off critical path | Warn only | None |
| Admin widgets | Partial | `metricsReady` + `backgroundReady` | Skeletons / empty | User Retry on fail |
| Rukn shell | Full-page skeleton until critical ready | Layout gate | Error panel + Retry | User Retry |

### 1.3 Evidence (code)

- Concurrent React + hydrate: `src/main.tsx` (`react.mount` then `void runDeferredBootstrap()`)
- Claims-before-read race documented: `src/repositories/firestore/initialize.ts` (`ensureAuthTokenReadyForFirestore`)
- Critical vs background: `beginPhasedStartupHydrate` / `readCriticalHydratePayload` / `readBackgroundHydratePayload` in `firestoreRepositories.ts`
- Admin dual gate: `AdminCommandCenter` + `dashboardMetricReadiness.ts`
- Rukn full-page block: `RuknLayout.tsx` (`!isHydrated` → `HomePageSkeleton`)

### 1.4 Measured durations

**Not available in this investigation.**  
`logStartupTiming` only `console.info`s in **DEV**; production keeps marks in memory (`getStartupTimingMarks`) for Runtime Diagnostics.  
→ See §Additional diagnostics before ranking wall-clock bottlenecks.

---

## 2. Dependency graph

### 2.1 Admin

```
AdminHomePage
  ├─ useAuth (isInitializing)
  ├─ useRepositoryHydration / Status ──► hydrationReady module
  ├─ useAssignmentEngine ──► assignmentStore
  ├─ useAdminCommandCenter
  │     └─ AdminCommandCenterProvider
  │           └─ useCampaignAutomationEngine(administrator)
  │                 ├─ getAdminCommandCenterSnapshot()
  │                 └─ subscribes: assignments, annexure, followUp, people,
  │                    jih, baitulMaal, ijtema, activity, guidance
  ├─ buildAdminMissionControl(snapshot)
  ├─ AdminMissionControlHero (metricsReady = isHydrated)
  └─ AdminCommandCenter
        ├─ useBackgroundHydration ──► backgroundHydrationReady
        ├─ CampaignHealthPanel (needs metricsReady AND backgroundReady)
        ├─ Today's Mission / interventions (backgroundReady)
        ├─ Priority / Trends (backgroundReady)
        └─ Health KPIs (per-id critical|background gate)
```

### 2.2 Rukn

```
RuknLayout
  ├─ useRepositoryHydration ──► BLOCKS entire Outlet until ready
  └─ RuknCommandCenterProvider
        └─ useCampaignAutomationEngine(rukn, ruknId)
              └─ same multi-store subscriptions

RuknHomePage
  ├─ useRequiredRuknId
  ├─ useGuidance → buildMorningBrief (sync from stores)
  ├─ useRuknCommandCenter → buildRuknMissionControl
  ├─ CampaignExecutionProgressCard / SummaryCards / Matrix
  ├─ RuknTodaysFocus / VisitQueue / Panels
  └─ (page-level skeleton rarely hit if layout already hydrated)
```

### 2.3 Shared / hidden / circular notes

| Kind | Finding |
|------|---------|
| Shared | Hydration ready flags; assignment/people stores; automation snapshot cache |
| Hidden | Background hydrate completion silently unlocks Admin widgets; snapshot `onSnapshot` triggers full hydrate+rebuild |
| Circular | No import cycles found; **logical** cycle: snapshot listeners → hydrate → store rebuild → automation bump → UI → (later) more snapshots |
| Fan-out | One store bump invalidates automation cache and rebuilds entire command-center snapshot |

---

## 3. Repository interaction diagram

```
initializeRepositories / refreshFirestoreAfterAuth
        │
        ▼
ensureAuthTokenReadyForFirestore (getIdToken true + role claim)
        │
        ▼
beginPhasedStartupHydrate
   ┌────┴────────────────────────────┐
   ▼                                 ▼
CRITICAL (Promise.all fail-fast)   BACKGROUND (Promise.all soft)
 campaigns                          activityLogs
 rukns (all or one)                 executions
 karkuns (all or scoped)            followUps
 settings/karkunCounter             communications
 connections (all or scoped)        compliance
 settings/connectionMeta            settings/migrationVersion
   │                                settings (collection)
   ▼                                 │
 apply critical caches               ▼
 rebuild stores                      apply background caches
 markRepositoryHydrationReady        rebuild stores (if critical OK)
   │                                 markBackgroundHydrationReady
   │                                 attachSnapshotListeners
   ▼                                 │
 UI: isHydrated=true                 ▼
                                   onSnapshot → scheduleSnapshotRefresh
                                             → runHydrateAndRebuildCycle
```

**Query count (initial signed-in load, one cycle):**

| Phase | Approximate reads |
|-------|-------------------|
| Critical | **6** parallel (`Promise.all`) |
| Background | **7** parallel soft reads |
| Total first cycle | **~13** |
| Plus | Possible 1 critical retry; possible Rukn post-auth rescope full cycle; snapshot-driven rehydrate cycles |

**Duplicates:** Startup path documents “each collection read once” per phased start; **post-auth rescope** and **snapshot refresh** can repeat full cycles. Coalesce logic avoids double startup when `initializeInFlight` overlaps login (`refreshFirestoreAfterAuth`).

**Additional duplicate / overlap evidence** (from dependency exploration):

| Overlap | Detail |
|---------|--------|
| Settings | Critical already `getDoc`s `karkunCounter` + `connectionMeta`; background also `getDocsSoft(settings)` — settings re-read |
| Pending queue | `PendingKarkunRequestQueue` calls `syncKarkunRequestStoreFromServer()` → extra `settings/karkunRequests` read after background hydrate |
| In-memory Admin | Hero + Command Center both rebuild health/visit metrics; Mission/Priority re-call DashboardMetrics; dual ticks (`moduleTick` + hero `complianceTick`) |
| In-memory Rukn | Progress / Summary / Matrix / Focus each rebuild matrix aggregates with **separate** annexure+ijtema+baitul subscriptions |

---

## 4. Firestore query analysis

| Observation | Evidence |
|-------------|----------|
| Critical path is parallel, not sequential | `Promise.all` in `readCriticalHydratePayload` |
| Critical is fail-fast | Comment KC-0058.3; one failure fails entire critical |
| Background soft-fails individual collections | `getDocsSoft` / `readDocSoft` |
| Admin full-collection reads | Admin scope reads entire `campaigns`, `rukns`, `karkuns`, `connections` |
| Rukn scoped reads | Connections/karkuns filtered by `ruknId` |
| Long-running risk | Admin connection + karkun collection size dominates critical latency |
| Snapshot amplification | Any watched collection change can queue another full hydrate+rebuild |

---

## 5. Async & lifecycle audit

| Pattern | Finding |
|---------|---------|
| Parallel critical+background | Intentional (KC-004B) — good |
| Sequential auth → claims → critical | Necessary for security |
| `Promise.all` critical | Unnecessary blocking **across collections**: slowest/failing peer blocks ready |
| Deferred bootstrap vs React | Race: UI can render before hydrate starts/finishes |
| Auth initializing + permission-denied | Admin suppresses hard error while `isInitializing` (skeleton-like shell) |
| Single auto-retry 400ms | Addresses known JWT/Firestore attach race |
| Automation engine | Rebuilds on **9** store subscriptions — thrash when background lands |
| Rukn layout gate | Entire portal content skeleton until critical ready — strongest “slow load” UX |
| Suspense | Not used for dashboard data |
| Deadlock | None identified |
| Infinite loading | Possible if hydrate never marks ready/failed (e.g. stuck auth) — mitigated by failed panel + Retry |

---

## 6. Widget independence

| Portal | Shell independent of widgets? | Per-widget error/retry? | Violation |
|--------|-------------------------------|-------------------------|-----------|
| Admin | Partial: route shell can show; metrics gated | Global hydrate failure panel; no per-widget Firestore retry | Campaign Health waits on **both** gates; many panels wait on background only |
| Rukn | **No** — layout skeleton blocks all routes under layout | Global failure panel | One failed critical read blocks Home + nav content |

**Violations of “one failing widget must never block shell/nav/others”:**

1. Rukn: critical hydrate failure or pending blocks whole layout outlet.  
2. Admin: critical failure replaces entire home with error panel (intentional anti-fake-zero).  
3. Admin: background-gated panels stay empty/loading until background completes even when critical metrics could show.  
4. **No per-widget ErrorBoundary** on Mission Control / execution widgets — a throw in a shared `useMemo` aggregation is only caught by app-level `StartupErrorBoundary`.

---

## 7. Performance bottleneck ranking

**Ranked by architectural severity / likely UX impact (code evidence).**  
Wall-clock order requires production timing (§Additional diagnostics).

| Rank | Bottleneck | Why | Evidence |
|------|------------|-----|----------|
| 1 | Admin critical collection volume (`connections` + `karkuns` + `rukns`) | Bounds `isHydrated` / `metricsReady` | Critical `Promise.all` |
| 2 | Rukn full-page hydrate gate | User sees only skeleton until critical completes | `RuknLayout` |
| 3 | Background gate on Campaign Health & most Admin panels | Metrics appear “late” / staggered after critical | `AdminCommandCenter` `metricsReady && backgroundReady` |
| 4 | Command-center snapshot rebuild fan-out | UI churn as each background store applies | `useCampaignAutomationEngine` invalidates on 9 stores |
| 5 | Snapshot-driven full rehydrate | Post-load jank / “needs refresh” feel | `scheduleSnapshotRefresh` → `runHydrateAndRebuildCycle` |
| 6 | JWT/Firestore attach race (residual) | Intermittent permission-denied → retry or error panel | `ensureAuthTokenReadyForFirestore` comments + KC-0058.8 retry |
| 7 | StrictMode double effects (DEV) | Amplifies perceived flicker in local | `main.tsx` StrictMode |

---

## 8. Root cause list (ranked by severity)

### RC-1 — Dual readiness model (critical vs background) surfaces as “unreliable” dashboard  
**Severity:** High · **Frequency:** Every cold load (by design)  
**Description:** Dashboard intentionally unlocks in two waves. Users experience skeletons, delayed metrics, and sections appearing at different times.  
**Evidence:** `dashboardMetricReadiness.ts`; `AdminCommandCenter` Campaign Health requires both flags.  
**Modules:** Mission Control, hydration ready modules.  
**Why:** KC-004B / KC-0058.7 progressive hydration.  
**Impact:** Matches reported symptoms without Auth failure.  
**Recommended permanent solution (do not implement here):** Tighten UX contract — show progressive values for critical KPIs immediately at `metricsReady`; only background-true widgets wait on background; ensure Campaign Health critical slices are not blocked by background.

### RC-2 — Rukn layout blocks entire workspace on critical hydrate  
**Severity:** High · **Frequency:** Every Rukn cold load  
**Description:** Navigation content and home are behind one skeleton until `isHydrated`.  
**Evidence:** `RuknLayout.tsx` lines ~92–107.  
**Recommended solution:** Progressive shell (header/nav always; page-level skeletons per section) consistent with `ProtectedRoute` progressive-shell comment.

### RC-3 — Critical path fail-fast `Promise.all`  
**Severity:** High (intermittent)  
**Description:** One slow/failing critical collection delays or fails entire dashboard ready state.  
**Evidence:** `readCriticalHydratePayload` + KC-0058.3 comments.  
**Recommended solution:** Keep fail-closed for **connections** (anti fake-zero) but consider isolating non-connection critical peers or timed fallbacks with explicit degraded UI — **only after** timing evidence.

### RC-4 — Automation snapshot rebuild thrash on multi-store hydrate  
**Severity:** Medium–High  
**Description:** Background apply bumps many stores → repeated full snapshot rebuilds → widgets “pop in” inconsistently.  
**Evidence:** `useCampaignAutomationEngine` subscription list + cache invalidation.  
**Recommended solution:** Coalesce store notifications (microtask/raf batch) or split snapshot into critical vs background slices.

### RC-5 — Residual Auth-token-to-Firestore race  
**Severity:** Medium · **Frequency:** Intermittent  
**Description:** Documented race: UI auth ready slightly before Firestore credential carries `request.auth.token.role` → permission-denied → retry or error.  
**Evidence:** Comments + retry in `initialize.ts`; Admin suppresses error while `isInitializing`.  
**Note:** Auth **provisioning** is healthy (KC-0100.*); this is attach/timing, not missing claims.  
**Recommended solution:** Keep/extend single retry; ensure post-login always awaits claims-ready before first critical read (mostly done); add prod timing marks around `auth.claims.available` → `first_critical_read`.

### RC-6 — Snapshot refresh full rehydrate  
**Severity:** Medium  
**Description:** Live listeners can re-run hydrate cycles causing “refresh-like” behaviour mid-session.  
**Evidence:** `scheduleSnapshotRefresh`.  
**Recommended solution:** Prefer incremental cache patches over full rebuild where safe (ARCH-001 aware).

---

## 9. Architectural recommendations (smallest permanent direction)

1. **Do not** reopen Auth claims provisioning for these symptoms.  
2. **Treat readiness UX as the primary product issue:** progressive Admin metrics; progressive Rukn shell.  
3. **Instrument production** bootstrap marks (always-on structured logs or Runtime Diagnostics export) before optimizing query shapes.  
4. **Preserve** anti-fake-zero rules (KC-0058.3) — never show fabricated 0/0/0% after critical failure.  
5. **Batch** automation snapshot invalidation.  
6. Only after timings: consider Admin connection query shaping / pagination — high regression risk (ARCH-009 HIGH).

---

## 10. Regression risks (future implementation)

| Change | Risk |
|--------|------|
| Relax critical fail-fast | Fake empty dashboards |
| Show Rukn UI before hydrate | Connected=0 flash (KC-0100 class) |
| Split Campaign Health gates | Metric inconsistency vs annexure |
| Coalesce snapshot rebuilds | Stale hero numbers |
| Change snapshot listener strategy | Missed live updates |

---

## 11. Go / No-Go recommendation for implementation

| Decision | Rationale |
|----------|-----------|
| **NO-GO for coding fixes in this ticket** | Investigation-only mandate |
| **NO-GO for speculative query optimization** | Deferred pending timings (completed in KC-0101.1) |
| **Follow-up** | [KC-0101.1 — Production Bootstrap Timing Certification](./kc-0101-1-bootstrap-timing-certification.md) |

**Updated after KC-0101.1:** Timing evidence **confirms** primary architectural causes. Implementation may proceed under the **phased plan in KC-0101.1 §7** (**CONDITIONAL GO**). Preserve fail-closed critical connection hydrate. Do not reopen Auth claims provisioning for these symptoms.

Certification of “ready to implement”: **READY for Phase A–B** (readiness UX + snapshot coalesce) per KC-0101.1; **NOT READY** for speculative Admin collection pagination (Phase D) until A–B are measured.

---

## Additional diagnostics required (before any implementation approval)

**Satisfied by KC-0101.1** — see [kc-0101-1-bootstrap-timing-certification.md](./kc-0101-1-bootstrap-timing-certification.md).

| Item | Status |
|------|--------|
| Cold-start lifecycle + timing marks (Admin + Rukn) | Captured |
| Firestore critical/background wall-clock | Captured (Admin SDK + client critical duration) |
| Correlate claims / critical / background / dashboard | Captured |
| Admin vs Rukn | Both measured (Admin slower; Rukn scoped faster) |
| Optional CDN TTFB on Vercel | Not required for CONDITIONAL GO; Phase E observability optional |

---

## Success criteria check

| Criterion | Met? |
|-----------|------|
| Bootstrap timeline | Yes (designed); durations in KC-0101.1 |
| Dependency graph | Yes |
| Repository interaction diagram | Yes |
| Firestore query analysis | Yes |
| Async analysis | Yes |
| Performance ranking | Yes — wall-clock certified in KC-0101.1 |
| Root causes ranked | Yes |
| Recommendations without code change | Yes |
| Regression risks | Yes |
| Go/No-Go | Updated — **CONDITIONAL GO** via KC-0101.1 Phase A–B |

**Verified primary causes of the reported UX:** progressive dual-gate hydration (RC-1), Rukn full-page hydrate gate (RC-2), critical volume/fail-fast (RC-3), and snapshot rebuild thrash (RC-4) — **not** Rukn activation/claims provisioning. RC-5 (claims attach race) not observed in the KC-0101.1 cold sample.
