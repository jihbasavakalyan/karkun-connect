# Known Limitations — Release Candidate 1.0.0-rc.1

Canonical release-facing summary of intentional Pilot V1 boundaries. These are **not defects** unless escalated during acceptance.

Full operational detail: [docs/operations/known-limitations.md](../operations/known-limitations.md)  
Defect log: [docs/pilot/known-issues.md](../pilot/known-issues.md)

---

## Severity Policy

| Type | Go-live impact |
|------|----------------|
| Critical / High **defects** | Block certification and pilot |
| Known limitations (this document) | Do not block unless escalated |
| Medium / Low defects | May ship with workaround |

At RC1 certification: **0 Critical**, **0 High** open defects.

---

## Authentication

| ID | Limitation | Workaround |
|----|------------|------------|
| KL-A01 | Custom claims require Admin SDK | Bootstrap `VITE_ADMIN_EMAILS`; run claims script |
| KL-A02 | Phone OTP requires Blaze billing | Enable billing on production Firebase |
| KL-A03 | One mobile per Rukn | Fix duplicates in master before import |
| KL-A04 | No self-service Rukn registration | Administrator updates Rukn Master |

---

## Data & Firestore

| ID | Limitation | Workaround |
|----|------------|------------|
| KL-D01 | Full collection hydration on login | Acceptable at ~49 / ~493 scale |
| KL-D02 | Assignment save may batch-replace | Acceptable at pilot scale |
| KL-D03 | Offline = Firestore SDK queue | Refresh when online |
| KL-D04 | No automatic in-app Firestore export | Console export + JSON backup |

---

## Security

| ID | Limitation | Workaround |
|----|------------|------------|
| KL-S01 | Compliance rules broader than Rukn UI | UI scopes to assigned Karkuns |
| KL-S02 | Executions readable by any Rukn role | Tighten post-pilot if needed |
| KL-S03 | Firebase web API key in client | Expected; security via rules |

---

## UI / Operations

| ID | Limitation |
|----|------------|
| KL-U01 | Rukn cannot self-assign Karkuns |
| KL-U02 | Campaign setup is multi-step |
| KL-U04 | Long visit form on small screens (scroll) |
| KL-O03 | Full live Firebase acceptance is manual (templates in docs/pilot) |

---

## Deferred to Version 1.1+

| Item | Reason |
|------|--------|
| Push notifications | Out of Pilot V1 |
| Live WhatsApp API | Templates only |
| Territory mapping / analytics | Post-pilot |
| Multi-jamaat tenancy | Documented extension only |
| Role-scoped incremental Firestore queries | Performance post-pilot |
| Built-in client error monitoring | Manual console + issue log |

---

## Freeze Reminder

After `v1.0.0-rc1`, only Critical/High fixes are allowed before pilot. Enhancements belong in the 1.1 backlog after pilot feedback review.
