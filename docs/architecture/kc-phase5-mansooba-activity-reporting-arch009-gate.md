# KC Phase 5 — Meqati Mansooba Activity Reporting (KC-ARCH-009 Gate)

**Ticket:** BATCH-05C / TASK-042 + TASK-043 + TASK-044  
**Type:** Enhancement (derived reporting consumer)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Date:** 2026-08-13  
**Implementation status:** COMPLETE (local-first; no production / Vercel deploy)

---

## ARCH-009 STATUS

**PASS** · **Go/No-Go: GO** · **READY WITH KNOWN LIMITATIONS**

This batch does **not** reproduce an external JIH/Basavakalyan form. It produces weekly / monthly / yearly **derived** views of actual execution against a Meqati Mansooba.

---

## Reporting model (TASK-042)

```
Meqati Mansooba
    → Objectives (direct)
    → Campaign (optional mansoobaId / objectiveIds)
    → Local Programmes
    → Occurrences (scheduled activity)
    → WI / BM / Work (execution SoTs; read-only)
    → Weekly / Monthly / Yearly report (derived; not a SoT)
```

| Question | Class | Source |
|----------|-------|--------|
| What was planned? | AUTO | Local Programmes whose Campaign `mansoobaId` matches |
| What was scheduled? | AUTO | Occurrences in period with `status !== archived` |
| What actually occurred? | DERIVED | Occurrence `open`/`closed`, or matching WI event / BM cycle via `sourceRef` |
| What was completed? | DERIVED | Occurrence `closed`, or WI event `Closed`, or BM cycle `Closed`, or Work `done` |
| What remains pending? | DERIVED | Scheduled not completed; Work `pending` / `in_progress` |
| Objective progress | DERIVED | Per-objective completed/scheduled from programmes whose Campaign `objectiveIds` include the Objective |
| Attention / exceptions | DERIVED | Past-dated still-scheduled occurrences; overdue Work; WI event with no marks |
| WI attendance | AUTO | Existing WI submission marks (Present / Absent / reminded) |
| BM Paid/Unpaid | AUTO | Existing BM cycle marks (Contributed / Pending) |
| Orientation in-period | **GAP** | Journey signal is not period-scoped — omitted |
| Performance scores | **GAP** | No approved score formula — not invented |
| Manual narrative | **None** | Attention is derived; no stored achievements/challenges |

Mansooba totals count each Occurrence **once**. A Campaign that lists multiple `objectiveIds` may show the same programme under each Objective; mansooba totals still de-duplicate.

### Periods (Asia/Karachi)

Reuse existing timezone (`DEFAULT_OCCURRENCE_TIMEZONE` / WI schedule = `Asia/Karachi`) and Sunday week-ending convention from `getWeekEndingDate` (Monday–Sunday inclusive on the Karachi civil calendar).

| Period | Boundary |
|--------|----------|
| Weekly | Monday → Sunday (week ending Sunday) |
| Monthly | Calendar month `YYYY-MM` |
| Yearly | Calendar year `YYYY` |

Monthly / yearly aggregates are **unions of Occurrences in the window**, not stored weekly snapshots and not summed weekly reports.

### Work attribution

Work has no programme/occurrence FK. Include Work when `dueDate` is in the period **and** `mansooba.primaryUnitId` is set and equals `work.unitId`. Otherwise Work is a documented GAP for that Mansooba.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| Types / lib | Y | Pure derivation module |
| Admin UI | Y | Planning page section (read-only) |
| Repositories | Y (read) | Existing loadAll only |
| WI / BM / Work / Occurrence / Programme / Mansooba | N (writes) | Consumer only |
| Firestore / new collections | N | |
| Bootstrap / auth / routing | N | |
| Campaign / Responsibility | N | |

**Reuse:** Planning page, `getRepositories()`, Occurrence/Work/Programme/Mansooba types, WI/BM stores (read), `getZonedClockParts` / Karachi timezone, Sunday week-ending.

**Reject:** reporting collection, generic report builder, KPI warehouse, service wrapper, SoT writes.

---

## Phase 1 — Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Duplicate counting | HIGH | Unique Occurrence ids at Mansooba; monthly/yearly from date window not weekly sums |
| SoT mutation | HIGH | Builder is pure; verify greps no save/upsert |
| Invented scores | HIGH | None |
| WI/BM semantics | LOW | Read existing marks only |

---

## Phase 2 — Plan

1. Period helpers (Karachi + Sunday week-ending)  
2. Pure `buildMansoobaActivityReport`  
3. Admin Planning presentation  
4. Gate doc + focused verify + typecheck/build + Phase 5 activity verify  

**Rollback:** delete new lib/UI/docs; operational data unchanged.

---

## Phase 3 — Verification

`typecheck` · `build` · `verify:kc-phase5-activity-tracking` · `verify:kc-phase5-mansooba-activity-reporting`

---

## Go / No-Go

| # | Q | A |
|---|---|---|
| 1–3 | Proven software enhancement | YES |
| 4–5 | Config/ops | NO |
| 6–8 | Bootstrap/authz | NO |
| 9 | Repositories | YES — read-only `loadAll` |
| 10 | Firestore | NO — no new collection |
| 11 | Dashboard | NO — Planning page only |
| 12 | Persistence | NO |
| 13–14 | Routing/cache | NO |
| 15–16 | Async/races | NO — derived read |
| 17 | Production startup | NO |
| 18 | Existing workflows | YES — read-only; WI/BM/Phase 5 verifies |

**GO.** STOP conditions not triggered: chain via Campaign links is sufficient; periods reuse Karachi + Sunday week-ending; no new store; no SoT writes.

---

## After coding

- **Phase 4:** WI/BM/Work/Occurrence writes not used; empty/archived/multi-objective cases covered by verify  
- **Phase 5:** Official certification is [kc-phase5-certification.md](./kc-phase5-certification.md) (TASK-045). This batch remains **READY WITH KNOWN LIMITATIONS**.  
- **Phase 6:** N/A until production deploy authorised. Do **not** start TASK-046.

| Task | Status |
|------|--------|
| TASK-042 | COMPLETE |
| TASK-043 | COMPLETE |
| TASK-044 | COMPLETE |
| TASK-045 | COMPLETE / PHASE 5 CERTIFIED |
