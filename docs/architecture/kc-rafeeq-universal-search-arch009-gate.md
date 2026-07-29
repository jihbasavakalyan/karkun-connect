# Digital Rafeeq — Universal Search & Smart Navigation — KC-ARCH-009 Gate

**Ticket:** Rafeeq Universal Search MVP v1.0  
**Type:** Enhancement (on approved KC-0131 + Rafeeq MVP bridge)  
**Standards:** DRDS v1.0 · KC-0131.1–.11 · KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-30  

---

## Phase 0 — Impact

**Classification:** Enhancement — production-ready universal search & smart navigation in Digital Rafeeq VoiceDrawer, using existing conversation stack.

| Area | Impacted? | Notes |
|------|-----------|-------|
| VoiceDrawer / OpsAnswerAction | Y | Richer result cards (optional fields) |
| `src/conversation/mvp/` | Y | Universal search adapter, ranking, classify |
| peopleStore / peopleSearch / campaignService / assignmentStore | Invoke only | No business-rule changes |
| ROUTES | Read only | No new routes |
| Firestore / repositories schema | N | |
| personResolution WIP | N | Not required — reuse peopleStore search |

---

## Phase 1 — Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Drawer UI | MEDIUM | Additive optional fields on actions; chips remain if fields absent |
| Search false positives | MEDIUM | Rank exact → startsWith → contains → related → light fuzzy |
| Classify NAV vs SEARCH | MEDIUM | Prefer NAV verbs (`open`/`go to`) for module aliases |
| Performance | LOW | Debounce submit, short TTL query cache, turn abort already present |

---

## Phase 2 — Plan

1. Ranking + universal search over people (karkun/muttafiq/rukn), campaigns, assignments, modules  
2. Expand navigation aliases (`go to`, reports, attendance, assigned karkuns)  
3. KC-0131 SEARCH adapter returns ranked universal hits (read-only, auto-approved)  
4. Drawer result cards + suggested queries  
5. `verify:rafeeq-search` + feature doc  

**Rollback:** Revert commit; drawer falls back to label-only chips.

---

## Phase 3 — Verification

- `npm run verify:rafeeq-search`  
- `npm run verify:kc-rafeeq-mvp-bridge` (no regression)  
- `npm run typecheck`  

---

## Go / No-Go

Architecture stack complete. Existing services reusable. **GO**
