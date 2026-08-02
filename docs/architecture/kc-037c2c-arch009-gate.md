# KC-037C2C — Weekly Ijtema Invitation Workflow Option A (ARCH-009 Gate)

**Classification:** Enhancement (automatic invitation↔attendance state bridge)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037C2A isolation preserved for Matrix SoR  
**Scope:** Option A auto-transition; dashboard + provider %; no Firestore redesign.

## Phase 0

**Need:** Measure Rukn invitation effort and Karkun attendance without duplicate taps. Present/Absent must auto-mark Invited; Invitation persists across Present↔Absent.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Write adapter | Y | Present/Absent → ensure Invitation=Invited |
| `saveWeeklyIjtemaSubmission` | Y | Same ensure after submit |
| Progress / Health / KPI | Y | Invited counts; Attendance %=Present÷Invited; Invitation %=Invited÷Connected |
| Dashboard open card | Y | Invited / Present / Absent / Pending |
| Matrix invitation column | N | Remains independent legacy SoR |
| Firestore schema | N | Reuse legacy invitation + event marks |
| C4 report | Y | Consume provider Present÷Invited |

## Phase 1

| Domain | Risk | Mitigation |
|--------|------|------------|
| C2A isolation | **HIGH** | Matrix still invitation-only; attendance never writes Not Invited; only upgrades to Invited |
| Health % change | **HIGH** | Single counts helper; verify scripts |
| Production Present/Absent | **HIGH** | No reset; implied invited if attendance marked |

## Phase 2

1. Shared invitation/attendance counts helper  
2. `ensureWeeklyIjtemaInvitedFromAttendance` on Present/Absent writes  
3. Extend progress + KPI + Health  
4. Dashboard 4 metrics  
5. Report model definitions/%  
6. `verify:kc-037c2c` + keep `verify:kc-037c2a`

## Phase 3

- Invited-only does not create attendance  
- Present/Absent auto Invited  
- Present↔Absent keeps Invited  
- Pending = Connected − InvitedOnly − Present − Absent  
- Attendance % = Present ÷ InvitedTotal  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Merge invitation into event mark enum? | **NO** |
| Firestore redesign / data reset? | **NO** |
| Matrix becomes attendance? | **NO** |
| Proceed Option A? | **GO** |

## Phase 4 — Regression audit

- `verify:kc-037c2c` 5/5  
- `verify:kc-037c2a` passed (Matrix isolation retained)  
- `verify:kc-037c4` · `verify:kc-033` passed  

## Phase 5 — Certification

**READY** — Option A auto-transition; Attendance %=Present÷Invited; Matrix invitation independent; no Firestore redesign.

## Phase 6 — Post-deploy

*(after deploy)* Mark Present without prior Invited; flip Present↔Absent; confirm dashboard Invited/Present/Absent/Pending; Invitation % / Attendance %.
