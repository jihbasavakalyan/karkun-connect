# KC Phase 8 — Intelligent Monitoring (TASK-069) — KC-ARCH-009 Gate

**Ticket:** BATCH-08C / TASK-069  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [TASK-066](./kc-phase8-contextual-recommendations-arch009-gate.md) · [TASK-065](./kc-phase8-next-best-action-arch009-gate.md) · [KC-020 events](./execution-automation-framework.md) · [Phase 6 notifications](./kc-phase6-certification.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 gate for meaningful-change monitoring over existing intelligence snapshots

TASK-070 / Vercel / Firestore rules / Phase 2 verify string-fix / notification send / Rafeeq TTS are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Deterministic previous→current comparison of TASK-063–066 intelligence state |
| Not | Monitoring DB, second notifications, second NBA, LLM, Rafeeq copy, TTS |

**STOP checks:**

| Check | Result |
|-------|--------|
| Durable monitoring collection? | **NO** — caller passes previous snapshot |
| Replace NBA / Rafeeq? | **NO** — observe only |
| Phase 6 notification engine? | **NO** — signal object only |
| First observation without previous? | **NO event** — baseline only |

**Persistence decision:** No new SoT.

---

## Model

```text
previous IntelligenceMonitorSnapshot + current snapshot
        ↓
fingerprint compare
        ↓
null | IntelligenceMonitorEvent
```

Fingerprint excludes timestamps and prose. Includes: objectiveId, evaluation state, activity state, NBA code, evidence keys, overdue/occurrence dates, routeHint.

Change kinds: `evaluation_state` · `activity_contribution` · `nba` · `recommendation_context`

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | N | Capability only |
| Execution package | Y | Pure monitor selector |
| Firestore / notifications / Rafeeq / voice | N | No imports of presenter/TTS/Phase 6 send |

---

## Phase 1 — Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Duplicate notification engine | **HIGH** | Return events; do not write/send |
| NBA reinterpretation | **HIGH** | Read `action.code` only |
| Noisy repeats | **HIGH** | Same fingerprint → no event |
| LLM | **HIGH** | Structured compare only |

---

## Phase 2 — Plan

1. `captureIntelligenceMonitorSnapshot` + `detectMeaningfulIntelligenceChange`  
2. Batch diff over TASK-066 recommendations  
3. Focused verify  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

No-change · evaluation transitions · activity contribution · NBA change · recommendation context · stable fingerprint · architecture greps · TASK-063–068 + KC-020 + Phase 3–7 + settings + reliability.

Browser: UNVERIFIED if no credentials.

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Proven software enhancement? | YES — intelligence layers exist; no change detector |
| 4–8 | Config / ops / bootstrap / auth? | NO |
| 9 | Repositories? | YES — read via TASK-066 loader only |
| 10–12 | Firestore / dashboard / persistence writes? | NO |
| 13–16 | Routing / cache / async / races? | NO — pure compare |
| 17 | Production startup? | NO |
| 18 | Existing workflows? | YES — TASK-063–068 and Phase 6 unchanged |

**May implementation start?** YES
