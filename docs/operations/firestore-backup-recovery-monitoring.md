# KC-027.4 — Firestore Backup & Recovery Monitoring & Alerting

**Ticket:** KC-027.4  
**Stage:** **A — Docs/ops policy only**  
**Last updated:** 2026-08-12  
**Extends:** [KC-027.3 health contract](./firestore-backup-recovery-health.md)

This document defines **how operators monitor and escalate** Firestore managed backup/recovery posture. It does **not** run probes, send alerts, or change GCP.

**All numeric thresholds below are Karkun Connect operational policy — not a Google SLA.**

---

## Architecture stages

| Stage | Scope | Status |
|-------|--------|--------|
| **A** | Docs/ops monitoring & alerting policy + verify | **This ticket** |
| **B** | Future server-side **read-only** probe (least privilege) | Deferred |
| **C** | Future monitoring / notification channel wiring | Deferred |
| **UI** | Admin dashboard DR panel | Deferred (not Stage A–C prerequisite) |

---

## Explicit prohibitions

| Forbidden | Why |
|-----------|-----|
| Invent “next backup execution time” | Not a reliable documented signal in our ops contract |
| Claim a Google **backup-age SLA** | Age thresholds are **our** policy derived from RPO intent |
| Treat Settings “Backup Status” / `backupIndex` as DR health | In-app JSON / migration only — not GCP managed DR |
| Treat a successful backup alone as proof of recovery capability | Recovery requires accepted **restore drill** (KC-027.2) |
| Client-side GCP credentials or Admin APIs | Security boundary |
| PII / document contents in monitor payloads | Privacy |
| Restore / delete / import on any monitoring path | Blast-radius control |

---

## Three layers (do not conflate)

### A. Google / platform facts (documented in KC baseline — not SLAs we invent)

| Fact | Notes |
|------|-------|
| PITR window is **7 days** when enabled | Platform fixed window |
| Managed backups can be scheduled (e.g. daily / weekly) with retention | Console / `gcloud` |
| Managed restore targets a **new** database ID | Does not overwrite `(default)` in place |
| Ops can list backups (ID, state, snapshot time) and schedules | Documented probes |

**Not assumed:** guaranteed backup completion cadence SLA; next-run timestamp field.

### B. Karkun Connect operational policy

| Policy | Value |
|--------|-------|
| Primary DR | Managed **daily** schedule on production `(default)` (+ weekly preferred) |
| Design RPO (beyond PITR) | ≤ 24 hours (baseline) |
| Health card refresh | Re-verify live GCP signals within **7 days** |
| Non-prod restore drills | Required to prove recovery path (KC-027.2) |
| GCS export | Archive / Path C — not required for Path A health |

### C. Derived monitoring thresholds (OUR policy)

| Check | Threshold | Monitoring state |
|-------|-----------|------------------|
| Latest READY backup age (`now − snapshotTime`) | **> 36 h** | `warning` |
| Latest READY backup age | **> 72 h** | `failed` |
| No READY backup in list | any | `failed` |
| Required **daily** schedule missing (after enablement GO) | any | `failed` |
| **Weekly** schedule gap (when policy requires weekly) | any | `warning` |
| Health snapshot / last successful verification age | **> 7 d** | `stale` |
| No successful verification | **> 14 d** | `failed` |
| Recovery drill age since last accepted PASS | **> 90 d** | `warning` |
| Recovery drill age | **> 180 d** | `failed` (overdue) |
| GCS export / bucket unset | any | `warning` only — **not** a Path A failure |

**Missing daily schedule:** after change control requires schedules, `backups schedules list` has **no** schedule with daily recurrence for `(default)`.

---

## Monitoring signals

| Signal | Source | Notes |
|--------|--------|-------|
| PITR status | `databases describe` → `pointInTimeRecoveryEnablement` | Score `unknown` until verified |
| Daily schedule existence | `backups schedules list` | Required for Path A posture after enablement |
| Weekly schedule status | same | Policy prefers weekly; gap = `warning` |
| Latest READY backup | `backups list` | ID, snapshot, state |
| Backup age | Derived from snapshot time | Ops policy thresholds above |
| Backup state | Listed state | Expect READY for usable restore source |
| Health snapshot freshness | KC-027.3 `asOf` / verification timestamps | 7d / 14d policy |
| Recovery drill freshness | Last accepted drill date | 90d / 180d policy |
| Known configuration gaps | Baseline §9 checklist | PITR, schedules, GCS, IAM |

---

## Operational states

| State | Meaning |
|-------|---------|
| `healthy` | Required signals present and within policy thresholds |
| `warning` | Degraded but actionable soon |
| `stale` | Last successful verification older than refresh policy |
| `failed` | Missing required control, critical age breach, or probe failure |
| `unknown` | Never verified / insufficient evidence |

### Composite severity (worst wins)

```
failed > stale > warning > unknown > healthy
```

---

## Incident severity mapping

Aligns with [incident-response.md](./incident-response.md) (P1–P4). Backup monitoring does **not** invent new severity levels.

| Condition (examples) | Suggested severity | Response intent |
|----------------------|--------------------|-----------------|
| No READY backup **or** READY age **> 72 h** (after schedules expected) | **P2 — High** | Major DR control broken; 1 hour triage |
| Probe / verification failure; health card **> 14 d** without success; drill **> 180 d** overdue | **P3 — Medium** | Degraded resilience assurance; 4 hour / same-day ops |
| READY age **> 36 h**; weekly schedule gap; GCS gap; drill **> 90 d**; health **> 7 d** (`stale`) | **P4 — Low** | Next business day / planned ops refresh |
| Production outage / data-loss incident in progress | **P1** via incident-response — restore is **separate** certified procedure | Not this monitor alone |

---

## Security boundary

- No GCP credentials/tokens in the browser  
- No PII or document contents in health/monitor payloads  
- No restore / delete / import on monitoring paths  
- Stage B/C automation (if ever): **server-side**, Admin-authenticated where app-facing, **read-only**, least-privilege SA (list/describe only — not break-glass owner)

---

## Stage A operator checklist

| Cadence | Action |
|---------|--------|
| At least every 7 days | Re-run read-only `describe` / `schedules list` / `backups list`; update [health card](./firestore-backup-recovery-health.md) |
| On threshold breach | Apply composite state; open incident at mapped P-level |
| After enablement changes | Record schedule IDs / PITR status into health card |
| After each accepted drill | Update drill date + certification; reset drill-age clock |

Documented probes (operator workstation — not the web app):

```bash
gcloud config set project karkun-connect-75c68
gcloud firestore databases describe --database='(default)' \
  --format='yaml(name,locationId,type,pointInTimeRecoveryEnablement)'
gcloud firestore backups schedules list --database='(default)'
gcloud firestore backups list --database='(default)'
```

---

## Current evidence snapshot (curated — not a live poll)

| Field | Value |
|-------|-------|
| Production database | `(default)` |
| Location | `asia-south1` |
| Latest READY backup (drill artifact) | `e58615a2-d8d7-428e-b5e5-55bf7b278f07` |
| Snapshot | `2026-08-12T00:43:48.982318Z` |
| Restore target | `kc0272-restore-20260812` |
| Restore result | `SUCCESSFUL` |
| KC-027.2 certification | **RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS** |
| Monitor source | Curated ops evidence (KC-027.2 / KC-027.3) — **not** live automation |
| Open gaps (score carefully) | PITR status `unknown`; schedule IDs not recorded; GCS unset |

A READY backup and a successful drill prove **past** restoreability for that artifact. Ongoing posture still requires schedule existence + fresh READY backups per thresholds above.

---

## Stage B / C prerequisites (remaining)

| Prerequisite | Blocks |
|--------------|--------|
| PITR enablement confirmed (if policy requires) | Honest PITR scoring |
| Daily (+ weekly) schedule IDs recorded | Schedule-existence alerts without `unknown` |
| Least-privilege read-only SA for list/describe | Stage B probe |
| Confirmed Admin API / client surface (do not assume `firebase-admin` covers backups) | Stage B code |
| Notification channel (email / Cloud Monitoring / ops pager) | Stage C |
| Scheduler (Cloud Scheduler / Vercel cron / equivalent) | Automated cadence |
| Change control for production IAM | Any automation |

---

## Related

- [Backup/Recovery Health (KC-027.3)](./firestore-backup-recovery-health.md)
- [Firestore Backup & Recovery Baseline (KC-027.1)](./firestore-backup-recovery-baseline.md)
- [Non-production recovery runbook (KC-027.2)](./firestore-nonprod-recovery-runbook.md)
- [Monitoring](./monitoring.md)
- [Incident Response](./incident-response.md)
- [KC-027.4 ARCH-009 gate](../architecture/kc-027-4-arch009-gate.md)
