# KC-027.1 — Firestore Backup & Recovery Baseline

**Status:** Baseline documentation (ops enablement required for live schedules)  
**Ticket:** KC-027.1  
**Standards:** KC-ARCH-009 · KC-0058 Data Preservation  
**Last updated:** 2026-08-11

This document is the operational-resilience foundation for Karkun Connect Firestore data. It does **not** change application workflows. It prefers Google-managed Firestore/GCP capabilities over any custom backup engine.

---

## 1. Production Firestore inventory (evidence-based)

| Property | Value | Evidence |
|----------|-------|----------|
| GCP / Firebase project ID | `karkun-connect-75c68` | `.firebaserc` (`projects.default`); admin/export scripts; Listen URLs in bootstrap timing exports |
| Firestore database ID | `(default)` | Production Listen/Write channel URLs: `.../databases/(default)/...` |
| Database mode | Native mode Firestore | App uses Firebase Web / Admin Firestore SDKs; `firebase.json` → `firestore.rules` + `firestore.indexes.json` |
| Client provider | `VITE_REPOSITORY_PROVIDER=firestore` | Production / staging env docs |
| Production app host | `https://karkun-connect.vercel.app` | `docs/release/VERSION-1.0.md` |
| Auth | Firebase Auth (email/password + phone OTP) + custom claims | Auth architecture docs; not covered by Firestore backup restore of Auth users |
| Recommended region | `asia-south1` (Mumbai) | Ops checklists (`firebase-production-audit.md`, `production-checklist.md`) |
| Region confirmation | **Ops must confirm** via Console or CLI | Agent environment had no authenticated `gcloud` access during KC-027.1; do not assume until verified |

### Confirm location (ops)

```bash
gcloud config set project karkun-connect-75c68
gcloud firestore databases describe --database='(default)' --format='yaml(name,locationId,type,pointInTimeRecoveryEnablement)'
```

Record `locationId` here when confirmed:

| Field | Confirmed value | Confirmed by | Date |
|-------|-----------------|--------------|------|
| `locationId` | _TBD — confirm before first restore drill_ | | |

### Environment isolation (hard rule)

| Environment | Firebase project | Data |
|-------------|------------------|------|
| Production | `karkun-connect-75c68` | Live pilot data — **untouched by Preview** |
| Preview / Staging | Dedicated non-prod project (e.g. `karkun-connect-staging`) | Isolated test / drill data only |
| Local CI | Usually `VITE_REPOSITORY_PROVIDER=local` | No production Firestore |

**Never** point Vercel Preview env vars at `karkun-connect-75c68`.

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│ Production: karkun-connect-75c68 / databases/(default)      │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
     ┌──────────▼──────────┐       ┌──────────▼──────────┐
     │ Managed backups     │       │ PITR (7-day window) │
     │ daily + weekly      │       │ minute granularity  │
     └──────────┬──────────┘       └──────────┬──────────┘
                │                             │
                │ restore → NEW database only │ clone / PITR export
                ▼                             ▼
     ┌──────────────────────┐      ┌──────────────────────────┐
     │ Non-prod DB in same  │      │ GCS export (archive /    │
     │ project OR staging   │      │ cross-project import)    │
     │ project import       │      └──────────────────────────┘
     └──────────────────────┘
                │
                ▼
     Preview / staging app (isolated credentials)
```

### Capability stack (preferred order)

| Layer | Mechanism | Purpose | Retention (target) |
|-------|-----------|---------|-------------------|
| A | **Firestore scheduled backups** (managed) | Primary DR snapshots; restore to a **new** database | Daily 14 days; weekly 14 weeks (platform max) |
| B | **Point-in-time recovery (PITR)** | Recent accidental deletes / bad writes | Fixed **7 days** (Google) |
| C | **Managed export → Cloud Storage** | Longer archive + **cross-project** recovery drills | 30 daily + 12 monthly (ops policy) |
| D | In-app JSON export (Admin → Settings) | Operator convenience / migration safety net | Last 5 automatic; not primary DR |

KC-027.1 establishes Layers A–C as the **baseline design**. Enabling schedules/PITR/GCS in GCP is an **ops action** after this documentation lands — not performed by this ticket against production.

---

## 3. Backup strategy

### 3.1 Managed scheduled backups (primary)

Enable on production database `(default)`:

| Schedule | Recurrence | Retention |
|----------|------------|-----------|
| Daily | `daily` | **14 days** (use max useful retention ≤ 14 weeks platform cap; start with 14d) |
| Weekly | `weekly` (pick low-traffic weekday, e.g. Sunday) | **14 weeks** |

Example (ops — production project, enable only after change control):

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=14d

gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=weekly \
  --retention=14w
```

List / verify:

```bash
gcloud firestore backups schedules list --database='(default)'
gcloud firestore backups list --database='(default)'
```

**Restore constraint:** Managed restore creates a **new** Firestore database. It does not overwrite `(default)` in place. Use that property for safe drills (see non-prod runbook).

### 3.2 Point-in-time recovery (PITR)

Enable PITR on `(default)` for 7-day minute-level recovery window:

```bash
gcloud firestore databases update '(default)' --enable-pitr
```

Use for:

- Surgical recovery of recent corruption  
- PITR export to GCS (`--snapshot-time`) when a precise timestamp is known  

### 3.3 Cloud Storage exports (archive + cross-project)

| Item | Recommendation |
|------|----------------|
| Bucket | `gs://karkun-connect-75c68-firestore-backups` (create in prod project; lock down IAM) |
| Path layout | `gs://…/firestore/YYYY/MM/DD/HHMM/` |
| Schedule | Daily 02:00 IST via Cloud Scheduler + export job (or Console scheduled export) |
| Encryption | Google-managed (CMEK optional later) |
| Soft delete / retention | Bucket lifecycle: 30 days nearline; promote one export/month to 365-day archive prefix |

One-shot export:

```bash
gcloud firestore export gs://karkun-connect-75c68-firestore-backups/firestore/manual/$(date +%Y%m%d) \
  --database='(default)'
```

### 3.4 What this baseline does **not** include

- Custom Node/Vite backup engines in the application  
- Changing repository interfaces or Connect/Assignment code  
- Automatic production restore  
- Backing up Firebase Auth users/claims (separate Auth export / claims scripts — see Admin ops)  
- Connecting Preview deployments to production data  

---

## 4. Critical collections

Source of truth: `src/repositories/firestore/collections.ts` + architecture docs.

| Priority | Collection | Why critical |
|----------|------------|--------------|
| P0 | `rukns` | Identity master for OTP / claims |
| P0 | `karkuns` | People registry |
| P0 | `connections` | Assignments — campaign execution core |
| P0 | `campaigns` | Active programme definition |
| P0 | `activityLogs` | Append-only audit trail |
| P0 | `connectionLedger` | Append-only lifecycle history (KC-0058) |
| P1 | `executions` | Annexure + guidance state |
| P1 | `followUps` | Field follow-up work |
| P1 | `compliance` | Ijtema / Baitul Maal / portal |
| P1 | `settings` | Counters, migration version, backup index, broadcasts |
| P2 | `communications` | Communication engine state |

### Settings documents of note

| Document ID | Role |
|-------------|------|
| `karkunCounter` | ID allocation |
| `connectionMeta` | Connection metadata |
| `migrationVersion` | Migration watermark |
| `backupIndex` | In-app JSON backup index |

**Full-database** backups/exports are the baseline (all collections). Collection-filtered export is optional for drills; production DR assumes whole-database coverage.

---

## 5. Retention expectations

| Artifact | Retention | Notes |
|----------|-----------|-------|
| Managed daily backups | 14 days | Platform-managed |
| Managed weekly backups | 14 weeks | Platform max window |
| PITR window | 7 days | Fixed by Google when enabled |
| GCS daily exports | 30 days | Bucket lifecycle |
| GCS monthly archives | 12 months | Move/copy under `archive/YYYY/MM/` |
| In-app JSON backups | Last 5 | Not a substitute for A–C |
| Git (`firestore.rules`, indexes, app) | Per release tags | Application rollback ≠ data restore |

**RPO / RTO targets (pilot baseline)**

| Scenario | RPO | RTO |
|----------|-----|-----|
| Recent bad write (PITR available) | ≤ 1 minute | Hours (ops + verification) |
| Corruption beyond PITR, backup available | ≤ 24 hours (daily) | ≤ 4 hours to **non-prod** verified restore; prod cutover is a **separate** change-controlled action |
| Project loss | Last GCS export | ≤ 24 hours rebuild + import into new project |

---

## 6. Recovery approach

| Scenario | Preferred path | Target |
|----------|----------------|--------|
| Drill / validation | Restore managed backup → **new** DB **or** import GCS export into **staging** project | Non-production only |
| Recent accidental delete | PITR read / PITR export → import to non-prod; validate; then deliberate prod procedure (future ticket) | Start non-prod |
| Bad deploy (code only) | Redeploy previous Vercel build | App host — no Firestore restore |
| Rules regression | Redeploy `firestore.rules` from git tag | Rules only |

**KC-027.1 stop condition:** Practice recovery **only** into non-production databases. See [firestore-nonprod-recovery-runbook.md](./firestore-nonprod-recovery-runbook.md).

---

## 7. Required IAM permissions

Grant to a dedicated ops break-glass group (not everyday developer accounts):

| Role | Why |
|------|-----|
| `roles/datastore.owner` **or** finer Firestore Admin | Create backup schedules, list backups, restore, export/import |
| `roles/datastore.importExportAdmin` | Managed export/import operations |
| `roles/storage.objectAdmin` (on backup bucket) | Read/write export objects |
| `roles/storage.admin` (bucket create once) | Create/configure backup bucket |
| `roles/cloudscheduler.admin` | If using Scheduler for export jobs |
| `roles/iam.serviceAccountUser` | Allow Scheduler/Functions to act as export SA |
| `roles/firebase.viewer` | Read Firebase project metadata during drills |

Service account for scheduled export (example):

- SA: `firestore-backup-exporter@karkun-connect-75c68.iam.gserviceaccount.com`
- Roles: `datastore.importExportAdmin`, `storage.objectAdmin` on backup bucket

**Deny by default:** Preview deploy service accounts and Vercel Preview env must **not** hold production export/import or restore permissions beyond what the app already needs for normal Auth/Firestore client access (and Preview should not use the prod project at all).

---

## 8. Production recovery precautions

1. **Never** run `gcloud firestore import` against production `(default)` from this baseline ticket or an unscheduled drill.  
2. **Never** delete production `(default)` to “make room” for a restore.  
3. Managed **restore** always targets a **new** database ID (e.g. `recovery-drill-20260811`).  
4. Treat Auth users/claims as a **separate** recovery domain — Firestore restore does not recreate Firebase Auth accounts.  
5. After any restore into a drill database, verify counts with Integrity Scanner / admin read-only scripts — do not attach production Vercel Production traffic to a drill DB.  
6. Record change ticket, operator, source backup ID, destination database, start/end time, and verification evidence.  
7. Blaze billing is required for export/backup features at production scale.  
8. Preview/staging Firebase projects stay isolated (see §1).

---

## 9. Ops enablement checklist (post-docs)

| Step | Owner | Status |
|------|-------|--------|
| Confirm `locationId` for `(default)` | Ops | ☐ |
| Create GCS backup bucket + lifecycle | Ops | ☐ |
| Enable PITR on `(default)` | Ops | ☐ |
| Create daily + weekly backup schedules | Ops | ☐ |
| Configure scheduled GCS export | Ops | ☐ |
| Assign IAM break-glass roles | Ops | ☐ |
| Run **non-prod** recovery drill using runbook | Ops | ☐ |
| Update this doc with confirmed location + schedule IDs | Ops | ☐ |

---

## 10. Related

- [Non-production recovery runbook](./firestore-nonprod-recovery-runbook.md)
- [Backup Guide](./backup-guide.md) (operator summary)
- [Recovery Guide](./recovery-guide.md)
- [Data Preservation (KC-0058)](../architecture/DATA_PRESERVATION.md)
- [Firestore architecture](../architecture/firestore.md)
- [KC-027.1 ARCH-009 gate](../architecture/kc-027-1-arch009-gate.md)

### External references

- [Firestore backups](https://cloud.google.com/firestore/docs/backups)
- [Point-in-time recovery](https://cloud.google.com/firestore/docs/use-pitr)
- [Export/import](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Disaster recovery planning](https://cloud.google.com/firestore/docs/disaster-recovery)
