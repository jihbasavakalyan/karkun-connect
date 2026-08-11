# KC-027.1 — Firestore Non-Production Recovery Runbook

**Purpose:** Restore production backup artifacts into a **non-production** Firestore database for drills and validation.  
**Ticket:** KC-027.1  
**Last updated:** 2026-08-11

## Hard prohibitions

| Forbidden | Reason |
|-----------|--------|
| Restore / import into production `karkun-connect-75c68` database `(default)` | Risk of live data overwrite/corruption |
| Point Vercel Preview or staging app env at production project | Violates isolation rule |
| Delete production `(default)` database | Irreversible outage |
| Production Vercel promote from this drill | Out of scope for KC-027.1 |
| Skip verification after restore | Undetected incomplete recovery |

If any step would touch production `(default)`, **STOP**.

---

## Prerequisites

- [ ] Change ticket / approval for a **drill** (not a production incident cutover)
- [ ] `gcloud` authenticated as an operator with backup/restore + storage permissions ([baseline IAM](./firestore-backup-recovery-baseline.md#7-required-iam-permissions))
- [ ] Production project ID known: `karkun-connect-75c68`
- [ ] Non-prod destination chosen (pick **one** path below)
- [ ] Staging / Preview Firebase web config available (isolated project)
- [ ] Blaze billing enabled on projects that will run export/import/restore

### Destination options

| Option | Destination | When to use |
|--------|-------------|-------------|
| **A — New DB in prod project** | New database ID in `karkun-connect-75c68` (e.g. `recovery-drill-YYYYMMDD`) | Fastest managed-backup restore drill; app still must **not** use it in Production |
| **B — Staging project** | Separate project (e.g. `karkun-connect-staging`) `(default)` or named DB | Preferred for Preview app validation |
| **C — GCS import into staging** | Import export objects into staging | Cross-project / archive validation |

---

## Path A — Restore managed backup → new database (same GCP project)

Use when scheduled backups already exist.

### A1. List backups

```bash
gcloud config set project karkun-connect-75c68
gcloud firestore backups list --database='(default)'
```

Record:

| Field | Value |
|-------|-------|
| Backup name (full resource) | `projects/karkun-connect-75c68/locations/LOCATION/backups/BACKUP_ID` |
| Snapshot time | |
| Operator | |
| Drill ID | `recovery-drill-YYYYMMDD` |

### A2. Restore to a **new** database ID

```bash
# DATABASE_ID must NOT be (default)
gcloud firestore databases restore \
  --source-backup=projects/karkun-connect-75c68/locations/LOCATION/backups/BACKUP_ID \
  --destination-database=recovery-drill-YYYYMMDD
```

Wait until operation completes:

```bash
gcloud firestore operations list --database='(default)'
gcloud firestore databases describe --database=recovery-drill-YYYYMMDD
```

### A3. Validate (read-only)

Prefer Admin SDK / Console inspection against the **drill** database only:

- Collection presence: `rukns`, `karkuns`, `connections`, `campaigns`, `activityLogs`, `connectionLedger`, `executions`, `followUps`, `compliance`, `settings`, `communications`
- Spot-check document counts vs last known production metrics (from a prior export or dashboard screenshot)
- Confirm `settings/karkunCounter` and `settings/migrationVersion` exist

Do **not** point Production hosting at `recovery-drill-*`.

### A4. Cleanup

When the drill is signed off:

```bash
# Only delete the drill database — never (default)
gcloud firestore databases delete recovery-drill-YYYYMMDD --quiet
```

Retain the evidence table in the change ticket.

---

## Path B — Clone / PITR into new database (recent window)

Use when PITR is enabled and the incident timestamp is within 7 days.

```bash
gcloud config set project karkun-connect-75c68

# Example: clone to a new database from a minute-aligned timestamp (see current gcloud clone docs)
# Always use a non-(default) destination database ID.
```

Follow Google’s current `databases clone` / PITR guidance for your CLI version. Destination database ID must not be `(default)`.

Validate and cleanup as in Path A3–A4.

---

## Path C — GCS export → import into **staging** project

Use for cross-project drills and Preview validation.

### C1. Ensure an export exists

```bash
gcloud config set project karkun-connect-75c68
gsutil ls gs://karkun-connect-75c68-firestore-backups/firestore/
```

Or create a one-shot export (production read-only export is allowed; import target must be non-prod):

```bash
gcloud firestore export gs://karkun-connect-75c68-firestore-backups/firestore/drill/$(date +%Y%m%d%H%M) \
  --database='(default)'
```

### C2. Import into staging (destructive to **staging** only)

```bash
gcloud config set project karkun-connect-staging   # or your isolated project ID

# WARNING: import merges/overwrites documents in the TARGET database collections.
# Target must be staging/non-prod — NEVER karkun-connect-75c68 (default).

gcloud firestore import gs://karkun-connect-75c68-firestore-backups/firestore/YYYY/MM/DD/HHMM \
  --database='(default)'
```

Ensure the staging service account can read the bucket (grant `roles/storage.objectViewer` on the backup bucket to the staging import SA), **or** copy the export into a staging-owned bucket first.

### C3. Point Preview at staging (not production)

Vercel **Preview** environment variables must use staging Firebase web config:

| Variable | Must be |
|----------|---------|
| `VITE_FIREBASE_PROJECT_ID` | Staging project ID (**not** `karkun-connect-75c68`) |
| Other `VITE_FIREBASE_*` | Matching staging app |
| `VITE_REPOSITORY_PROVIDER` | `firestore` |
| `FIREBASE_PROJECT_ID` / SA JSON | Staging (if API routes used on Preview) |

Redeploy Preview after env change. Confirm in browser network tab that Firestore requests target the staging project.

### C4. Preview smoke (post-restore)

| Step | Expected |
|------|----------|
| Open Preview `/login` | No Firebase config console errors |
| Admin login (staging admin) | Admin shell loads |
| Dashboard counts | Consistent with restored dataset (not empty if export had data) |
| Hard refresh | Still authenticated / data loads |
| Confirm project | Requests to staging project only |

---

## Verification evidence template

Copy into the change ticket after every drill:

```text
Drill ID:
Date (UTC):
Operator:
Source (backup ID / export path / PITR timestamp):
Destination project:
Destination database ID:
Collections checked:
Count spot-checks:
Preview URL (if used):
Preview project ID observed:
Production (default) modified? NO
Issues:
Sign-off:
```

---

## Incident vs drill

| Mode | Allowed in KC-027.1? | Notes |
|------|----------------------|-------|
| Non-prod drill (this runbook) | **Yes** | Baseline verification |
| Production cutover / in-place repair | **No** | Requires separate certified incident procedure + leadership approval |

---

## Related

- [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)
- [Recovery Guide](./recovery-guide.md)
- [Backup Guide](./backup-guide.md)
- [Environment Management](./environment-management.md)
- [Vercel Configuration](./vercel-configuration.md)
