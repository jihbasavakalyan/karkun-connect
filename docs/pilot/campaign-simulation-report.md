# Campaign Simulation Report — P3 Phase 3

**Project:** Karkun Connect — Basavakalyan Pilot  
**Simulation date:** _YYYY-MM-DD_  
**Facilitator:** _name_  
**Build / commit:** _hash_  
**URL:** _https://..._

---

## Objective

Run the application **exactly as the Basavakalyan team will** — no shortcuts, no mock steps.

---

## Simulation Path

```
Administrator Login
    ↓
Campaign Setup
    ↓
Import Rukn + Karkun Masters
    ↓
Connect Karkuns
    ↓
Rukn Login (OTP)
    ↓
Visit + Record
    ↓
Compliance Updates
    ↓
Communication
    ↓
Reports
    ↓
Campaign Review
```

---

## Step Log

| Step | Actor | Action | Start | End | Pass | Notes |
|------|-------|--------|-------|-----|------|-------|
| 1 | Administrator | Login | | | ☐ | |
| 2 | Administrator | Create/confirm campaign | | | ☐ | |
| 3 | Administrator | Import Rukn Master (49) | | | ☐ | |
| 4 | Administrator | Import Karkun Master (~493) | | | ☐ | |
| 5 | Administrator | Verify dashboard counts | | | ☐ | |
| 6 | Administrator | Connect 2+ Karkuns to pilot Rukn | | | ☐ | |
| 7 | Rukn | Login with registered mobile + OTP | | | ☐ | |
| 8 | Rukn | View Today's Work + connected list | | | ☐ | |
| 9 | Rukn | Record visit (Annexure-1) | | | ☐ | |
| 10 | Rukn | Update journey stage | | | ☐ | |
| 11 | Administrator | View Execution — visit visible | | | ☐ | |
| 12 | Administrator | Update compliance (Ijtema/JIH/BM) | | | ☐ | |
| 13 | Administrator | Open Communication templates | | | ☐ | |
| 14 | Administrator | Execution → Reports | | | ☐ | |
| 15 | Administrator | Campaign review — metrics accurate | | | ☐ | |
| 16 | Both | Logout | | | ☐ | |

---

## Data Consistency Checkpoints

| Checkpoint | Administrator view | Rukn view | Match |
|------------|-------------------|-----------|-------|
| After connect | Connections list | My Karkun | ☐ |
| After visit | Execution | Campaign record | ☐ |
| After compliance | Dashboard metrics | N/A (admin) | ☐ |

---

## Multi-Device Sync (within simulation)

| Action | Device A | Device B | Synced |
|--------|----------|----------|--------|
| Admin assigns | Admin laptop | Rukn phone | ☐ |
| Rukn records visit | Rukn phone | Admin laptop | ☐ |

---

## Issues Encountered

| Step | Issue | Severity | Resolution |
|------|-------|----------|------------|
| | | | |

---

## Timing Summary

| Phase | Duration | Acceptable |
|-------|----------|------------|
| Full simulation | _minutes_ | ☐ |
| Longest single step | _step / minutes_ | ☐ |

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** — full path completed without Critical/High defects | ☐ |
| **Fail** | ☐ |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Facilitator | | | |
| Pilot Lead | | | |
| Administrator | | | |
| Rukn (participant) | | | |

---

## References

- [Pilot Runbook](../operations/pilot-runbook.md)
- [Administrator Manual](../operations/administrator-manual.md)
- [M6 Phase 4 Pilot Readiness](../m6-phase4-pilot-readiness-report.md)
