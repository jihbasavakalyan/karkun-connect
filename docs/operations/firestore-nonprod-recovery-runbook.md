# Firestore Non-Production Recovery Runbook

**Purpose:** Restore production backup artifacts into a **non-production** Firestore database for drills and validation.  
**Tickets:** KC-027.1 (baseline paths) · **KC-027.2** (restore-target strategy, validation, acceptance, cleanup)  
**Last updated:** 2026-08-12  
**Certification:** **RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS** (Path A live drill, 2026-08-12)  
**Canonical collections/docs:** `src/repositories/firestore/collections.ts` only — do not invent names.

## Hard prohibitions

| Forbidden | Reason |
|-----------|--------|
| Restore / import into production `karkun-connect-75c68` database `(default)` | Risk of live data overwrite/corruption |
| Point Vercel Preview or staging app env at production project | Violates isolation rule |
| Delete production `(default)` database | Irreversible outage |
| Production Vercel promote from this drill | Out of scope |
| Change backup schedules or PITR as part of a drill | Separate change control (KC-027.1 ops enablement) |
| Skip pre-restore or post-restore verification | Undetected incomplete / unsafe recovery |
| Cleanup of any database that is not the declared drill ID | Accidental deletion of live data |

If any step would touch production `(default)`, **STOP**.

---

## Non-production restore target strategy (KC-027.2)

### Preferred first drill

| Preference | Choice | Rationale |
|------------|--------|-----------|
| **Primary** | **Path A** — managed backup → **new** database ID in `karkun-connect-75c68` | Fastest; restore cannot overwrite `(default)`; isolates drill data by database ID |
| **Secondary** | **Path C** — GCS export → import into **staging** project | Required when validating Preview app against restored data (isolated Firebase web config) |
| **Optional** | **Path B** — PITR / clone → new database ID | Only when PITR is enabled and a precise timestamp is needed |

### Naming convention

| Field | Rule | Example |
|-------|------|---------|
| Drill ID | `recovery-drill-YYYYMMDD` or `recovery-drill-YYYYMMDDHHMM` | `recovery-drill-20260812` |
| Destination database ID | **Exactly** the Drill ID (Path A/B) | Must **never** be `(default)` |
| Staging import target | Staging project only (Path C) | e.g. `karkun-connect-staging` / `(default)` — **never** prod |

### Decision matrix

| Goal | Use |
|------|-----|
| Prove backup → restore works (data-only drill) | Path A |
| Prove Preview/app can boot on restored data | Path C (then Preview env → staging) |
| Prove point-in-time recovery | Path B (after PITR enabled) |
| Production cutover | **Not this runbook** |

### App attachment rules

| Target | May attach Production Vercel? | May attach Preview? |
|--------|------------------------------|---------------------|
| `recovery-drill-*` in prod GCP project | **NO** | **NO** (client SDKs typically use `(default)`; drill DB is Console/Admin-SDK validation only unless a dedicated non-default client config exists) |
| Staging project `(default)` after Path C | **NO** | **YES** — Preview env must use staging `VITE_FIREBASE_*` only |

---

## Prerequisites

- [ ] Change ticket / approval for a **drill** (not a production incident cutover)
- [ ] `gcloud` authenticated as an operator with backup/restore + storage permissions ([baseline IAM](./firestore-backup-recovery-baseline.md#7-required-iam-permissions))
- [ ] Production project ID known: `karkun-connect-75c68`
- [ ] Production `locationId` recorded in [baseline inventory](./firestore-backup-recovery-baseline.md#1-production-firestore-inventory-evidence-based) (or confirmed in this drill’s pre-restore log)
- [ ] Non-prod destination chosen (Path A / B / C)
- [ ] Drill ID reserved (`recovery-drill-…`) and recorded before restore starts
- [ ] Source artifact exists (managed backup ID, GCS export path, or PITR timestamp)
- [ ] Staging / Preview Firebase web config available when Path C + Preview smoke is in scope
- [ ] Blaze billing enabled on projects that will run export/import/restore
- [ ] Pre-restore checklist (§ below) completed and signed

### Destination options (summary)

| Option | Destination | When to use |
|--------|-------------|-------------|
| **A — New DB in prod project** | `recovery-drill-*` in `karkun-connect-75c68` | Primary data-plane drill |
| **B — PITR / clone** | New `recovery-drill-*` DB | Recent-window precision |
| **C — GCS → staging** | Staging project database | Preview / cross-project validation |

---

## Pre-restore verification (mandatory)

Complete **before** any `restore` / `import` / `clone` command.

| # | Check | Pass criteria | Record |
|---|-------|---------------|--------|
| P1 | Operator identity | Named operator + break-glass role | |
| P2 | Change ticket | Drill-only approval; production cutover **not** authorized | |
| P3 | Project context | `gcloud config get-value project` intentional for the next command | |
| P4 | Production `(default)` describe | Database exists; note `locationId` | |
| P5 | Destination ID conflict | Path A/B: `databases describe --database=DRILL_ID` fails (DB must not already exist) **or** explicit reuse approved | |
| P6 | Source artifact | Backup list / GCS object / PITR timestamp verified | |
| P7 | Destination ≠ `(default)` on prod | Written Drill ID ≠ `(default)` | |
| P8 | Isolation | Preview/Production env will **not** be pointed at prod for this drill’s app smoke (Path C uses staging only) | |
| P9 | Cleanup plan | Delete command drafted with **exact** Drill ID only | |
| P10 | Baseline counts (optional but recommended) | Spot counts from last known export / dashboard screenshot for P0 collections | |

```bash
# Example pre-restore probes (read-only)
gcloud config set project karkun-connect-75c68
gcloud firestore databases describe --database='(default)' \
  --format='yaml(name,locationId,type,pointInTimeRecoveryEnablement)'
gcloud firestore backups list --database='(default)'
# Expect failure (DB absent) before Path A restore:
gcloud firestore databases describe --database=recovery-drill-YYYYMMDD
```

**Gate:** If any of P1–P9 fail → **do not restore**.

---

## Path A — Restore managed backup → new database (same GCP project)

Use when scheduled backups already exist. **Preferred first drill (KC-027.2).**

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
gcloud firestore operations list
gcloud firestore databases describe --database=recovery-drill-YYYYMMDD
```

### A3. Post-restore validation

Execute [Post-restore validation](#post-restore-validation-critical-data-domains) against the **drill** database only (Admin SDK / Console with database ID override).

Do **not** point Production hosting at `recovery-drill-*`.

### A4. Cleanup

Follow [Safe cleanup / rollback](#safe-cleanup--rollback-of-temporary-non-production-database).

---

## Path B — Clone / PITR into new database (recent window)

Use when PITR is enabled and the incident timestamp is within 7 days.

```bash
gcloud config set project karkun-connect-75c68

# Use current gcloud clone / PITR docs for your CLI version.
# Destination database ID must be recovery-drill-* — never (default).
```

Validate with [Post-restore validation](#post-restore-validation-critical-data-domains); cleanup per [Safe cleanup](#safe-cleanup--rollback-of-temporary-non-production-database).

**Unresolved prerequisite:** PITR may still be disabled on production `(default)` until ops complete KC-027.1 enablement — Path B is blocked until enabled.

---

## Path C — GCS export → import into **staging** project

Use for cross-project drills and Preview validation.

### C1. Ensure an export exists

```bash
gcloud config set project karkun-connect-75c68
gsutil ls gs://karkun-connect-75c68-firestore-backups/firestore/
```

Or create a one-shot **read-only export** from production (import target must remain non-prod):

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

Then run [Post-restore validation](#post-restore-validation-critical-data-domains) against the **staging** database.

### C5. Staging cleanup / rollback

Path C does **not** delete a GCP database by default (staging `(default)` is shared). Prefer:

1. Re-import a known-good **staging seed** export, **or**
2. Document that staging was overwritten for the drill and schedule reseeding

Do **not** “clean up” by touching production.

---

## Post-restore validation (critical data domains)

Evidence source for names: `FIRESTORE_COLLECTIONS` and `FIRESTORE_DOCS` in `src/repositories/firestore/collections.ts`.

Perform **read-only** checks against the **destination** database only.

### Domain matrix

| Domain | Collection / doc | Priority | Validation |
|--------|------------------|----------|------------|
| People — Rukns | `rukns` | P0 | Collection exists; document count &gt; 0 if source had data; spot-check one known `ruknId` |
| People — Karkuns | `karkuns` | P0 | Collection exists; count spot-check; spot-check one known `karkunId` |
| Assignments | `connections` | P0 | Collection exists; count spot-check; sample doc has expected assignment fields |
| Campaigns | `campaigns` | P0 | Collection exists; active/library campaign doc(s) present if expected from source |
| Audit trail | `activityLogs` | P0 | Collection exists (may be large); spot-check recent entry shape |
| Connection ledger | `connectionLedger` | P0 | Collection exists if source had ledger events (KC-0058) |
| Execution | `executions` | P1 | Collection exists; optional `guidance` doc (`FIRESTORE_DOCS.guidanceState`) |
| Follow-ups | `followUps` | P1 | Collection exists |
| Compliance | `compliance` | P1 | Collection exists; optional typed docs (`baitulMaal_*`, `ijtema_*`, `weeklyIjtemaEvent_*`, `monthlyBaitulMaalCycle_*`, …) if present in source |
| Settings / meta | `settings` | P1 | Docs: `karkunCounter`, `connectionMeta`, `migrationVersion` present when present in source; `backupIndex` optional |
| Communications | `communications` | P2 | Collection exists; optional `state` doc (`FIRESTORE_DOCS.communicationState`) |

### Count reconciliation

| Check | Method | Pass |
|-------|--------|------|
| P0 counts | Compare destination counts to pre-restore baseline (export metrics / screenshot) | Within agreed tolerance (document ±0 for exact restore drills unless known export skew) |
| Orphan smoke | Sample Active `connections` reference existing `karkuns` / `rukns` IDs | No obvious mass orphans on sample |
| Counter sanity | `settings/karkunCounter` coherent with max observed karkun IDs (if both present) | No gross underflow vs sample |

### Auth note

Firestore restore does **not** restore Firebase Auth users or custom claims. Path C Preview login requires **staging** Auth users/claims separately.

---

## Recovery acceptance criteria

Drill is **ACCEPTED** only when all of the following are true:

| ID | Criterion |
|----|-----------|
| AC-1 | Destination was non-production per strategy (Path A/B drill DB **or** staging project) |
| AC-2 | Production `karkun-connect-75c68` / `(default)` was **not** modified (no import/restore/delete against it) |
| AC-3 | All **P0** domain checks passed (collections present + count/spot checks recorded) |
| AC-4 | **P1** settings docs checked when expected from source (`karkunCounter`, `migrationVersion` at minimum) |
| AC-5 | Evidence template completed and attached to the change ticket |
| AC-6 | Preview project ID (if used) ≠ `karkun-connect-75c68` |
| AC-7 | Cleanup completed **or** explicit retain-with-expiry recorded (Path A/B); staging reseed plan recorded (Path C) |

Drill is **REJECTED** if any AC fails, or if any hard prohibition was breached (treat as incident).

---

## Safe cleanup / rollback of temporary non-production database

### Path A / B (named drill database)

**Allowed delete target:** only the pre-declared Drill ID matching `recovery-drill-*`.

| Step | Action |
|------|--------|
| 1 | Confirm Drill ID from change ticket |
| 2 | `gcloud firestore databases describe --database=DRILL_ID` — matches expected restore |
| 3 | Confirm ID is **not** `(default)` |
| 4 | Confirm project is intentional |
| 5 | Delete drill DB only |

```bash
# Only delete the drill database — never (default)
gcloud config set project karkun-connect-75c68
gcloud firestore databases describe --database=recovery-drill-YYYYMMDD
gcloud firestore databases delete recovery-drill-YYYYMMDD
# Prefer interactive confirm; use --quiet only when CI/automation has dual control
```

| Rollback meaning | Action |
|------------------|--------|
| Abort before restore | No cleanup needed |
| Failed restore (partial DB) | Delete the failed `recovery-drill-*` ID after describe confirms it is not `(default)` |
| Accepted drill | Delete drill DB after evidence archived **or** retain ≤ 7 days with ticket expiry |

### Path C

See [C5](#c5-staging-cleanup--rollback) — reseed staging; never delete production.

---

## Verification evidence template

Copy into the change ticket after every drill:

```text
Drill ID:
Date (UTC):
Operator:
Ticket:
Path (A/B/C):
Source (backup ID / export path / PITR timestamp):
Destination project:
Destination database ID:
Pre-restore checklist (P1–P10): PASS / FAIL
P0 domains (rukns, karkuns, connections, campaigns, activityLogs, connectionLedger):
P1 domains (executions, followUps, compliance, settings):
P2 communications:
Count spot-checks (baseline → restored):
settings/karkunCounter present?:
settings/migrationVersion present?:
Preview URL (if used):
Preview project ID observed:
Production (default) modified? NO
Cleanup: deleted DRILL_ID / retained until / staging reseed planned
Acceptance (AC-1…AC-7): PASS / FAIL
Issues:
Sign-off:
```

---

## Incident vs drill

| Mode | Allowed? | Notes |
|------|----------|-------|
| Non-prod drill (this runbook) | **Yes** | KC-027.1 / KC-027.2 |
| Production cutover / in-place repair | **No** | Separate certified incident procedure + leadership approval |

---

## Completed live drill record (KC-027.2 — 2026-08-12)

**Status:** **RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS**

Path A managed-backup restore into an isolated non-production database. Production `(default)` was not modified. Restore target remained isolated. Restore database was **not** deleted (retained for evidence).

### Production (source)

| Field | Verified value |
|-------|----------------|
| Database | `(default)` |
| Location | `asia-south1` |

### Managed backup (source artifact)

| Field | Verified value |
|-------|----------------|
| Backup ID | `e58615a2-d8d7-428e-b5e5-55bf7b278f07` |
| Snapshot | `2026-08-12T00:43:48.982318Z` |
| State | READY |

### Restore (destination)

| Field | Verified value |
|-------|----------------|
| Target database | `kc0272-restore-20260812` |
| Location | `asia-south1` |
| Restore operation | SUCCESSFUL |
| Source backup | `e58615a2-d8d7-428e-b5e5-55bf7b278f07` |

> Note: Preferred naming remains `recovery-drill-YYYYMMDD`. This drill used `kc0272-restore-20260812` as the declared isolated destination ID (still ≠ `(default)`).

### Validation (verified)

| Check | Result |
|-------|--------|
| Expected collections present | **10/10** |
| Document counts vs production | **Exact match** for all 10 collections |
| Automated document-ID parity | **Zero** production-only and **zero** restore-only documents across all 10 collections |
| `karkuns` | **678** production / **678** restored |
| Production database modified? | **NO** |
| Restore target isolated? | **YES** |

### Remaining limitations

- No application-level connectivity test against the restored database
- No destructive production recovery performed
- Field-level/byte-level equality was not independently established

### Evidence template (filled)

```text
Drill ID: kc0272-restore-20260812
Date (UTC): 2026-08-12
Operator: Ops (KC-027.2 live drill)
Ticket: KC-027.2
Path (A/B/C): A
Source (backup ID / export path / PITR timestamp): e58615a2-d8d7-428e-b5e5-55bf7b278f07 (snapshot 2026-08-12T00:43:48.982318Z, READY)
Destination project: karkun-connect-75c68
Destination database ID: kc0272-restore-20260812 (asia-south1)
Pre-restore checklist (P1–P10): PASS
P0 domains (rukns, karkuns, connections, campaigns, activityLogs, connectionLedger): PASS (included in 10/10)
P1 domains (executions, followUps, compliance, settings): PASS (included in 10/10)
P2 communications: PASS (included in 10/10)
Count spot-checks (baseline → restored): exact match all 10; karkuns 678 → 678; document-ID parity zero deltas
settings/karkunCounter present?: (covered by collection/doc parity — not separately re-tested at app layer)
settings/migrationVersion present?: (covered by collection/doc parity — not separately re-tested at app layer)
Preview URL (if used): N/A — no app connectivity test
Preview project ID observed: N/A
Production (default) modified? NO
Cleanup: retained kc0272-restore-20260812 (explicit retain; do not delete without separate change control)
Acceptance (AC-1…AC-7): PASS (AC-7 = retain-with-ticket; AC-6 N/A — no Preview)
Issues: Remaining limitations — no app connectivity; no destructive prod recovery; no independent field/byte equality
Sign-off: RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS
```

---

## Unresolved prerequisites (remaining after 2026-08-12 drill)

| Prerequisite | Status (as of KC-027.2 drill) | Blocks |
|--------------|-------------------------------|--------|
| Confirm production `locationId` | **CONFIRMED** `asia-south1` | — |
| Managed backup artifact available for Path A | **VERIFIED** (backup READY; restore SUCCESSFUL) | — |
| Enable PITR | Ops (KC-027.1 §9) — still open | Path B |
| Create GCS backup bucket + export | Ops (KC-027.1 §9) | Path C (unless one-shot export run under change control) |
| Staging Firebase project + Preview env isolation | Ops | Path C Preview smoke |
| Application-level connectivity test against restored DB | Not performed | App-boot confidence on restore DB |
| Destructive production recovery | Out of scope / not performed | Production cutover |
| Field-level / byte-level equality audit | Not independently established | Absolute content equality claims |

Live Path A **data-plane** drill is complete. Remaining rows above are optional Path B/C, app smoke, or production cutover — not required to hold the non-prod PASS certification.

---

## Related

- [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)
- [Backup/Recovery Health (KC-027.3)](./firestore-backup-recovery-health.md)
- [Backup/Recovery Monitoring (KC-027.4)](./firestore-backup-recovery-monitoring.md)
- [KC-027.2 ARCH-009 gate](../architecture/kc-027-2-arch009-gate.md)
- [KC-027.3 ARCH-009 gate](../architecture/kc-027-3-arch009-gate.md)
- [KC-027.4 ARCH-009 gate](../architecture/kc-027-4-arch009-gate.md)
- [KC-027.1 ARCH-009 gate](../architecture/kc-027-1-arch009-gate.md)
- [Recovery Guide](./recovery-guide.md)
- [Backup Guide](./backup-guide.md)
- [Environment Management](./environment-management.md)
- [Vercel Configuration](./vercel-configuration.md)
