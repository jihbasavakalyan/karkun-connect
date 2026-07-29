# Digital Rafeeq — Campaign Intelligence — KC-ARCH-009 Gate

**Ticket:** Rafeeq Campaign Intelligence MVP v1.1  
**Type:** Enhancement (on KC-0131 + Universal Search)  
**Standards:** DRDS v1.0 · KC-0131.1–.11 · KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-30  

---

## Phase 0 — Impact

Read-only conversational campaign Q&A in VoiceDrawer via existing MetricsService / DashboardMetricsService / campaign / ijtema / baitul services. No writes. No Firestore schema changes.

| Area | Impact? | Notes |
|------|---------|-------|
| mvp REPORT path / handleInsights | Y | Upgrade to campaign intelligence |
| turnMetricsCache | Y | Add visit / registration / BM / campaign summary |
| VoiceDrawer / OpsAnswer | Y | Summary card + metric rows |
| Existing metric services | Invoke only | |

---

## Phase 1 — Risk

| Risk | Level | Mitigation |
|------|-------|------------|
| NAV vs campaign Q&A collide | MEDIUM | Classify intelligence phrases before NAV; narrow open/go-to module patterns |
| Duplicate metric fetches | LOW | Expand turnMetricsCache TTL bundle |
| Insight speculation | HIGH (prevent) | Only compare existing fields; document rules |

---

## Phase 2 — Plan

1. Expand metrics bundle + intelligence builder + insight rules  
2. Campaign intelligence execution adapter on REPORT path  
3. Session follow-up topics  
4. Panel metric/summary UI  
5. `verify:rafeeq-campaign-intelligence` + feature doc  

---

## Phase 3 — Verification

`npm run verify:rafeeq-campaign-intelligence` · `verify:rafeeq-search` · `verify:kc-rafeeq-mvp-bridge` · typecheck  

---

## Go / No-Go

Existing services sufficient. Architecture path preserved. **GO**
