# KC-027.3 — Firestore Backup & Recovery Health

**Ticket:** KC-027.3  
**Type:** Architecture / Operational Process (curated health contract)  
**Last updated:** 2026-08-12  
**Mode:** **Curated ops snapshot** — not a live GCP poll. Values below are verified evidence or explicit `unknown`.

This document is the **canonical Backup/Recovery Health** contract for operators. It exposes GCP managed disaster-recovery posture. It does **not** describe in-app JSON / browser migration backups.

---

## Domain separation (mandatory)

| Domain | What it is | Where it appears | Is Firestore DR health? |
|--------|------------|------------------|-------------------------|
| **GCP managed DR** | Managed backups, PITR, GCS export/import, non-prod restore drills | This doc · baseline · runbook · Console / `gcloud` | **YES** |
| **In-app / local JSON migration backup** | Admin Settings → Data Migration exports; `settings/backupIndex` | Settings UI (“Backup Status”); migration wizard | **NO** |

**Do not** treat Admin Settings **“Backup Status”** (“Local browser backups available via migration tools”) as Firestore DR health. That row is supplemental operator convenience only (KL-D04 / KC-027.1).

---

## Health states

| State | Meaning |
|-------|---------|
| `unknown` | Not yet verified, or verification stale beyond ops policy and not re-checked |
| `verified` | Confirmed by named evidence (CLI/Console/drill record) at `verificationTimestamp` |
| `stale` | Previously verified; age exceeds ops refresh policy (default: 7 days for live GCP signals) without re-check |
| `failed` | Last verification attempt failed, or drill/acceptance rejected |

Every field that can be live-checked must carry an explicit `healthState` and `verificationTimestamp` (ISO-8601 UTC) when not `unknown`.

**Forbidden claims:**
- Do **not** invent a “next scheduled backup execution time.”
- Do **not** label curated snapshot values as “live” unless a future Admin-authenticated server probe re-verifies them.
- Do **not** include PII, document contents, or GCP credentials/tokens in any health payload.

---

## Canonical health schema

| Field | Type / notes |
|-------|----------------|
| `asOf` | Snapshot “as of” timestamp (UTC) for this entire card |
| `source` | How values were obtained (`curated-ops-snapshot` \| future `server-admin-probe`) |
| `production.projectId` | GCP/Firebase project |
| `production.databaseId` | Firestore database ID |
| `production.locationId` | Region |
| `pitr.status` | enabled / disabled / unknown |
| `pitr.retention` | Platform retention window when enabled (Google: 7 days) |
| `pitr.healthState` | `unknown` \| `verified` \| `stale` \| `failed` |
| `pitr.verificationTimestamp` | When PITR status was last confirmed |
| `scheduledBackup.configured` | yes / no / unknown |
| `scheduledBackup.schedules` | Recurrence + retention + schedule IDs when known |
| `scheduledBackup.healthState` | `unknown` \| `verified` \| `stale` \| `failed` |
| `scheduledBackup.verificationTimestamp` | When schedules were last listed |
| `latestReadyBackup.id` | Backup ID |
| `latestReadyBackup.state` | e.g. READY |
| `latestReadyBackup.snapshotTime` | Snapshot timestamp |
| `latestReadyBackup.expireTime` | Expiry if known; else `unknown` |
| `latestReadyBackup.healthState` | `unknown` \| `verified` \| `stale` \| `failed` |
| `latestReadyBackup.verificationTimestamp` | When backup list was confirmed |
| `latestVerifiedRestore.targetDatabaseId` | Non-prod restore target |
| `latestVerifiedRestore.date` | Drill / restore date |
| `latestVerifiedRestore.result` | e.g. SUCCESSFUL |
| `latestVerifiedRestore.healthState` | usually `verified` after accepted drill |
| `recoveryDrill.certification` | Certification string |
| `recoveryDrill.healthState` | `unknown` \| `verified` \| `stale` \| `failed` |
| `knownLimitations` | Explicit list (no silent omissions) |

---

## Current curated snapshot

| Meta | Value |
|------|-------|
| **asOf** | `2026-08-12T00:00:00.000Z` (ops card date; drill evidence from same calendar day) |
| **source** | `curated-ops-snapshot` |
| **Live poll?** | **NO** — curated documentation only |

### Production database

| Field | Value | healthState |
|-------|-------|-------------|
| Project | `karkun-connect-75c68` | `verified` |
| Database | `(default)` | `verified` |
| Location | `asia-south1` | `verified` |
| verificationTimestamp | `2026-08-12` (KC-027.2 drill) | |

### PITR

| Field | Value |
|-------|-------|
| status | **unknown** (ops enablement checklist still open — not claimed enabled) |
| retention (when enabled) | **7 days** (Google platform fixed window — design target from baseline) |
| healthState | `unknown` |
| verificationTimestamp | _n/a — not yet CLI/Console confirmed for this health card_ |

### Managed scheduled backups

| Field | Value |
|-------|-------|
| configured | **unknown** (schedule IDs not recorded; a READY backup artifact existed for the drill) |
| schedules | Target design: daily **14d** + weekly **14w** (baseline). **Schedule IDs: not recorded.** |
| healthState | `unknown` |
| verificationTimestamp | _n/a — `backups schedules list` not certified into this card_ |
| next execution time | **Not claimed** — do not invent |

### Latest READY backup (verified artifact used in KC-027.2)

| Field | Value |
|-------|-------|
| Backup ID | `e58615a2-d8d7-428e-b5e5-55bf7b278f07` |
| State | `READY` |
| Snapshot | `2026-08-12T00:43:48.982318Z` |
| Expiry | `unknown` (not recorded in drill evidence) |
| healthState | `verified` |
| verificationTimestamp | `2026-08-12` (KC-027.2 Path A drill) |
| Note | This is the backup used for the verified restore. It is **not** asserted as “still the newest READY backup in GCP” without a fresh list. |

### Latest verified restore

| Field | Value |
|-------|-------|
| Target database | `kc0272-restore-20260812` |
| Location | `asia-south1` |
| Date | `2026-08-12` |
| Result | `SUCCESSFUL` |
| Source backup | `e58615a2-d8d7-428e-b5e5-55bf7b278f07` |
| Validation | 10/10 collections present; all 10 collection document counts matched production; document-ID parity zero differences; `karkuns` **678** production / **678** restored |
| Production modified? | **NO** |
| healthState | `verified` |
| verificationTimestamp | `2026-08-12` |

### Recovery drill certification

| Field | Value |
|-------|-------|
| Certification | **RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS** |
| Ticket | KC-027.2 |
| Path | A (managed backup → new non-prod database) |
| healthState | `verified` |
| verificationTimestamp | `2026-08-12` |

### Known limitations

- No application-level connectivity test against the restored database
- No destructive production recovery performed
- No field-level / byte-level equality verification

---

## Acquisition boundary

| Now (KC-027.3) | Later (separate ticket only if GO) |
|----------------|-------------------------------------|
| Ops updates this curated snapshot after CLI/Console checks and drills | Optional **server-side**, **Admin-authenticated**, **read-only**, least-privilege probe |
| `verify:kc-027.3` asserts contract presence — **does not call GCP** | Must never expose credentials/tokens to the browser |
| No restore / delete / import in any health endpoint | Health payload: IDs, timestamps, booleans, states only — **no PII / document contents** |

Documented ops probes (read-only; operator workstation — not the web app):

```bash
gcloud config set project karkun-connect-75c68
gcloud firestore databases describe --database='(default)' \
  --format='yaml(name,locationId,type,pointInTimeRecoveryEnablement)'
gcloud firestore backups schedules list --database='(default)'
gcloud firestore backups list --database='(default)'
```

After each successful probe or drill, update this card’s fields, `healthState`, `verificationTimestamp`, and `asOf`.

---

## Refresh / staleness policy (ops)

| Signal | Mark `stale` if |
|--------|-----------------|
| PITR / schedules / latest READY backup | Last `verificationTimestamp` older than **7 days** without re-list |
| Verified restore + drill certification | Retain `verified` until superseded by a newer accepted drill **or** explicitly revoked |

---

## Related

- [Firestore Backup & Recovery Baseline (KC-027.1)](./firestore-backup-recovery-baseline.md)
- [Non-production recovery runbook (KC-027.2)](./firestore-nonprod-recovery-runbook.md)
- [KC-027.3 ARCH-009 gate](../architecture/kc-027-3-arch009-gate.md)
- [Backup Guide](./backup-guide.md)
- [Known Limitations](./known-limitations.md) (KL-D04)
