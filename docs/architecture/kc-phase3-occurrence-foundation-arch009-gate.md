# KC Phase 3 Occurrence Foundation — KC-ARCH-009 Gate

**Ticket:** BATCH-03A / TASK-021 (+ TASK-022 absorbed) — Occurrence foundation + recurrence rules  
**Type:** New Feature (Occurrence domain) + Enhancement (recurrence representation; WI schedule bridge)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 2 — CERTIFIED](./kc-phase2-local-programme-arch009-gate.md) · [Phase 2 product/data design](./kc-phase2-product-data-design.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Phase 3 Occurrence foundation + generation horizon  
**Implementation status:** Foundation COMPLETE (TASK-021 / TASK-022) · Generation horizon APPROVED (TASK-023) · History / Calendar / Notifications COMPLETE (TASK-024–026) · Phase 3 CERTIFIED (TASK-027)

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO** · Implementation Phase 5 after coding: see certification section

---

## Approved generation horizon (TASK-023)

**PRODUCT DECISION (authoritative):**

Occurrence generation is bounded by the Local Programme lifecycle window:

`startDate` → `endDate` **inclusive**

| Rule | Decision |
|------|----------|
| Horizon | Only candidates with `startDate <= occurrenceDate <= endDate` |
| Missing / invalid `startDate` or `endDate` | Do **not** invent dates; do **not** fall back to today; skip programme with observable reason |
| Rolling N-day horizon | **Rejected** |
| Same-day-only generic generation | **Rejected** |
| WI `attendanceWindowEngine` same-day open/close | Remains WI attendance behaviour only — **does not** define the generic Occurrence generation horizon |
| WI `attendanceWindowSchedule` | Remains the **recurrence precursor** for `weekly_ijtema` weekday rules inside the programme window |

```
Local Programme (active + valid startDate/endDate)
    ↓
ProgrammeRecurrenceRule / WI schedule (weekly_ijtema)
    ↓
candidate dates within startDate–endDate inclusive
    ↓
deterministic generationKey
    ↓
idempotent durable Occurrence save
```

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Field | Value |
|-------|-------|
| Primary type | **New Feature** |
| Secondary | **Enhancement** (formalise recurrence from `ProgrammeFrequency` + WI weekday-window precursor) |
| Request | Minimum Occurrence domain + recurrence representation under Local Programme; reuse `attendanceWindowEngine` / schedule precursor |
| Not | Automatic generation, Calendar UI, notifications, WI/BM rewrite, participation, Work, Campaign/Karkun changes, Vercel deploy |

### 0.2 Proven need

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Generic Occurrence absent | Architecture | Phase 0 §3.4 — INTRODUCE Phase 3; wrap WI events |
| Recurrence not formalised for generation | Architecture | Phase 2 `ProgrammeFrequency` is config hint only; WI weekday schedule already live |
| Occurrence precursor already live | Implementation boundary | `attendanceWindowEngine` + `attendanceWindowSchedule` — extend, do not replace |
| Separate docs keyed by `programmeId` | Design | Phase 2 §3.1 — no nested occurrence arrays on Local Programme |

**STOP rule:** Evidence sufficient. No speculative WI rewrite.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Calendar / Notifications | N | Explicitly out of scope |
| Types | Y | New Occurrence; recurrence alias/helpers |
| Repositories | Y | OccurrenceRepository (+ local/Firestore) mirroring Local Programme |
| Firestore | Y | `occurrences` collection + Admin rules; no composite indexes this batch |
| Bootstrap / hydrate | Y | Soft background hydrate only |
| WI attendance window | Y (minimal) | Reuse schedule as weekly recurrence source; engine behaviour unchanged |
| Local Programme | Y (light) | `frequency` remains recurrence config SoT; no nested occurrences |
| Campaign / Planning / People | N | |
| Generation jobs / idempotency runners | Y (TASK-023) | Callable domain generator; durable `generationKey`; no new scheduler |

### 0.4 Reuse-first decision

| Candidate | Disposition |
|-----------|-------------|
| `WeeklyIjtemaEvent` | **REUSE as wrap target** — remains WI SoT; Occurrence may optionally `sourceRef` it later; not replaced |
| `attendanceWindowSchedule` day-of-week + timezone + open/close | **EXTEND** — export recurrence descriptors; preserve defaults |
| `attendanceWindowEngine` | **REUSE unchanged** — still opens/closes WI events; no parallel WI generator |
| `ProgrammeFrequency` on Local Programme | **REUSE as recurrence SoT** — alias `ProgrammeRecurrenceRule`; no second frequency field |
| `campaignCycle` | **REUSE conventions** (ISO timestamps / cycle id style) — not a second Occurrence engine |
| New generic RRULE engine | **REJECT** — not justified |

**Architecture conflicts:** None.

### 0.5 Source-of-truth chain (frozen)

```
Local Programme
    ↓
Recurrence configuration (programme.frequency and/or WI attendance window schedule for weekly_ijtema)
    ↓
Occurrence (canonical generated event record; horizon = programme startDate–endDate inclusive)
```

Do **not** create: second Event entity, second Calendar source, separate WI occurrence collection, notification-created events.

---

## Phase 1 — Regression risk

| Area | Risk | Notes |
|------|------|-------|
| WI open/close behaviour | **HIGH** if engine rewritten | Mitigation: do not modify engine open/close logic; verify `verify:kc-028c` |
| Local Programme shape | LOW | Additive comments/alias only |
| Bootstrap | MEDIUM | Soft-empty hydrate; non-critical path |
| Firestore rules | LOW | Admin-only mirror of `localProgrammes` |
| Indexes | LOW | None added this batch (hydrate full-collection; avoid premature indexes) |

HIGH mitigation for WI: reuse schedule exports only; run existing `npm run verify:kc-028c`.

---

## Phase 2 — Implementation plan

1. Types: `Occurrence`, status, optional `sourceRef`, `generationKey`; recurrence helpers over `ProgrammeFrequency` + schedule bridge  
2. Repository contract + local + Firestore (validate `programmeId`)  
3. Collections / storage keys / rules / provider / soft hydrate  
4. Focused verify script + typecheck + `verify:kc-028c`  
5. No generation, UI, indexes, or WI SoT mutation  

**Rollback:** Delete new occurrence modules/collection wiring; WI path untouched.

**Success criteria:** Types compile; durable local CRUD; recurrence serialises; WI window verify still PASS.

---

## Phase 3 — Verification plan

| Check | Evidence |
|-------|----------|
| `npm run typecheck` | exit 0 |
| `npm run verify:kc-028c` | WI precursor unchanged |
| `npm run verify:kc-phase3-occurrence-foundation` | Occurrence CRUD + recurrence serialisation + SoT isolation |

Reject “looks fixed.”

---

## Go / No-Go

| Question | Answer | Impact / Mitigation / Tests |
|----------|--------|------------------------------|
| Touches WI SoT writers? | NO | Engine untouched; 028c verify |
| Parallel Occurrence engine for WI dates? | NO | Schedule reused as recurrence input only |
| Nested occurrences on Local Programme? | NO | Separate `occurrences` docs |
| Automatic generation this batch? | YES (TASK-023 callable) | Horizon = programme startDate–endDate; no scheduler invented |
| Unnecessary indexes? | NO | None |
| Production / Vercel? | NO | Local-first |

**GO.**

---

## After coding — Phases 4–6

- **Phase 4:** Local Occurrence CRUD; recurrence resolve; generation within startDate–endDate; idempotent `generationKey`; WI schedule reuse for `weekly_ijtema`; history/calendar derived reads; notification evaluation hook  
- **Phase 5:** **READY WITH KNOWN LIMITATIONS** — Admin Planning shows Occurrence calendar/history (derived); notification channel dispatch still stubbed (Sprint 17 / Phase 6); Work-linked pending/overdue/report triggers deferred until Phase 4 Work; no production scheduler; no composite indexes; no production / Vercel deploy  
- **Phase 6:** N/A until production deploy authorised  

---

## TASK absorption

| Task | Status |
|------|--------|
| TASK-021 — Occurrence foundation | **COMPLETE** |
| TASK-022 — Recurrence rules | **ABSORBED INTO TASK-021** |
| TASK-023 — Generation | **COMPLETE** (horizon approved; callable generator; no scheduler) |
| TASK-024 — Occurrence history | **COMPLETE** (canonical Occurrence reads; Planning UI) |
| TASK-025 — Calendar | **COMPLETE** (derived from Occurrence; no calendar collection) |
| TASK-026 — Notifications | **COMPLETE** (evaluate/dispatch hook via existing AutomationTrigger; Work categories deferred) |
| TASK-027 — Phase 3 integration | **COMPLETE / PHASE 3 CERTIFIED** |

---

## PHASE 3 — CERTIFIED

| Field | Value |
|-------|-------|
| Decision | **PHASE 3 — CERTIFIED** |
| Date | 2026-08-13 |
| Chain | Programme → Recurrence → Occurrence → History / Calendar / Notifications |
| Verify | `verify:kc-phase3-occurrence-foundation` · `verify:kc-phase3-occurrence-generation` · `verify:kc-phase3-occurrence-operations` · `verify:kc-028c` |
| Limitations | No durable notification inbox; no scheduler; Work-dependent trigger categories deferred; authenticated browser may be unverified without Admin credentials |
