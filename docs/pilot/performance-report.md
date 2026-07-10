# Performance Report — P3 Phase 6

**Project:** Karkun Connect — Basavakalyan Pilot  
**Tester:** _name_  
**Date:** _YYYY-MM-DD_  
**Build / commit:** _hash_  
**URL:** _https://..._  
**Network:** Wi-Fi / 4G / _other_  
**Device:** Desktop _ / Mobile _

---

## Objective

Measure key user-facing operations. Pilot acceptance: **no obvious delays** that block field work.

Baseline architecture review: [Performance Review (P1)](../operations/performance-review.md).

---

## Measurement Method

- Browser DevTools → Network + Performance (or stopwatch for UX timing)
- Cold = first load after cache clear
- Warm = subsequent navigation in same session
- Record p50-style observation (typical), not worst-case only

---

## Timing Targets (Pilot)

| Operation | Target (warm) | Target (cold) | Measured | Pass |
|-----------|---------------|---------------|----------|------|
| Login → Admin dashboard | < 3 s | < 8 s | | ☐ |
| Login → Rukn dashboard | < 3 s | < 8 s | | ☐ |
| Dashboard navigation (admin) | < 1.5 s | — | | ☐ |
| Search (Karkun list) | < 500 ms filter | — | | ☐ |
| Connection page load | < 2 s | < 5 s | | ☐ |
| Execution page load | < 2 s | < 5 s | | ☐ |
| Import Rukn Master | < 30 s | — | | ☐ |
| Import Karkun Master | < 60 s | — | | ☐ |
| Export JSON backup | < 15 s | — | | ☐ |
| Record Visit submit | < 3 s | — | | ☐ |

---

## Firestore Metrics

| Metric | Observation | Acceptable | Pass |
|--------|-------------|------------|------|
| Reads on admin login (hydration) | _n_ | Pilot scale OK | ☐ |
| Writes on single assignment | _n_ | Batch replace OK | ☐ |
| Writes on visit submit | _n_ | Single/batch OK | ☐ |
| Listener count (steady state) | ~9 collections | Expected | ☐ |
| Index errors in console | None | Required | ☐ |

**Notes:** Full collection hydration is a known limitation (KL-D01) and is acceptable at ~49 Rukns / ~493 Karkuns.

---

## Mobile Responsiveness

| Viewport | Page | Layout OK | Interaction OK | Pass |
|----------|------|-----------|----------------|------|
| 360px | Rukn Home | ☐ | ☐ | ☐ |
| 390px | Visit form | ☐ | ☐ | ☐ |
| 768px | Admin dashboard | ☐ | ☐ | ☐ |
| 1280px | Admin Connections | ☐ | ☐ | ☐ |

---

## Subjective Assessment

| Question | Answer |
|----------|--------|
| Any operation felt "stuck"? | ☐ No / ☐ Yes — _describe_ |
| Search usable with 493 Karkuns? | ☐ Yes / ☐ No |
| Mobile visit form usable in field? | ☐ Yes / ☐ No |

---

## Defects / Follow-ups

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| | | | |

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** — no obvious delays blocking pilot | ☐ |
| **Fail** | ☐ |

| Role | Name | Date |
|------|------|------|
| Tester | | |
| Technical Lead | | |

---

## Related

- [Known Limitations](../operations/known-limitations.md) — KL-D01, KL-D02
- [Monitoring](../operations/monitoring.md)
