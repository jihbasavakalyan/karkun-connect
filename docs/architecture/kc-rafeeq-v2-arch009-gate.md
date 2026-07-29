# Digital Rafeeq v2.0 — Complete Operational Companion — KC-ARCH-009 Gate

**Ticket:** Digital Rafeeq v2.0 — Complete Operational Companion  
**Type:** Enhancement (product capabilities on certified KC-0131)  
**Standards:** DRDS v1.0 · KC-0131.1–.11 · KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-30  
**Prerequisite:** KC-0131 architecture COMPLETE — do not redesign.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

**Enhancement** — productize remaining Rukn operational companion surfaces on the existing MVP bridge (`runRafeeqTurn` → KC-0131 stack → existing KC services).

### 0.2 Root cause

N/A (not a bug). Evidence of readiness:

- KC-0131.1–.9 + .11 certified; MVP bridge, search, campaign intel, safe actions live
- Platform services already expose: Priority Intelligence / `queueBuilder`, dashboard metrics, mission/Rukn assistant, activity log, TTS/STT, person resolution
- Gap is product composition + conversation intents — not missing architecture

### 0.3 Impact Matrix

| Area | Impact? | Notes |
|------|---------|-------|
| UI | Y | VoiceDrawer cards: briefing, queue, timeline, notifications, entity cards, a11y/UX |
| Pages | N | No new routes required; opens existing ROUTES |
| Components | Y | Thin presentation + reuse Rukn/admin assistant patterns |
| Hooks | LOW | Session/history helpers only |
| Services | Invoke only | metrics, dashboardMetrics, assignment, followUp, campaign, activityLog |
| Repositories | N | No new repos; no Firestore shape changes |
| Firestore | N | No writes from Rafeeq v2; DRDS history remains ephemeral |
| Authz / session / bootstrap | N | |
| Dashboard / metrics | Read | Compose existing slices only |
| Campaign / assignment / automation | Read / open UI | Priority Intelligence + existing adapters |
| Notifications | Compose | Conversational surface over existing signals — no new push infra |
| Voice | Interface | Expose readiness interfaces; reuse existing TTS; no new STT |
| Caching / persistence | LOW | Extend turn metrics / search cache patterns only |
| Routing / state | LOW | Navigation via existing ROUTES + RafeeqAction |
| Background | N | Proactive = on-open / on-turn compose, not a new scheduler service |
| Monitoring / logging | LOW | Observability traces already in MVP |
| Security | LOW | Confirmation Orchestrator remains gate for safe actions |
| Dependencies | N | No new frameworks |

---

## Phase 1 — Regression risk

| Area | Risk | Why / Mitigation / Verification |
|------|------|----------------------------------|
| Integrity of metrics | MEDIUM | Reuse `getTurnMetricsBundle` + Priority Intelligence only; never invent numbers. Verify known metric fields present. |
| Persistence / Firestore | LOW | No writes. Assert verify script "No Firestore Writes". |
| Auth / bootstrap / dashboard pages | LOW | Drawer-scoped; no claim/bootstrap changes |
| Conversation stack | MEDIUM | All new intents still traverse Intent→Secretary→Orchestrator→Confirmation→Pipeline→Adapter. Prior verifies + `verify:rafeeq-v2`. |
| Safe actions / communication | HIGH | Keep confirmation policy; no new write paths. `verify:rafeeq-safe-actions`. |
| Priority / work queue rules | HIGH | Call `runPriorityEngine` + `buildWorkQueue` only — no duplicate priority rules. |
| Async / races | LOW | AbortSignal + existing caches |
| UI / navigation | MEDIUM | New cards must not break Confirm/Cancel or Link actions. Drawer smoke via classify/turn tests. |
| Performance | MEDIUM | Reuse TTL caches; memoize queue/briefing compose; lazy UI already on launcher. |
| Security | LOW | Read-only default; confirmation for external communication |

Operational/config issues: none — this is intentional product scope.

---

## Phase 2 — Implementation plan

### Strategy

Thin `src/conversation/mvp/v2/` product modules that **compose** existing KC services through the MVP bridge. Module-by-module commits. No architecture redesign.

### Module order (commits)

1. Proactive Rafeeq  
2. Daily Briefing  
3. Explainability  
4. Smart Work Queue  
5. Personal Dashboard  
6. Advanced Conversation  
7. Recommendation Engine  
8. Smart Notifications  
9. Timeline  
10. Conversation History  
11. Smart Quick Actions  
12. Entity Cards  
13. Operational Insights  
14. Guided Workflow  
15. Contextual Suggestions  
16. Better Search  
17. Voice Ready (interfaces)  
18. Accessibility  
19. Performance  
20. UX Polish + aggregate `verify:rafeeq-v2` + `docs/features/rafeeq-v2.md`

### Files (+/− expected)

- **Add:** `src/conversation/mvp/v2/**`, verify script, feature doc, this gate  
- **Touch:** `classifyMvp.ts`, `runRafeeqTurn.ts`, `session.ts`, `types.ts`, `index.ts`, VoiceDrawer (presentation), `package.json`  
- **Do not touch:** Firestore rules, Campaign Engine, Assignment Engine, Dashboard engines, search core rewrite

### Rollback

Revert module commits; MVP verifies remain green. Stack shell unchanged.

### Success criteria

Rukn can briefing / queue / explain why / history / timeline / recommendations / safe actions without leaving conversational companion; all through KC-0131; `npm run verify:rafeeq-v2` green.

---

## Phase 3 — Verification plan

| Check | Evidence |
|-------|----------|
| Search / Navigation / Campaign / Secretary / Safe Actions | Prior verify scripts still pass |
| Work Queue / Briefing / Recommendations / Notifications / Timeline | `verify:rafeeq-v2` assertions + reuse of Priority Intelligence / metrics fields |
| Conversation memory / pronouns / context | Turn sequences in verify |
| Explainability / Entity cards | Metadata reasons from real fields |
| Accessibility / Performance | Labels + cache hit / abort / no duplicate query flags in verify |
| No Firestore writes / no regressions | Explicit asserts + prior verifies |

Reject subjective “looks fixed”.

---

## Go / No-Go checklist

| # | Question | Answer | If YES |
|---|----------|--------|--------|
| 1 | Root cause proven? | N/A (enhancement) | — |
| 2 | Objective evidence available? | YES | MVP + KC-0131 docs/verifies; Impact: proceed on evidence only; Mitigation: compose only; Tests: module verifies |
| 3 | Software problem? | YES | Product gap on ready architecture |
| 4 | Configuration? | NO | |
| 5 | Operational? | NO | |
| 6 | Affects bootstrap? | NO | |
| 7 | Affects authentication? | NO | |
| 8 | Affects authorization? | NO | Role context read-only |
| 9 | Affects repositories? | NO | |
| 10 | Affects Firestore? | NO | |
| 11 | Affects dashboard? | YES | Read metrics + open routes; Mitigation: no dashboard rewrite; Tests: campaign/intel + v2 verify |
| 12 | Affects persistence? | NO | Session ephemeral only |
| 13 | Affects routing? | YES | Opens existing ROUTES via RafeeqAction; Mitigation: navigationMap reuse; Tests: nav/search verifies |
| 14 | Affects caching? | YES | Extend turn/search TTL patterns; Mitigation: same TTL helpers; Tests: perf section in v2 verify |
| 15 | Introduces async dependencies? | LOW YES | AbortSignal only; Mitigation: existing pattern; Tests: abort case |
| 16 | Race conditions? | LOW YES | Session memory mutations; Mitigation: single-session map; Tests: multi-turn verify |
| 17 | Production startup? | NO | Lazy drawer |
| 18 | Existing workflows? | YES | VoiceDrawer + MVP intents; Mitigation: additive intents, fallback preserved; Tests: prior + v2 verifies |

**Decision: GO** — KC-0131 complete; reuse path proven; no Firestore writes; module-by-module delivery.

---

## Phase 4–6

### Phase 4 — Post-implementation audit (recorded 2026-07-30)

Workflows tested via verifies: search, navigation, campaign intelligence, secretary stack path, work queue, daily briefing, recommendations, notifications, timeline, conversation memory, pronouns/context, safe actions, explainability, entity cards, accessibility helpers, performance memo, no Firestore writes, prior MVP verifies.

### Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — keyword NLU; ephemeral history; proactive on-demand (no push scheduler); voice interfaces only (existing TTS/STT).

### Phase 6 — Post-deploy

Pending production deploy smoke (Admin/Rukn login, drawer open, briefing/queue utterances, hard refresh).
