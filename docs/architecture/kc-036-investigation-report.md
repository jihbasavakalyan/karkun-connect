# KC-036 — Investigation Report (Connection Integrity & Duplicate Requests)

**Generated:** 2026-07-31  
**Data mutation:** None (Issue 1 read-only). Issue 2 code fix only — no registry/connection writes.

---

## Issue 1 — Connection distribution

### Evidence source

`npm run admin:kc036:distribution` → `production-data/exports/kc036-connection-distribution-latest.json`  
Canonical = Active `connections`, unique campaign-eligible `karkunId` per Rukn.

### Results (production)

| Metric | Value |
|--------|-------|
| Total Rukns | 49 |
| Total connected Karkuns (canonical) | 586 |
| Active connection rows | 612 |
| All connection documents | 847 |
| Min / Max / Average / Median | **0 / 53 / 11.96 / 10** |
| Rukns with >40 | **1** (R007 Ruksana Tahsin — 53) |
| Rukns with >60 | **0** |
| Rukns with >100 | **0** |

### Integrity checks

| Check | Result |
|-------|--------|
| Karkun connected to multiple Rukns (multi-Active) | **0** |
| Duplicate Active connection records | **0** |
| Duplicate assignment numbers (ASN) | **0** |
| Registry Assigned without Active | **0** |
| Active without registry mirror | **0** |

### Root cause (Issue 1)

**Classification: Operations / User State (historical load) — not Architecture corruption.**

- No multi-Active or multi-Rukn Active violations.
- No duplicate ASN / assignmentId integrity failure.
- Distribution is moderately uneven (median 10; one Rukn at 53).
- Raw Active (612) − canonical unique eligible (586) = 26 Active rows that are non-eligible (e.g. Muttafiq / missing) — not double-counting the same Karkun across Rukns.
- Auto-assignment wizard does **not** persist connections; imbalance is consistent with **manual / bulk assign** and natural campaign growth, not a broken uniqueness rule.

**No connection data repair or rebalance in KC-036.** Optional future ops action (out of scope): transfer workload from R007 if desired.

---

## Issue 2 — Duplicate New Karkun requests

### Flow

`NewKarkunRequestModal` → `submitNewKarkunRequest` → local `findMobileOwner` (scoped) → pending check → `appendKarkunRequestDurable`.

### Root cause

**Classification: Architecture**

Rukn client hydrate only includes own connected + Available Karkuns (`readKarkunsForClient` / Firestore rules).  
`findMobileOwner` therefore **cannot see** mobiles belonging to Karkuns connected to other Rukns → **duplicate Pending requests** can be created. Approve later create-or-links via durable lookup.

### Fix (implemented)

1. Privileged API `POST /api/karkun-mobile-lookup` (Admin SDK, auth required, **read-only**).  
2. `submitNewKarkunRequest` calls `lookupMobileInMasterRegistry` in Firestore mode **before** append.  
3. On hit → `MOBILE_EXISTS` + Existing Person Found UX; **no new request**; existing records unchanged.  
4. Fail-closed if lookup unavailable (clear validation message).

### Files

- `api/karkun-mobile-lookup.ts`
- `src/server/karkunMobileLookup/lookupHandler.ts`
- `src/lib/people/lookupMobileInMasterRegistry.ts`
- `src/services/karkunRequestService.ts`
- `vercel.json`
- `scripts/admin/kc036-connection-distribution-report.mjs`
- `scripts/verify-kc-036-duplicate-request-prevention.ts`
- `docs/architecture/kc-036-arch009-gate.md`

---

## Decision

| Issue | Action |
|-------|--------|
| 1 | Document only — **no data changes** |
| 2 | Code fix + verify + production deploy |
