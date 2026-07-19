# Data Preservation & Recovery Foundation (KC-0058)

## Design goals

Karkun Connect is a Campaign Execution Platform. Its most valuable asset is institutional history:

- Karkuns and Rukns
- Connections / Assignments
- Campaign execution evidence
- Activity and approval trails

**Principle:** Critical data must never be permanently lost to bugs, operator mistakes, failed deployments, or partial writes.

Phase 1 (this document) establishes foundation only — no Recovery Center UI, no scheduled jobs, no bulk export/import.

## Protected entities

| Entity | Soft-delete mechanism | Hard delete |
|--------|----------------------|-------------|
| Karkuns | `isArchived` + `archivedAt` / `archivedBy` | Blocked (repo + rules) |
| Rukns | `isArchived` + archive metadata; status → inactive | Blocked |
| Assignments / Connections | Status lifecycle + optional `isArchived` | Document delete blocked |
| Requests | `isArchived` metadata on request rows | Settings wipe restricted |
| Activity | Append-only | Delete/update blocked |
| Connection Ledger | Append-only immutable events | Delete/update blocked |
| Campaigns | Update-only archive status (existing) | Delete blocked |

## Soft delete lifecycle

```
Active → Archived (isArchived=true, archivedAt/By)
Archived → Active (isArchived=false, restoredAt/By)
```

- UI may hide archived rows (future).
- Database retains the document.
- Use `archiveService` (`archiveKarkun`, `archiveAssignment`, …).

Do **not** call repository `clear()` against production Firestore.

## Connection Ledger

Collection: `connectionLedger`

Append-only lifecycle events:

- `CONNECTED`
- `TRANSFERRED`
- `RESTORED`
- `ARCHIVED`
- `UNARCHIVED`
- `DISCONNECTED`

Each entry includes `ledgerId`, `timestamp`, `campaignId`, `connectionId`, `assignmentId`, `ruknId`, `karkunId`, `eventType`, `performedBy`, `metadata`.

Never edit. Never delete. Service: `connectionLedgerService.appendConnectionLedgerEntry`.

## Repository protection

Firestore repository `clear()` / `clearActivityLog()` return:

```
Permission: KC-0058: permanent delete is blocked...
```

unless `allowDangerousRepositoryClear(true)` is set (local tests / controlled maintenance only).

## Integrity Scanner

Service: `IntegrityScanner` / `runIntegrityScan()` → `IntegrityReport`

Checks (initial):

- Counter drift
- Duplicate IDs (Karkun, Rukn, assignment, ASN)
- Missing Karkun / Rukn references
- Broken multi-Active connections
- Orphan / incomplete Unassigned metadata
- Campaign library presence

No UI yet — console / `npm run verify:kc0058` / admin scan scripts.

## Recovery metadata

Additive optional fields (do not break existing schemas):

`createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `archivedAt`, `archivedBy`, `restoredAt`, `restoredBy`, `version`

## Activity preservation

- `logActivity` appends only.
- Firestore rules deny activity update/delete.
- Client writes only create new activity document IDs.
- Critical workflows already log (request, approval, assign, transfer, remove, restore); archive/restore also log.

## Recovery philosophy

1. Prefer soft-archive over delete.
2. Prefer ledger + activity for forensic reconstruction.
3. Prefer Integrity Scanner before repair scripts.
4. Never overwrite occupied Karkun IDs (see KC-0056).
5. Never invent missing contact fields (see KC-0056R).

## Future Recovery Center

Planned (not in Phase 1):

- Admin UI to browse archived entities
- Guided restore flows
- Ledger timeline viewer
- One-click integrity report
- Export/import packages

## Disaster Recovery roadmap

| Horizon | Capability |
|---------|------------|
| Now (KC-0058) | Soft delete, ledger, rules, scanner, activity append-only |
| Next | Recovery Center UI, verified restore wizards |
| Later | Scheduled backups, cross-region export, point-in-time recovery drills |

## Migration notes

- Additive fields only — existing documents remain valid.
- New collection `connectionLedger` is created on first append.
- Firestore rules deny deletes on critical collections — Admin SDK scripts still bypass rules (use carefully).
- Danger Zone hard reset is disabled against production Firestore mode.

## Rollback strategy

1. Redeploy previous hosting build if client regression.
2. Revert `firestore.rules` if rules are too strict (note: re-enabling deletes weakens protection).
3. Ledger documents are harmless if unused — leave in place.
4. Soft-archive fields can be cleared via controlled Admin SDK update (do not batch-delete people).
