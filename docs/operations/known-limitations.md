# Known Limitations — Pilot V1

Documented boundaries for Basavakalyan Pilot V1. These are **not defects** unless they block pilot objectives.

---

## Authentication

| ID | Limitation | Impact | Workaround |
|----|------------|--------|------------|
| KL-A01 | Custom claims require Admin SDK setup | Bootstrap via `VITE_ADMIN_EMAILS` until claims deployed | Run `scripts/admin/set-custom-claims.mjs` |
| KL-A02 | Rukn OTP requires Blaze billing | SMS costs on Firebase | Enable billing on production project |
| KL-A03 | One mobile per Rukn enforced at master | Duplicate mobiles rejected at import | Fix source data before import |
| KL-A04 | No self-service Rukn registration | Unregistered mobiles cannot login | Administrator updates Rukn Master |

---

## Data and Firestore

| ID | Limitation | Impact | Workaround |
|----|------------|--------|------------|
| KL-D01 | Full collection hydration on init | Higher read count at login | Acceptable at pilot scale (~500 records) |
| KL-D02 | Assignment save replaces full batch | Write amplification on large changes | Pilot-scale acceptable |
| KL-D03 | Offline queue limited to Firestore SDK | Complex offline conflicts rare | Refresh when online |
| KL-D04 | No automatic Firestore export in app | Manual backup required | Schedule console export + JSON backup |

---

## Security

| ID | Limitation | Impact | Workaround |
|----|------------|--------|------------|
| KL-S01 | Compliance Firestore rules broader than Rukn UI | Theoretical cross-Rukn read | UI scopes to assigned Karkuns |
| KL-S02 | Executions readable by any authenticated Rukn | Theoretical cross-Rukn read | Tighten post-pilot if needed |
| KL-S03 | Firebase web API key in client bundle | Expected for Firebase web apps | Security via Firestore rules |

---

## Features Deferred Post-Pilot

| Feature | Reason |
|---------|--------|
| Push notifications | Out of Pilot V1 scope |
| Live WhatsApp API | Templates only in RC1 |
| Territory mapping / analytics | Post-pilot |
| Multi-jamaat tenancy | Architecture extension documented in M7.1 |
| Incremental Firestore queries per role | Performance optimization post-pilot |
| Built-in client error monitoring (Sentry) | Manual Firebase console + issue log |

---

## UI / UX

| ID | Limitation | Impact |
|----|------------|--------|
| KL-U01 | Rukn cannot self-assign Karkuns | Administrator must connect |
| KL-U02 | Campaign setup is multi-step | Infrequent task; Help documents path |
| KL-U03 | Filter bars dense on admin Karkun page | Functional; training recommended |
| KL-U04 | Long visit form on small screens | Scroll required; progressive disclosure helps |

---

## Operational

| ID | Limitation | Impact |
|----|------------|--------|
| KL-O01 | No staging auto-sync with production | Separate Firebase projects |
| KL-O02 | Leadership sign-off manual | [Go-Live Approval](../pilot/go-live-approval.md) |
| KL-O03 | Test reports require live Firebase for full pass | Automated suite covers code; manual phases documented |

---

## Severity Policy

Items in [Known Issues](../pilot/known-issues.md) with **Critical** or **High** severity block go-live. Items in this document do not block go-live unless escalated during acceptance testing.

---

## Related

- [Release Notes](release-notes.md)
- [Security Report](../pilot/security-report.md)
- [Performance Report](../pilot/performance-report.md)
