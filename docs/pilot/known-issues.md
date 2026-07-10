# Known Issues — Basavakalyan Pilot V1

Defect and issue log for Pilot V1 acceptance and launch. Update this file during P3 testing and the first week of pilot.

**Severity policy:** Critical or High defects **block go-live**. Medium/Low may ship with workaround.

---

## Severity Definitions

| Level | Definition | Go-live impact |
|-------|------------|----------------|
| **Critical** | Pilot stopped; no workaround (auth down, data loss) | Block |
| **High** | Major feature broken (assignments/visits fail) | Block |
| **Medium** | Degraded experience; workaround exists | Conditional |
| **Low** | Cosmetic / minor | Does not block |

---

## Open Issues

| ID | Severity | Area | Description | Steps / Evidence | Owner | Status |
|----|----------|------|-------------|------------------|-------|--------|
| — | — | — | _No Critical or High issues open at P3 documentation freeze_ | — | — | — |

_Add rows as defects are found during Phases 1–7._

---

## Resolved Issues

| ID | Severity | Area | Description | Resolution | Resolved date |
|----|----------|------|-------------|------------|---------------|
| | | | | | |

---

## Observations (Not Defects)

Items that match [Known Limitations](../operations/known-limitations.md) should be logged here only if they escalate during acceptance.

| ID | Note | Linked limitation |
|----|------|-------------------|
| | | |

---

## First-Week Incident Log

| Date | Severity | Summary | Resolution | Time to resolve |
|------|----------|---------|------------|-----------------|
| | | | | |

---

## Go-Live Gate

| Check | Status |
|-------|--------|
| Critical open count = 0 | ☐ |
| High open count = 0 | ☐ |
| Leadership aware of Medium/Low | ☐ |

When both Critical and High counts are zero and [go-live-approval.md](go-live-approval.md) is signed, pilot may begin.

---

## How to Report

Use this template in the feedback channel:

```
Screen:
Role: Administrator / Rukn
Steps:
Expected:
Actual:
Severity: Critical / High / Medium / Low
Device / Browser:
Screenshot: (if available)
```

Escalate per [Incident Response](../operations/incident-response.md).
