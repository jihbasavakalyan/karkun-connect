# KC Phase 3 Occurrence Foundation — KC-ARCH-009 Gate

**Ticket:** BATCH-03A / TASK-021 (+ TASK-022 absorbed) — Occurrence foundation + recurrence rules  
**Type:** New Feature (Occurrence domain) + Enhancement (recurrence representation; WI schedule bridge)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 2 — CERTIFIED](./kc-phase2-local-programme-arch009-gate.md) · [Phase 2 product/data design](./kc-phase2-product-data-design.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Phase 3 foundation only (no automatic generation)  
**Implementation status:** Design + foundation contracts (TASK-021 / TASK-022)

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO** · Implementation Phase 5 after coding: see certification section

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
| Generation jobs / idempotency runners | N | Foundation only (`generationKey` field reserved) |

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
Occurrence (canonical generated event record — generation in a later task)
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
| Automatic generation this batch? | NO | `generationKey` reserved only |
| Unnecessary indexes? | NO | None |
| Production / Vercel? | NO | Local-first |

**GO.**

---

## After coding — Phases 4–6

- **Phase 4:** Local Occurrence CRUD; recurrence resolve (WI schedule + ProgrammeFrequency); WI window regression via `verify:kc-028c` — PASS  
- **Phase 5:** **READY WITH KNOWN LIMITATIONS** — no Admin Occurrence UI; no automatic generation; no composite indexes; no production / Vercel deploy  
- **Phase 6:** N/A until production deploy authorised  

---

## TASK absorption

| Task | Status |
|------|--------|
| TASK-021 — Occurrence foundation | **COMPLETE** |
| TASK-022 — Recurrence rules | **ABSORBED INTO TASK-021** |
| TASK-023 — Generation | NOT STARTED — STOP |
