# KC Phase 7 Journey Dashboards — KC-ARCH-009 Gate

**Ticket:** BATCH-07A / TASK-054 + TASK-055 + TASK-056  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 6 certification](./kc-phase6-certification.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Admin Attention Required, Rukn action dashboard, and continuous Karkun journey

Phase 0–6 are already certified and are **not** re-analysed here.  
TASK-057–059 / Phase 7 certification are **out of scope**. No Vercel deploy. Do not deploy Firestore rules.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Refine Admin Attention Required with operational exceptions; unify Rukn “what needs my action?” from existing signals; represent Connection → Development → Participation → Responsibility → Leadership as a derived read model |
| Not | New journey/participant/attention collections, Kanban, task hierarchy, second calendar/notification/reporting, chat, Rafeeq intelligence, WI/BM dual-write, Vercel |

**STOP checks:**

| Check | Result |
|-------|--------|
| New journey / participant / attention entity required? | **NO** — derived selectors only |
| Second Karkun / Rukn / Connection registry required? | **NO** |
| Generic participation engine required? | **NO** — reuse `hasParticipationSignal` |
| Invented scores / day-count thresholds required? | **NO** — operational facts only |
| Duplicate Inbox / notifications / reporting? | **NO** — Attention excludes those queues |

**Persistence decision:** No new SoT. Journey is a projection over Connection, visits/orientation/JIH, participation signals, existing Responsibility, and connected-Karkun counts. Dashboards deep-link to existing routes.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Attention items; Rukn action panel; journey strip on existing pages |
| Pages | Y | Admin Command Center (builder), Rukn Home, Connection Journey, Person 360 |
| Components | Y | New strip + Rukn action panel; existing Attention panel reused |
| Hooks | N | |
| Services | N | Selectors only |
| Repositories | N | Read existing Work / Responsibility |
| Firestore | N | No schema / rules / collections |
| Dashboard | Y | Derived attention + Rukn now-actions |
| Notifications | N | Untouched |
| Inbox / WhatsApp | N | Untouched |
| Persistence | N | No new writes |
| Routing | N | Existing routes only |
| WI/BM dual-write | N | Untouched |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Duplicate Inbox / Next Actions | **HIGH** if pending intake / WI queues copied into Attention | Attention = exceptions only (overdue Work, connection without development, existing registry health) |
| Duplicate Work / notifications on Rukn Home | **HIGH** if same records listed twice as the action SoT | Now-actions omit Work and occurrence notifications; those stay on existing panels |
| Second journey SoT | **HIGH** if 7-stage campaign journey replaced | Keep campaign journey; add 5-stage product projection |
| Invented thresholds | **HIGH** | No day-count gates in Phase 7 selectors |
| WI/BM / Excused | LOW | No file changes there |

---

## Phase 2 — Plan

1. `continuousKarkunJourney` derived resolver (existing signals only)  
2. Extend `buildAdminAttentionRequired` with overdue Work + connection-without-development  
3. `buildRuknNowActions` + panel on existing Rukn Home  
4. Journey strip on Connection Journey + Person 360 + Rukn Home counts  
5. Focused verify script  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | Journey mapping; attention items have existing routes; Rukn actions dedupe by person |
| Regression | Phase 3/5/6/settings/reliability verifies |
| Architecture | No new `FIRESTORE_COLLECTIONS`; no journey/attention collection |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Software enhancement with evidence? | YES |
| 4–5 | Config / ops only? | NO |
| 6 | Bootstrap? | NO |
| 7–8 | Authn/z? | NO |
| 9–10 | Repos / Firestore schema? | NO (reads only) |
| 11 | Dashboard? | YES — derived items; existing widgets kept |
| 12 | Persistence writes? | NO |
| 13 | New routes? | NO |
| 18 | Existing workflows? | YES — Inbox, notifications, Work panel, campaign journey preserved |

**May implementation start?** YES
