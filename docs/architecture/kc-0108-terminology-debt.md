# KC-0108 — Connection Terminology Debt

**Type:** Documentation (presentation-complete; technical debt deferred)  
**Status:** Complete for KC-0108  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Basis:** [Campaign Operating System Product Architecture (KC-0104)](./campaign-operating-system-product-architecture.md)

---

## Purpose

KC-0108 completes **user-facing** Assignment → Connection alignment. This document records **intentional** remaining legacy terminology that must **not** be renamed until a dedicated technical-debt phase.

---

## Remaining intentional legacy terms

| Legacy term / surface | Where it remains | Why retained | Future cleanup |
|----------------------|------------------|--------------|----------------|
| Route `/admin/assignments` | `constants/routes.ts`, deep links, Digital Rafeeq route targets | URL stability; no routing changes in KC-0108 | Alias route `/admin/connections` with redirect; then retire old path |
| Query params `view=assign`, tab ids `assignments` | Assignment desk, Rukn module internal tab keys | Deep-link / state contracts | Rename query/tab keys with migration of bookmarks |
| Firestore / repository identity | Collections, `assignmentId`, `assignmentNumber`, ASN | Persistence & KC-ARCH-001 | Schema + dual-read migration ticket |
| Types / interfaces / services | `AssignmentRecord`, `assignmentService`, `assignmentStore`, `useAssignmentEngine`, etc. | Implementation names; no API/refactor in scope | Dedicated rename PR series after route alias |
| Persisted enum / status values | `'Assigned'`, `'Unassigned'`, `'Wrong Assignment'`, `'Incorrect Assignment'`, review reason `'Wrong assignment'` | Stored in Firestore / history; changing values breaks data | Display maps already present (`getReleaseReasonLabel`, `getConnectionStatusLabel`, modal option remaps); migrate stored values later |
| Communication category / template **IDs** | `assignment-management`, `tpl-oc-assignment-issued`, merge keys `AssignedKarkunList`, `DaysSinceAssignment` | Merge keys & IDs are contracts for templates | Alias keys with dual support, then deprecate |
| Profile hint “Assigned by the organisation” | `ProfileSettingsSection` | Means role provenance, not Connection domain | Optional reword to “Set by the organisation” |
| Runtime Diagnostics “Assignment Store” | `RuntimeDiagnosticsPage` | Dev/ops tooling label for the store layer | Rename when store is renamed |
| Component / file names | `AssignKarkunModal`, `ConnectedAssignmentDeskCard`, `AssignmentManagementPage`, etc. | Presentation-only ticket; no file moves | Rename files after type/service rename |
| CSV **cell** status values | Export writes raw `record.status` (`Active` / `Unassigned` / …) | Ledger fidelity | Map status cells through presentation labels in a later export polish ticket |
| Internal diagnostics / traces | `traceConnect('assign.*')`, readiness keys `assignment_repository` | Operator-facing path already sanitized via `operatorFacingError` | Align diagnostic vocabulary when engine is renamed |
| Duplicate health-check id | `no-orphan-assignments` (label already “No orphan connections”) | Pre-existing duplicate check alongside `no-orphan-connections`; ids are not UI chrome | Consolidate health-check catalog in registry health debt ticket |

---

## Presentation completed in KC-0108

Examples of surfaces now speaking Connection language:

- Navigation / desk titles, KPIs (“With Connections”, “Connected”, “Connected Karkuns”)
- Forms, validation, archive/integrity/registry health **messages**
- Engagement category labels and English template **titles** (IDs unchanged)
- Mail-merge **labels** (keys unchanged)
- Export **filename** `connection-history-*.csv` and Connection-oriented headers
- Review reason display: “Wrong connection” (persisted value unchanged)

---

## Recommended future cleanup order

1. **Route alias** `/admin/connections` → same page; keep `/admin/assignments` redirect.
2. **Display-only** remaining Profile / Diagnostics copy (optional).
3. **Merge-key aliases** (`ConnectedKarkunList` → same as `AssignedKarkunList`).
4. **Type/service/file rename** behind a compatibility façade (largest blast radius).
5. **Persisted enum migration** with dual-read / dual-write.
6. **Firestore collection / field rename** last (KC-ARCH-001 gated).

---

## Explicit non-goals (until debt phase)

- No Firestore schema changes  
- No repository / routing / API renames  
- No business-logic changes disguised as terminology cleanup  
