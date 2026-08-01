# KC-038 — Campaign Extension (ARCH-009 Gate)

**Classification:** Configuration / Data (campaign timeline) + presentation messaging  
**Constraint:** Extend existing campaign only. No new campaign. No data reset. No historical mutation beyond `endDate`.

## Phase 0

**Need:** Official extension of فعال کارکن، فعال جماعت from end **2026-08-02** → **2026-08-09**.

### Impact

| Area | Impacted? | How |
|------|-----------|-----|
| `mockMissions` / seed backup | Y | Active campaign `endDate` |
| Firestore `campaigns` (if present) | Y | Patch `endDate` only |
| Timeline / remaining days / reports | Y | Derived from campaign end — auto |
| Hero / announcement / phase copy | Y | Extended / Phase II messaging |
| Visits, connections, attendance, etc. | N | No reset |

## Phase 1

| Risk | Level | Mitigation |
|------|-------|------------|
| Accidental campaign reset | HIGH | Only merge `endDate` |
| Hardcoded Aug 2 displays | MEDIUM | Repo search + seed/verify update |
| Prod still on Aug 2 | HIGH | Admin patch script after deploy |

## Phase 2

1. Seed endDate → `2026-08-09`  
2. Extension announcement + phase messaging  
3. Hero “Extended Campaign / Phase II”  
4. Objectives list (no duplicates)  
5. Verify + Firestore patch + deploy  

## Phase 3

- Timeline with end 9 Aug recalculates totalDays / remaining  
- Reports use `formatCampaignDate` from active campaign  
- `verify:kc-038`  

## Go / No-Go

| Question | Answer |
|----------|--------|
| New campaign? | NO |
| Reset operational data? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

- `verify:kc-038` 4/4
- `typecheck` clean
- Seed + seed-backup endDate `2026-08-09`; timeline remaining/totalDays recalculated; no operational data reset

## Phase 5 — Certification

**READY** — Campaign extension only (`endDate` + presentation messaging).

## Phase 6 — Post-deploy

| Check | Result |
|-------|--------|
| GitHub HEAD | `cc5b392` on `origin/main` |
| Vercel | `dpl_58DX5dFvjDPi5B3YA3kZ6pPRZMmn` READY |
| Firestore campaigns | Empty — seed `mockMissions` endDate `2026-08-09` (no patch write) |
| Prod smoke | `2026-08-09` in firestoreRepositories chunk; extension copy in campaignIdentity chunk |
| Verifies | `verify:kc-038` · typecheck |

**Closure:** KC-038 complete — campaign continues through 9 Aug 2026.
