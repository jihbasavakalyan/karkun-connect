# Smoke Test Report — P3 Phase 4

**Project:** Karkun Connect — Basavakalyan Pilot  
**Tester:** _name_  
**Date:** _YYYY-MM-DD_  
**Build / commit:** _hash_  
**URL:** _https://..._  
**Browsers:** Chrome _ / Edge _ / Safari mobile _

---

## Objective

Exercise every page, menu, button, dialog, search, filter, table, export, import, and UI state (empty, loading, error).

Automated regression: `npm run verify:rc1` (see Automated section).

---

## Automated Smoke

| Command | Result | Date |
|---------|--------|------|
| `npm run lint` | ☐ Pass | |
| `npm run build` | ☐ Pass | |
| `npm run verify:production` | ☐ Pass | |
| `npm run verify:rc1` | ☐ Pass | |

---

## Authentication Pages

| # | Area | Test | Pass |
|---|------|------|------|
| S1 | Login | Role toggle Administrator / Rukn | ☐ |
| S2 | Login | Email form validation | ☐ |
| S3 | Login | Mobile form validation | ☐ |
| S4 | Login | Forgot password link | ☐ |
| S5 | Login | Error states (bad credentials) | ☐ |
| S6 | Login | Loading state on submit | ☐ |

---

## Administrator — Pages and Navigation

| Route | Page loads | Nav active | Search | Filter | Primary CTA | Pass |
|-------|------------|------------|--------|--------|-------------|------|
| `/admin` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/campaign` | ☐ | ☐ | — | ☐ | ☐ | ☐ |
| `/admin/rukn` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/karkun` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/assignments` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/execution` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/compliance` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/follow-up` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/communication` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/lists` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `/admin/settings` | ☐ | ☐ | — | — | ☐ | ☐ |
| `/admin/help` | ☐ | ☐ | — | — | — | ☐ |

---

## Administrator — Dialogs and Actions

| # | Action | Dialog opens | Save/Cancel | Pass |
|---|--------|--------------|-------------|------|
| S7 | Add/Edit Rukn | ☐ | ☐ | ☐ |
| S8 | Add/Edit Karkun | ☐ | ☐ | ☐ |
| S9 | Connect Karkun | ☐ | ☐ | ☐ |
| S10 | Replace assignment | ☐ | ☐ | ☐ |
| S11 | Remove assignment | ☐ | ☐ | ☐ |
| S12 | Compliance bulk action | ☐ | ☐ | ☐ |
| S13 | Data migration import | ☐ | ☐ | ☐ |
| S14 | Data migration export | ☐ | ☐ | ☐ |
| S15 | Communication send | ☐ | ☐ | ☐ |

---

## Rukn — Pages and Navigation

| Route | Page loads | Bottom nav | Primary CTA | Pass |
|-------|------------|------------|-------------|------|
| `/rukn` | ☐ | ☐ | ☐ | ☐ |
| `/rukn/my-karkun` | ☐ | ☐ | ☐ | ☐ |
| `/rukn/available-karkun` | ☐ | ☐ | ☐ | ☐ |
| `/rukn/campaign-record` | ☐ | ☐ | ☐ | ☐ |
| `/rukn/visit/:id` | ☐ | — | ☐ | ☐ |

---

## Rukn — Actions

| # | Action | Pass |
|---|--------|------|
| S16 | Call handler | ☐ |
| S17 | WhatsApp handler | ☐ |
| S18 | Record Visit form | ☐ |
| S19 | Journey stages | ☐ |
| S20 | Logout | ☐ |

---

## UI States

| State | Page tested | Observed correctly | Pass |
|-------|-------------|-------------------|------|
| Empty — no connections | Rukn Home | ☐ | ☐ |
| Empty — no karkuns | Admin Karkun (pre-import) | ☐ | ☐ |
| Loading | Login submit | ☐ | ☐ |
| Loading | Page navigation | ☐ | ☐ |
| Error — not registered | Rukn login | ☐ | ☐ |
| Error — wrong OTP | Rukn login | ☐ | ☐ |
| Error — network offline | Compliance edit | ☐ | ☐ |

---

## Mobile Layout (390px)

| Page | No horizontal scroll | Touch targets OK | Pass |
|------|------------------------|------------------|------|
| Login | ☐ | ☐ | ☐ |
| Rukn Home | ☐ | ☐ | ☐ |
| Visit form | ☐ | ☐ | ☐ |
| Admin dashboard | ☐ | ☐ | ☐ |

---

## Defects

| ID | Severity | Area | Description | Status |
|----|----------|------|-------------|--------|
| | | | | |

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** | ☐ |
| **Fail** | ☐ |

| Tester | Date |
|--------|------|
| | |

---

## References

- [Smoke Test (operations)](../operations/smoke-test.md)
- [M6 Phase 3 Visual Evidence](../m6-phase3-visual-evidence.md)
