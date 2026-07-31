# KC-036A — Forensic Investigation: R007 Connection History

**Status:** Investigation complete (read-only)  
**Subject:** R007 — Ruksana Tahsin (53 Active connected Karkuns)  
**Constraint:** No Firestore writes · No rebalance · No behavioural app changes  
**Evidence artifact:** `production-data/exports/kc036a-r007-forensics-latest.json`  
**Script:** `scripts/admin/kc036a-r007-connection-forensics.mjs`

---

## 1. Executive Summary

R007’s 53 Active connections were **not** created by a single migration dump, CSV import, or Admin bulk-assign. Production metadata shows:

- **100%** of Active rows have `assignedBy: "Rukn"`.
- Creations span **three calendar days** (24 / 30 / 31 Jul 2026), not one second-level blast.
- Inter-assignment gaps are typically **tens of seconds** (median ≈ 70s; minimum ≈ 14s) — consistent with **one-by-one Connect confirmations** in the Rukn UI, not a scripted millisecond loop.
- ASN numbers are **interleaved with the global ASN sequence** (not one contiguous block of 53), proving concurrent live allocation while R007 was connecting.

**Root cause (evidence-supported):** Gradual operational accumulation via the Rukn **Connect** workflow (`AvailableKarkunPage` → `assignKarkun(..., 'Rukn')`), concentrated in three high-activity sessions.

**Confidence: High**

---

## 2. Timeline of assignments

### By `createdAt` day

| Date (UTC date of `createdAt`) | Assigned |
|--------------------------------|----------|
| 2026-07-24 | **10** |
| 2026-07-30 | **14** |
| 2026-07-31 | **29** |
| **Total** | **53** |

### Session-style clusters (successive creates ≤ 5 minutes apart)

| Cluster window (UTC) | Size | Span |
|----------------------|------|------|
| 2026-07-24 10:16 → 10:30 | 10 | ~14 min |
| 2026-07-30 08:27 → 08:41 | 10 | ~14 min |
| 2026-07-31 10:01 → 10:10 | 7 | ~10 min |
| 2026-07-31 10:22 → 10:33 | 9 | ~11 min |
| 2026-07-31 10:50 → 10:53 | 6 | ~2.5 min |
| 2026-07-31 11:11 → 11:13 | 6 | ~2.6 min |
| (+ smaller pairs / singles) | … | … |

### Gap statistics (between successive `createdAt` among the 53)

| Metric | Value |
|--------|-------|
| Min gap | ~14 s |
| Median gap | ~70 s |
| Gaps &lt; 60 s | 24 |
| Gaps &lt; 5 min | 44 |
| Gaps &gt; 1 h | 2 (day boundaries between 24→30 and 30→31) |

**Interpretation:** Accumulation is **batched across days**, but **within each day** it is rapid sequential human-paced assignment — not a single atomic import of 53.

`effectiveFrom` is always the same calendar day as `createdAt` (date-only field vs ISO timestamp) — normal for `todayDate()` in `assignKarkun`.

---

## 3. Evidence collected

### Per-connection fields present on all 53 Active docs

| Field | Present |
|-------|---------|
| `assignmentNumber` (ASN) | 53/53 |
| `karkunId` / name (via registry join) | 53/53 |
| `ruknId` = R007 | 53/53 |
| `assignedDate` | 53/53 |
| `effectiveFrom` | 53/53 |
| `createdAt` / `updatedAt` | 53/53 |
| `assignedBy` | 53/53 — **all `"Rukn"`** |
| `createdBy` | **0/53** |
| `source` | **0/53** |
| migration / seed flags | **0/53** |
| `remarks` | **0/53** |
| `transferHistory` | **0/53** |
| `version` | **0/53** |

### `assignedBy` breakdown

| Value | Count |
|-------|-------|
| `Rukn` | 53 |
| `Administrator` | 0 |

### ASN sample (chronological by `createdAt`)

First: `ASN-000285` … `ASN-000308` (Jul 24)  
Later: `ASN-000513`–`ASN-000542` (Jul 30)  
Latest: `ASN-000699` … `ASN-000844` (Jul 31)

Longest consecutive ASN runs on R007 alone: length **7** and **6** — not a run of 53. ASNs jump (e.g. 308 → 513), showing **other Rukns/admins allocated ASNs between R007’s connects**.

### Connection ledger

Query `connectionLedger` where `ruknId == R007` returned **0** entries. Ledger therefore provides **no additional provenance** for this investigation.

### Distribution context

| Rank | Rukn | Canonical count |
|------|------|-----------------|
| 1 | **R007** | **53** |
| 2 | R047 | 24 |
| 3–4 | R043 / R010 | 20 |
| 5 | R015 | 19 |

R007 is a **present-day high-load outlier** (~2× next Rukn), not explained by multi-Active corruption (KC-036 already showed 0 multi-Active).

Full row dump (ASN, IDs, names, timestamps): see JSON artifact `connections[]`.

---

## 4. Repository findings

Code capable of creating many connections to one Rukn:

| File | Function / UI | Actor stamp | Relevance to R007 |
|------|---------------|-------------|-------------------|
| `src/pages/rukn/AvailableKarkunPage.tsx` | `handleConfirmConnect` → `assignKarkun(id, ruknId, 'Rukn')` | **`Rukn`** | **Matches all 53 rows** |
| `src/lib/assignmentEngine.ts` | `assignKarkun` / `assignRukn` | Caller-supplied | Live assign path |
| `src/lib/assignmentEngine.ts` | `bulkAssignKarkuns` | Caller-supplied | Loop of `assignKarkun` |
| `src/components/forms/people/BulkAssignModal.tsx` | Admin bulk UI | **`Administrator`** | **Does not match** (`assignedBy` would be Administrator) |
| `src/hooks/useCampaignSetupWizard.ts` | `distributeAssignments` | N/A | **UI-only** — does not persist connections |
| `scripts/admin/import-dataset-backup.mjs` | Writes `backup.assignments` → `connections` | Backup-dependent | Would typically preserve whatever `assignedBy` was in backup; **no evidence** of a 53-row R007 seed blast in timestamps |
| `src/services/productionDataMigrationService.ts` | People migration | N/A | Imports people as Available — **does not create connections** |
| `src/services/karkunRequestService.ts` | Approve → `assignKarkun` | Usually Admin/approve path | Approve would not systematically stamp all 53 as `Rukn` without using Rukn connect |

**Git history (illustrative, not exhaustive):** assignment lifecycle introduced around Sprint 8 (`7dff9d2`, `66e062e`); bulk/admin integrity work in KC-0061/0063/0064; no commit identified that hard-codes R007 or seeds 53 connections to Ruksana.

---

## 5. Firestore metadata findings

### What exists

On Active `connections` for R007, only:

`assignmentId`, `assignmentNumber`, `ruknId`, `karkunId`, `status`, `assignedDate`, `effectiveFrom`, `assignedBy`, `createdAt`, `updatedAt`

### What is missing (limits the investigation)

| Desired evidence | Status |
|------------------|--------|
| Explicit `source` (`migration` / `import` / `bulk` / `ui`) | **Absent** |
| `createdBy` user id / display name | **Absent** |
| Migration / seed flags | **Absent** |
| Client session / device id | **Absent** |
| `connectionLedger` CONNECTED events for R007 | **None found** |
| Request-approval linkage on the connection doc | **Absent** |

Therefore: we can prove **actor class** (`Rukn` vs `Administrator`) and **timing**, but we **cannot** name the human operator beyond “performed via a path that stamps `assignedBy: Rukn`”.

---

## 6. Root cause analysis

| Hypothesis | Supported? | Evidence |
|------------|------------|----------|
| Gradual operational accumulation | **YES** | 3 days; human-paced gaps; interleaved ASNs |
| Bulk migration / seed dump | **NO** | No migration fields; not one contiguous ASN block; multi-day; `assignedBy=Rukn` |
| CSV / dataset import of connections | **NO** | Same as above; import script exists but pattern does not match this footprint |
| Manual Admin bulk assign | **NO** | Bulk UI stamps `Administrator`; all 53 are `Rukn` |
| System bug creating duplicates | **NO** | Unique Active per Karkun; KC-036 multi-Active = 0 |
| Unknown | Partial only for **which Rukn user session** | Missing `createdBy` / ledger |

**Conclusion:** R007 accumulated 53 connections through **repeated Rukn Connect actions** (Available → confirm → `assignKarkun(..., 'Rukn')`) over **24 Jul, 30 Jul, and 31 Jul 2026**, with high throughput within each session.

---

## 7. Confidence level

**High**

Supported by: uniform `assignedBy`, multi-day timeline, gap distribution, ASN interleaving, UI code path match, exclusion of Admin bulk stamp.

Residual uncertainty: which authenticated Rukn account performed the clicks (metadata gap), and whether any Assistive tooling automated the confirm modal (still would stamp `Rukn` and look similar) — **not** evidenced either way.

---

## 8. Recommendations (ops only — no code change required for this ticket)

1. **Do not rebalance** solely because R007 is #1 — load is operationally explained.  
2. If workload fairness is a product goal, use **Transfer** / guided redistribution as a separate ops ticket.  
3. Optional future observability (separate ticket): persist `createdBy` uid and/or append `connectionLedger` CONNECTED events so future forensics need not infer actor from `assignedBy` alone.  
4. Keep the forensic script for re-runs:  
   `node scripts/admin/kc036a-r007-connection-forensics.mjs`

---

## Appendix — How to reproduce (read-only)

```bash
node scripts/admin/kc036a-r007-connection-forensics.mjs
# optional: --rukn=R047
```

Requires Admin SDK credentials (`FIREBASE_SERVICE_ACCOUNT_PATH` / `GOOGLE_APPLICATION_CREDENTIALS`) as with other `scripts/admin/*` reports.
