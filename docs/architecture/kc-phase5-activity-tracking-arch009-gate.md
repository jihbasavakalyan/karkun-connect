# KC Phase 5 Activity Tracking — KC-ARCH-009 Gate

**Ticket:** BATCH-05B / TASK-038 + TASK-039 + TASK-040 + TASK-041  
**Type:** Enhancement (integrate existing activity SoTs with Programme → Occurrence)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 2 product/data design](./kc-phase2-product-data-design.md) · [Phase 3 Occurrence gate](./kc-phase3-occurrence-foundation-arch009-gate.md) · [Phase 4 certification](./kc-phase4-certification.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Phase 5 activity tracking (WI / Occurrence wrap / orientation / BM)  
**Implementation status:** COMPLETE (local-first; no production / Vercel deploy)

---

## ARCH-009 STATUS

**PASS** (design + implementation gate) · **Go/No-Go: GO** · **Phase 5: READY WITH KNOWN LIMITATIONS**

Production remains unchanged. No Vercel deploy.

---

## Approved product decision — TASK-037 (authoritative)

**PRODUCT DECISION (recorded here; not a separate documentation session):**

For the existing Weekly Ijtema event, Rukn attendance is:

**Invited → Present / Absent**

| Rule | Decision |
|------|----------|
| Where it is recorded | Existing Weekly Ijtema event / canonical submission (`weeklyIjtemaSubmission`) |
| Default state | **Invited** (no extra write required) |
| Marked states | **Present** or **Absent** on the same submission document |
| Generic participation entity | **Rejected** |
| Fourth Weekly Ijtema writer | **Rejected** — extend the existing canonical submission writer |
| Matrix `Committed` | Remains a separate Matrix remark concept |
| `Committed` vs `Present` | **`Committed ≠ Present`** |
| Karkun attendance | Unchanged (`reminded` → Present / Absent on karkun marks) |
| Register-submission as Rukn signal | **Rejected** — Rukn self-attendance is an explicit field on the existing event submission |

This closes Phase 0 deferred decision **A** (Rukn Ijtema Present/Absent semantics) without inventing a participation table.

```
Programme
    ↓
Occurrence          (generic scheduling / occurrence context)
    ↓
Existing activity source of truth
    ├── Weekly Ijtema event + submission   (Karkun marks + Rukn Invited→Present/Absent)
    ├── Orientation journey signal         (existing hasOrientationSignal)
    └── Bait-ul-Maal cycle + submission    (Contributed/Pending ≡ Paid/Unpaid)
```

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Secondary | Integration of completed Occurrence layer with existing WI / BM / orientation SoTs |
| Request | TASK-038–041 in one batch; record TASK-037 decision |
| Not | Generic participation, fourth WI writer, WI/BM redesign, Excused/Exempt resolution, reporting, Campaign/Local Programme/Work/Responsibility changes, Vercel deploy |

### 0.2 Proven need

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Rukn Present/Absent absent on WI event | Architecture | Phase 0 §3.4 — field does not exist; TASK-037 decided Invited→Present/Absent on the existing event |
| Occurrence `sourceRef` unused | Implementation | Type exists (`weekly_ijtema_event` / `monthly_baitul_maal_cycle`); generation does not populate it |
| Orientation attendance | Architecture | Phase 0: “WI submissions (and orientation later)”; existing SoT is journey `hasOrientationSignal`, not a programme attendance store |
| BM wrap | Architecture | Cycle track remains BM SoT; Occurrence may reference, not replace |

**STOP rule:** Evidence sufficient. Existing WI submission can hold Rukn attendance without a new entity. No speculative participation engine.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Rukn WI register: self-attendance; Admin WI report: Rukn attendance column |
| Pages | Y | `WeeklyIjtemaRegisterPage`, `AdminWeeklyIjtemaReportPage` |
| Components | N | Open card remains Karkun-register progress |
| Hooks | N | Reuse `useWriteLifecycle` |
| Services | Y | Extend `weeklyIjtemaService` canonical submission writer |
| Repositories | Y (light) | Occurrence `sourceRef` via existing `saveDurable`; WI submissions via existing compliance save |
| Firestore | Y (additive) | Optional `ruknAttendance` on existing submission records; `sourceRef` already on Occurrence |
| Authentication / Authorization / Session | N | |
| Bootstrap | N | No new collection / hydrate |
| Dashboard | Y (light) | Rukn register + Admin report only |
| Metrics / Campaign / Automation / Notifications / Voice | N | |
| API | N | |
| Caching | N | Existing WI store |
| Persistence | Y | Additive fields; merge-on-write preserves karkun marks ↔ Rukn attendance |
| Routing / State / Background | N | |
| Performance / Monitoring / Logging | N | Structured via existing persist path |
| Security / Dependencies | N | |
| Local Programme / Campaign / Work / Responsibility / People schemas | N | Explicitly out of scope |
| WI attendance-window engine open/close | N | Unchanged |
| WI/BM dual-write | N | Untouched (including deferred Exempt) |

### 0.4 Reuse-first decision

| Candidate | Disposition |
|-----------|-------------|
| `WeeklyIjtemaSubmission` + `upsertWeeklyIjtemaSubmission` | **EXTEND** — add optional `ruknAttendance`; same writer |
| `weeklyIjtemaWriteAdapter` | **REUSE unchanged** — Karkun attendance + Matrix commitment only; not a Rukn-attendance writer |
| Legacy `ijtema_*` | **REUSE** — commitment / compatibility only |
| Occurrence `sourceRef` | **EXTEND** — populate from matching WI event / BM cycle; Occurrence does not store attendance |
| `attendanceWindowEngine` | **REUSE unchanged** — open/close behaviour not modified |
| `hasOrientationSignal` | **REUSE** — orientation attendance SoT |
| BM cycle + `updateMonthlyBaitulMaalContribution` dual-write | **REUSE unchanged** |
| New participation collection / generic attendance engine | **REJECT** |

**Architecture conflicts:** None.

---

## Phase 1 — Regression risk

| Area | Risk | Notes |
|------|------|-------|
| WI Karkun attendance | **HIGH** if submission overwrite drops marks | Mitigation: preserve `marks` when writing Rukn attendance; preserve `ruknAttendance` when writing karkun marks |
| Fourth WI writer | **HIGH** if a new persist path is added | Mitigation: only `upsertWeeklyIjtemaSubmission` |
| Matrix `Committed` | **HIGH** if conflated with Present | Mitigation: Rukn attendance never calls commitment writer; verify script asserts isolation |
| Occurrence replacing WI SoT | **HIGH** if Occurrence writes WI events | Mitigation: linker writes Occurrence `sourceRef` only |
| BM Exempt / dual-write | **HIGH** if BM adapter is edited | Mitigation: do not modify BM write adapter |
| Generic attendance | **HIGH** if other programme kinds gain tracking | Mitigation: policy allows event attendance only for `weekly_ijtema` |
| WI window engine | LOW | Not modified |
| Bootstrap / auth | LOW | Unchanged |

HIGH items: Why / Impact / Mitigation / Verification / Rollback are in the table above. Rollback: revert this batch; WI karkun path and BM dual-write remain the prior SoTs.

---

## Phase 2 — Implementation plan

1. Types: `ruknAttendance` on `WeeklyIjtemaSubmission`; `resolveWeeklyIjtemaRuknAttendanceState` (default Invited)  
2. Service: `upsertWeeklyIjtemaRuknAttendance` via existing submission upsert; preserve marks ↔ Rukn field  
3. Occurrence linker: match WI event by date + audience; BM cycle by `monthKey`; set `sourceRef` only  
4. Generation: optional activity catalog so new/preserved rows can receive `sourceRef` without mutating WI/BM  
5. Orientation policy: existing journey signal; no event attendance for other programme kinds  
6. UI: Rukn self-attendance on register; Admin report column  
7. Docs: this gate (TASK-037 decision)  
8. Verify: typecheck + existing WI / BM / Occurrence / window scripts + focused Phase 5 script  

**Rollback:** Revert the batch. No production data migration. Additive fields are ignored by older readers.

**Success criteria:** Rukn Invited→Present/Absent on canonical WI submission; `Committed` distinct; Karkun marks unchanged; Occurrence links via `sourceRef`; orientation not generalized; BM Paid/Unpaid + dual-write intact.

---

## Phase 3 — Verification plan

| Check | Evidence |
|-------|----------|
| `npm run typecheck` | exit 0 |
| `npm run verify:kc0107` | existing WI |
| `npm run verify:kc0108` | existing BM + WI lifecycle regression |
| `npm run verify:kc-028c` | WI window precursor unchanged |
| `npm run verify:kc-phase3-occurrence-foundation` | Occurrence foundation |
| `npm run verify:kc-phase3-occurrence-generation` | generation + SoT isolation |
| `npm run verify:kc-phase5-activity-tracking` | Rukn state, writer count, sourceRef, orientation policy, BM dual-write intact |
| Cold start / hard refresh / login | Local-only; browser smoke if credentials present — do not recover credentials |
| Production smoke | **Out of scope** — no Vercel / production |

Reject “looks fixed.”

---

## Go / No-Go

| # | Question | Answer | Impact / Mitigation / Tests |
|---|----------|--------|------------------------------|
| 1 | Root cause proven? | **YES** | Phase 0 gap + TASK-037 decision |
| 2 | Objective evidence? | **YES** | Types, adapters, Occurrence `sourceRef`, journey orientation |
| 3 | Software problem? | **YES** | Integration, not ops/config |
| 4 | Configuration? | **NO** | |
| 5 | Operational? | **NO** | |
| 6 | Bootstrap? | **NO** | |
| 7 | Authentication? | **NO** | |
| 8 | Authorization? | **NO** | Existing WI submission path |
| 9 | Repositories? | **YES** | Occurrence `saveDurable` for `sourceRef`; existing compliance WI save. Tests: Phase 3 + Phase 5 verify |
| 10 | Firestore? | **YES** | Additive `ruknAttendance` on existing docs. No new collection / indexes |
| 11 | Dashboard? | **YES** | Rukn register + Admin report column only |
| 12 | Persistence? | **YES** | Merge-on-write; `verify:kc0107` + Phase 5 |
| 13 | Routing? | **NO** | |
| 14 | Caching? | **NO** | |
| 15 | Async dependencies? | **YES** | Existing `saveDurable` / write queue. No new queue |
| 16 | Race conditions? | **YES** | Concurrent karkun mark + Rukn attendance on one submission — preserve the other field |
| 17 | Production startup? | **NO** | Local-first |
| 18 | Existing workflows? | **YES** | WI karkun attendance, commitment, BM dual-write, window engine — existing verifies |

**GO.**

STOP conditions not triggered: WI submission supports the state; no fourth writer; Occurrence does not replace WI/BM; Exempt untouched; no generic participation engine; no new product decision beyond TASK-037.

---

## After coding — Phases 4–6

### Phase 4 — Post-implementation impact audit

| Check | Result |
|-------|--------|
| Existing WI Karkun attendance | **PASS** — `verify:kc0107` |
| WI open/close window | **PASS** — `verify:kc-028c` |
| BM cycle + dual-write | **PASS** — `verify:kc0108`; adapter dual-write / Exempt untouched |
| Occurrence foundation / generation / operations | **PASS** |
| Bootstrap / auth / routing | **N/A** — not modified |
| No fourth WI writer | **PASS** — Rukn attendance uses `upsertWeeklyIjtemaSubmission` |
| No generic participation | **PASS** |
| Production / Vercel | **Not deployed** |

**Workflows tested (local automated):** create/open/close/reopen WI event; Karkun mark Present/Absent; Rukn Invited→Present/Absent on same submission; Matrix Committed isolated; Occurrence `sourceRef` wrap to WI event without mutating WI; orientation journey SoT unchanged; BM cycle Paid/Unpaid (Contributed/Pending) + sourceRef wrap.

- **Phase 5:** Official certification is [kc-phase5-certification.md](./kc-phase5-certification.md) (TASK-045). This batch remains **READY WITH KNOWN LIMITATIONS** as an activity-tracking baseline.  
- **Phase 6:** N/A until production deploy authorised. Do **not** start TASK-046.

---

## TASK absorption

| Task | Status |
|------|--------|
| TASK-037 — Rukn attendance product decision | **DECIDED** (recorded in this document) |
| TASK-038 — Weekly Ijtema integration | **COMPLETE** |
| TASK-039 — Occurrence → Weekly Ijtema | **COMPLETE** |
| TASK-040 — Orientation attendance | **COMPLETE** |
| TASK-041 — Bait-ul-Maal integration | **COMPLETE** |

TASK-042–044 (Mansooba reporting) and TASK-045 (Phase 5 certification) are recorded in [kc-phase5-certification.md](./kc-phase5-certification.md). Do **not** start Phase 6 / TASK-046.

---

## Activity-tracking baseline (superseded for Phase 5 close)

This table remains the TASK-038–041 baseline. Official Phase 5 close is [kc-phase5-certification.md](./kc-phase5-certification.md).

| Field | Value |
|-------|-------|
| Decision | **READY WITH KNOWN LIMITATIONS** (activity-tracking batch) |
| Date | 2026-08-13 |
| Chain | Programme → Occurrence → existing WI / orientation journey / BM SoTs |
| Verify | `typecheck` · `verify:kc0107` · `verify:kc0108` · `verify:kc-028c` · `verify:kc-phase3-occurrence-foundation` · `verify:kc-phase3-occurrence-generation` · `verify:kc-phase5-activity-tracking` |
| Limitations | No production / Vercel; Excused/Exempt unresolved; orientation remains journey-signal SoT; Occurrence `sourceRef` is a wrap link, not attendance storage |
