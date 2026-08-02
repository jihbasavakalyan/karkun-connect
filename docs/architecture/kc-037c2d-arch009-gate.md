# KC-037C2D — Separate Weekly Ijtema Commitment from Weekly Attendance (ARCH-009 Gate)

**Classification:** Enhancement (SoR decoupling + terminology)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037C2A Matrix commitment SoR preserved independently of weekly ops  
**Scope:** Reminder on event marks; Commitment ladder on legacy `ijtema_*`; no Firestore redesign; no data reset.

## Phase 0

**Need:** “Invited for Weekly Ijtema” conflated one-time campaign commitment with recurring weekly reminder/attendance. Separate them.

| Concept | SoR | Weekly reset? |
|---------|-----|---------------|
| Weekly Ijtema Commitment | Legacy `ijtema_*` + campaign remarks | No |
| Today's Reminder / Attendance | Event submission marks (`reminded?` + Present/Absent) | Per open event |

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Matrix Commitment labels; dashboard Reminded metrics |
| Write adapter | Y | Stop Matrix auto-ensure; set `reminded` on Present/Absent/Reminded |
| Counts helper | Y | Reminder from marks only; not Matrix invitation |
| Health / KPI / C4 | Y | Reminder % / Attendance % Present÷Reminded |
| Matrix cycle | Y | Full Commitment ladder via remarks |
| Firestore schema | Soft | Optional `reminded` on marks only |
| Campaign Report | Label/feed only | KC-033 WI pair kept (ops Present÷Reminded) |
| Data migration | N | Backward-compat remark mapping |

## Phase 1

| Domain | Risk | Mitigation |
|--------|------|------------|
| Matrix mutated by attendance | **HIGH** | Remove `ensureWeeklyIjtemaInvitedFromAttendance` from attendance writes |
| Marks schema | **MEDIUM** | Optional `reminded`; Present/Absent imply reminded |
| Sticky commitment history | **HIGH** | Map legacy Invited/Not Invited/Excused → Commitment states |
| Verify scripts (C2C) | **MEDIUM** | Update to Reminder independence rules |

## Phase 2

1. ARCH gate (this doc)  
2. `reminded?: boolean` + Reminder counts  
3. Matrix Commitment remarks + cycle + chips  
4. Dashboard / register / Weekly Attendance Report terminology  
5. `verify:kc-037c2d` (+ align C2C/C4 where needed)

## Phase 3

- Commitment unchanged after Present/Absent  
- Present/Absent ⇒ `reminded=true`  
- Reminded-only without attendance  
- Reminder % = Reminded÷Connected; Attendance % = Present÷Reminded  
- Campaign Report structure unchanged (ops WI KPI)

## Go / No-Go

| Question | Answer |
|----------|--------|
| New Firestore collections / data reset? | **NO** |
| Soft `reminded` on marks required? | **YES** |
| Full Commitment ladder on Matrix? | **YES** |
| Proceed? | **GO** |

## Phase 5 — Certification target

**READY** when typecheck/build/verify pass and Production deploy succeeds with smoke of Dashboard, Weekly Ijtema, Matrix, Report Center.
