# Known Issues — Basavakalyan Pilot V1

Defect and issue log for Pilot V1 acceptance and launch. Updated after RC1 Final Regression QA (11 July 2026).

**RC1 freeze (`v1.0.0-rc1`):** Only Critical and High severity defects may be fixed before pilot. Enhancements go to the Version 1.1 backlog.

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
| M-01 | Medium | Connections (Rukn) | Available/Replace lists not gender-filtered | Opposite-gender rows visible until validation | 1.1 | **Resolved KC-018** |
| M-02 | Medium | Rukn Campaign Record | Campaign-wide visit/follow-up data shown | Escalates KL-S02 | 1.1 | **Resolved KC-018** |
| M-03 | Medium | Admin mobile | Hamburger drawer UX; use chip nav | AdminLayout / AdminSidebar | 1.1 | Open |
| L-01 | Low | Admin Connections | Dead “View History” control | AssignmentManagementPage | 1.1 | Open |
| L-02 | Low | RuknLayout | Weak contrast on hero user label | PortalAuthActions on dark hero | 1.1 | Open |
| L-03 | Low | Admin search | Placeholder overstates search scope | AdminTopBar → Karkun only | 1.1 | Open |
| L-04 | Low | Session | rememberMePreference cold-reload default | authenticationService module default | 1.1 | Open |

---

## Resolved Issues

| ID | Severity | Area | Description | Resolution | Resolved date |
|----|----------|------|-------------|------------|---------------|
| H-01 | High | Connections — Replace | `replaceKarkun` discarded `currentKarkunId`; wrong Karkun could be replaced when Rukn had multiple connections | Pass `currentKarkunId` to `replaceAssignment`; regression test added | 2026-07-11 |

---

## Observations (Not Defects)

| ID | Note | Linked limitation |
|----|------|-------------------|
| OBS-01 | Auth certified; OTP operational | [AUTHENTICATION-CERTIFICATION.md](../release/AUTHENTICATION-CERTIFICATION.md) |
| OBS-02 | Executions/compliance rule breadth | KL-S01 / KL-S02 |

---

## First-Week Incident Log

| Date | Severity | Summary | Resolution | Time to resolve |
|------|----------|---------|------------|-----------------|
| | | | | |

---

## Go-Live Gate

| Check | Status |
|-------|--------|
| Critical open count = 0 | ✅ |
| High open count = 0 | ✅ |
| Leadership aware of Medium/Low | ☐ |
| RC1 regression report reviewed | ☐ See [RC1-REGRESSION-REPORT.md](../release/RC1-REGRESSION-REPORT.md) |

When both Critical and High counts are zero and [go-live-approval.md](go-live-approval.md) is signed, pilot may begin.

---

## How to Report

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
