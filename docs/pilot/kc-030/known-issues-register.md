# KC-030 — Known Issues Register

**Date:** 2026-07-31  
**Build:** `a3b623f` · `1.0.0-rc.1`  
**Policy:** Critical / High block go-live. Medium / Low may ship with workaround for controlled pilot.

Related historical log: [../known-issues.md](../known-issues.md)

---

## Severity

| Level | Definition | Pilot impact |
|-------|------------|--------------|
| Critical | Pilot stopped; no workaround | Block |
| High | Major workflow broken | Block |
| Medium | Degraded / harness drift; workaround exists | Conditional |
| Low | Cosmetic / minor | Does not block |

---

## Open — KC-030 findings

| ID | Severity | Area | Description | Evidence | Disposition |
|----|----------|------|-------------|----------|-------------|
| KC030-M01 | Medium | Verify harness | `verify:persistence` fails in Node without JWT (`Not signed in`) after KC-0061 claims gate | `scripts/verify-persistence.ts` | Refresh harness in follow-up; not a signed-in product defect |
| KC030-M02 | Medium | Verify harness | `verify:kc0101b` expects removed `modulePctOrZero` symbol | `scripts/verify-kc0101b-dashboard-integrity.ts` | Update assert; dashboard still uses `getDashboardHealthSlices` |
| KC030-M03 | Medium | Verify harness | `verify:compliance` expects legacy `/admin/compliance?...` deep links | `adminCompliancePath` → Operations review hub | Update assert to new IA |
| KC030-M04 | Medium | Verify harness | `verify:kc0102.0` reads re-export stub for queue diagnostics | Real queue: `forms/people/PendingKarkunRequestQueue.tsx` | Point verify at canonical path |
| KC030-M05 | Medium | Verify harness | `verify:routes` fails (route map drift after Activities IA) | `scripts/verify-routes.ts` | Refresh route inventory |
| KC030-M06 | Medium | UX (carry) | Admin mobile hamburger drawer awkward | Prior M-03 | V1.1 backlog |
| KC030-L01 | Low | UX (carry) | Dead “View History” / contrast / search placeholder / rememberMe default | Prior L-01…L-04 | V1.1 backlog |

---

## Known limitations (accepted for controlled pilot)

| ID | Source | Limitation |
|----|--------|------------|
| KL-028B-1 | KC-028B | Some matrix screens still on `useBusyAction` (Quick Actions on full lifecycle) |
| KL-028B-2 | KC-028B | Timeout rejects outer Promise; in-flight Firestore SDK call not abortable |
| KL-029-1 | KC-029 / 029.1 | Muttafiqeen outside campaign execution activity cards |
| KL-029-2 | KC-029 | “Most Improved” is proxy without historical snapshots |
| KL-029-3 | KC-029.1 | Absolute PDF page count still scales with Rukn roster |

---

## Resolved (recent — do not re-open without evidence)

| ID | Note |
|----|------|
| KC-028B | Write ACK / retry / duplicate coalesce / assignment connections ACK |
| KC-029.1 | Executive report density, ranking > 0, coverage wording removed |
| KC-028C | Weekly Ijtema attendance window automation |

---

## Observations (not defects)

| ID | Note |
|----|------|
| OBS-030-1 | Interactive production smoke still required for leadership full go-live signature |
| OBS-030-2 | Automated suite is necessary but not sufficient for UX / audio / PDF visual sign-off |
