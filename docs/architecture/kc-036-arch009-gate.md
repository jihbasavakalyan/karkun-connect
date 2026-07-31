# KC-036 — ARCH-009 Gate (Connection Integrity & Duplicate Request Audit)

**Classification:** Bug Fix / Investigation (data audit + prevention gap)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Hard rule:** Do **not** modify connection or registry data until Issue 1 root cause is documented from evidence.

## Phase 0 — Root cause & impact

### Issue 1 — Connection distribution

**Type:** Investigation / Data (possible Operations imbalance)  
**Hypothesis to prove with read-only production scan:** uneven Active connection counts per Rukn; multi-Active; duplicate assignment docs; import/bulk-assign skew.

**Canonical definition:** Active `connections` + campaign-eligible unique `karkunId` (`getConnectedKarkunsForRukn`). Registry `assignedRuknId` is denormalized.

### Issue 2 — Duplicate New Karkun requests

**Type:** Bug Fix  
**Provisional root cause (Architecture):** Submit gate uses `findMobileOwner` over **Rukn-scoped** client registry. Mobiles on Karkuns connected to other Rukns are invisible → request created. Approve path uses durable create-or-link.

### Impact Matrix

| Area | Issue 1 | Issue 2 |
|------|---------|---------|
| `connections` / assignment data | Read-only audit | N |
| `karkunRequestService` | N | Y — submit master-mobile gate |
| Privileged mobile lookup API | N | Y — Admin SDK existence check |
| Firestore rules / registry schema | N (unless required) | Maybe (prefer API) |
| Dashboard / metrics | N | N |
| Visits / BM / WI | N | N |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Connection data | HIGH if mutated | **No data mutation in this ticket until RCA complete** |
| Request submit | MEDIUM | Stronger block; clear MOBILE_EXISTS UX |
| Auth / API | MEDIUM | Authenticated lookup only; no writes |

## Phase 2 — Plan

1. Read-only `scripts/admin/kc036-connection-distribution-report.mjs` → JSON export  
2. Document Issue 1 RCA from evidence (no auto-rebalance)  
3. Issue 2: privileged mobile existence check before `appendKarkunRequestDurable`  
4. Behavioral verify script + regression  
5. Commit / push / production certify  

## Phase 3 — Verification

- Distribution report numbers (min/max/avg/median, >40/>60/>100)  
- Multi-Active / duplicate assignment detection counts  
- Submit blocks when mobile exists on any master Karkun  
- Existing records unchanged on block  
- Typecheck + scoped eslint  

## Go / No-Go

| # | Answer |
|---|--------|
| Modify connections before Issue 1 RCA? | **NO** |
| Speculative rebalance code? | **NO** |
| Fix Issue 2 submit gate after RCA of gap proven? | **YES (GO)** |

---

## Phase 4 — Regression audit

- Issue 1: read-only distribution report produced; no data writes
- Issue 2: master mobile lookup wired before request append; existing MOBILE_EXISTS UX preserved
- `verify:kc-036` green; typecheck + scoped eslint

## Phase 5 — Certification

**READY** (Issue 1: ops documentation only; Issue 2: code fix deployable)

## Phase 6 — Post-deploy

Filled after Vercel READY + production smoke (`/api/karkun-mobile-lookup` present).
