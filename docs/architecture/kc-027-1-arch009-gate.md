# KC-027.1 — Firestore Backup & Recovery Baseline — KC-ARCH-009 Gate

**Ticket:** KC-027.1  
**Type:** Infrastructure / Configuration (documentation + ops baseline)  
**Standards:** KC-ARCH-009 · KC-ARCH-001 (persistence awareness only) · KC-0058 (data preservation)  
**Date:** 2026-08-11  
**Constraint:** Do **not** modify Connect, Assignment Engine, repositories, authentication, or `firestore.rules`. Do **not** add a custom backup engine. Do **not** restore to production. Do **not** deploy production. Preview/staging must stay on isolated data.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Establish operational-resilience foundation for Firestore | Infrastructure |
| Document production project/database + backup/recovery design | Configuration / Operational Process |

**Primary request type:** Infrastructure

### 0.2 Root cause / gap (not a runtime bug)

| Gap | Classification | Evidence |
|-----|----------------|----------|
| No managed Firestore backup/PITR baseline documented for production | Infrastructure / Operations | `docs/operations/backup-guide.md` is placeholder (`YOUR_BUCKET`); KL-D04; DATA_PRESERVATION “Later: scheduled backups” |
| Recovery path not constrained to non-production drills | Operational Process | `recovery-guide.md` warns but lacks explicit non-prod runbook |
| Production inventory not centralized for DR | Configuration | Project ID known (`karkun-connect-75c68`); database `(default)` proven via Listen URLs; location still ops-confirm |

**STOP rule:** Not an application defect. Ops/docs baseline only — **no speculative app code**.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages / Components / Hooks | N | |
| Services / Repositories | N | Interfaces untouched |
| Firestore (runtime app) | N | No schema, rules, or client changes |
| Firestore (ops / GCP) | Y (docs only) | Managed backup/PITR/export design for ops enablement later |
| Authentication / Authorization / Session | N | |
| Bootstrap / Dashboard / Metrics | N | |
| Campaign / Assignment / Connect / Automation | N | |
| Notifications / Voice / API | N | |
| Caching / Persistence / Routing / State | N | |
| Background Tasks | N | No custom backup jobs in app |
| Performance / Monitoring / Logging | N / docs | Ops IAM + audit expectations documented |
| Security | Docs | IAM roles for backup/restore documented; rules unchanged |
| Dependencies | N | |
| Documentation / verify scripts | Y | Baseline + runbook + gate + verify |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Data Integrity / Persistence / Auth / Bootstrap / Dashboard / Repos | N/A | No runtime changes |
| Firestore application behavior | LOW | Docs-only |
| Accidental prod restore via future ops misuse | **HIGH** (process) | Runbook forbids prod restore; restore to new DB / staging only |
| Preview → production data coupling | **HIGH** (process) | Explicit isolation rule; Preview env must not use prod project |
| Custom backup engine creep | LOW | Explicitly out of scope |

### HIGH items

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Ops restores into `(default)` | Import/restore is destructive | Production data loss/corruption | Non-prod runbook only; hard precautions; no prod restore in this ticket | Doc review + verify script asserts prohibitions | Edit docs; no app rollback needed |
| Preview uses prod Firebase | Env misconfiguration | Live data risk in Preview | Document isolation; staging project naming | Preview smoke checks project id ≠ prod when staging configured | Fix Vercel Preview env |

### Operational classification

**Infrastructure / Operational Process** — documentation and future GCP console/`gcloud` enablement. **No application code changes.**

---

## Phase 2 — Implementation plan

### Strategy

1. Inventory production Firebase/Firestore from repo evidence (no live prod mutation).  
2. Design backup/recovery on Google managed capabilities (scheduled backups, PITR, GCS export/import).  
3. Publish baseline + non-production recovery runbook.  
4. Align existing backup/recovery ops docs; add verify script for artifact presence and constraints.  
5. Commit → push → **Vercel Preview only** → smoke that app behavior unchanged.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-027-1-arch009-gate.md` |
| Create | `docs/operations/firestore-backup-recovery-baseline.md` |
| Create | `docs/operations/firestore-nonprod-recovery-runbook.md` |
| Create | `scripts/verify-kc-027-1-firestore-backup-baseline.ts` |
| Edit | `docs/operations/backup-guide.md` |
| Edit | `docs/operations/recovery-guide.md` |
| Edit | `docs/operations/README.md` |
| Edit | `docs/architecture/DATA_PRESERVATION.md` |
| Edit | `docs/operations/known-limitations.md` |
| Edit | `package.json` (`verify:kc-027.1`) |
| Edit | `scripts/verify-production-readiness.ts` (require new baseline doc) |

### Not in scope

- Application workflows, Assignment Engine, repository interfaces, auth, `firestore.rules`
- Custom backup engine / Cloud Functions in this repo
- Enabling GCP schedules against production from this agent session
- Production restore or Production Vercel deploy

### Rollback

Revert the documentation/verify commit. No runtime rollback.

### Success criteria

- Production project/database inventory documented with evidence  
- Backup strategy, critical collections, retention, recovery, IAM, precautions documented  
- Non-prod recovery runbook executable by ops  
- Lint / typecheck / build / existing tests pass; no app runtime delta  

---

## Phase 3 — Verification plan

| Check | Method | Evidence |
|-------|--------|----------|
| Docs completeness | `npm run verify:kc-027.1` | Assert required sections + prohibitions |
| Production readiness doc list | `npm run verify:production` | New baseline listed |
| Typecheck / lint / build | `npm run typecheck` · `lint` · `build` | Exit 0 |
| Regression | Existing verify suite / smoke | No `src/` changes expected |
| Preview smoke | Vercel Preview URL | Login shell loads; no workflow code change |
| Production | **Not deployed** | Explicit stop |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1 | Root cause / gap proven? | **YES** — KL-D04 + placeholder backup guide |
| 2 | Objective evidence available? | **YES** — `.firebaserc`, Listen URLs, collections.ts |
| 3 | Software problem? | **NO** — ops/docs baseline |
| 4 | Configuration? | **YES** — GCP backup/PITR design |
| 5 | Operational? | **YES** — runbook |
| 6–16 | Bootstrap / auth / authz / repos / Firestore runtime / dashboard / persistence / routing / caching / async / races? | **NO** runtime impact |
| 17–22 | Dashboard totals / campaign / assignment / Connect / notifications / voice? | **NO** |
| Proceed? | **GO** — docs + verify only |

For YES on ops risks (Preview/prod restore): Impact = data loss; Mitigation = runbook prohibitions; Regression Tests = verify script + Preview isolation check.

---

## Phase 4 — Post-implementation audit

| Item | Result |
|------|--------|
| Workflows / Connect / Assignment / Auth / Rules / Repos changed? | **NO** — docs + verify only |
| Runtime behavior changed? | **NO** — no `src/` application edits |
| Docs + verify added? | **YES** |
| `npm run verify:kc-027.1` | **PASS** |
| `npm run verify:production` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm run lint` (repo-wide) | Pre-existing failures on unrelated files; **no findings** in KC-027.1 artifacts |
| `npm run verify:rc1` | Pre-existing fail (`Mission Workspace` route assert) — unrelated to this ticket |

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — baseline and runbook shipped; GCP scheduled backups / PITR must still be **enabled by ops** in Google Cloud (not performed by this ticket). Production restore remains forbidden until a future certified drill. Firestore `locationId` still TBD pending ops CLI/console confirm.

## Phase 6 — Post-deploy

Preview verification only. Production deploy: **NOT AUTHORIZED** for KC-027.1.
