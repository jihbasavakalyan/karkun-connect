# Digital Rafeeq — Secretary Intelligence v1.0 (اردو فرسٹ) — KC-ARCH-009 Gate

**Ticket:** Secretary Intelligence v1.0  
**Type:** Enhancement  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · DRDS · existing Rafeeq MVP/v2  
**Date:** 2026-07-30  

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

**Enhancement** — compose existing guidance, journey, metrics, and search into حلقہ-سیکرٹری style Urdu answers.

### 0.2 Root cause

N/A (not a bug). Evidence of gap:

- `handleKarkunInfo` returns name/mobile only
- Campaign intelligence narratives are English metric dumps
- Follow-ups like «کیا باقی ہے؟» after a person report are not secretary-scoped

### 0.3 Impact Matrix

| Area | Impact? | Notes |
|------|---------|-------|
| UI / pages / components | N | Voice drawer consumes `text` only |
| Hooks | N | |
| Services | Read | guidance, journey, baitulMaal, metrics bundle, search |
| Repositories / Firestore | N | No schema or write changes |
| Authz / session / bootstrap | LOW | Session memory for person continuity only |
| Dashboard / metrics | Read | `getTurnMetricsBundle` only |
| Campaign / assignment | Read | Existing campaign intelligence builder |
| Voice | N | Same turn pipeline |
| Caching / persistence | N | |
| Routing / state | N | |
| Monitoring / logging | LOW | Existing MVP observability |
| Security | LOW | Read-only composition |
| Dependencies | N | No new packages |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation / Verification |
|------|------|---------------------------|
| Conversation stack | MEDIUM | Keep `runRafeeqTurn` → classify → handlers/adapters; no new write paths |
| Campaign intel English verifies | MEDIUM | Urdu text must still match `/connected\|منسلک\|Connected/i`; metadata topics unchanged |
| Person search / safe actions | LOW | Search adapter unchanged; only info text enriched |
| Persistence / Firestore | LOW | Assert no writes in verify |
| Classify collisions (`رپورٹ`) | HIGH | Person report patterns = `کی رپورٹ` / `رپورٹ بتا` only — not bare `رپورٹ` (preserves `رپورٹ کھولو`) |

Operational/config: none — product composition only.

---

## Phase 2 — Implementation plan

### Strategy

Thin `src/conversation/mvp/secretaryIntelligence/` that formats existing facts into fixed Urdu sections. No new data model.

### Files

- **Add:** `secretaryIntelligence/*`, ARCH-009 gate, `scripts/verify-rafeeq-secretary.ts`, `package.json` script
- **Edit:** `classifyMvp.ts`, `handlers.ts`, `campaignIntelligence/adapter.ts` + `formatCampaignIntelligenceText`, `runRafeeqTurn.ts` (KARKUN_INFO focus), topics for Urdu campaign questions

### Order

1. Secretary formatters + person snapshot builder  
2. Wire karkun info + campaign format  
3. Classify continuity + Urdu campaign topics  
4. Verify + commit  

### Rollback

Revert the commit; no migrations.

### Success criteria

- Person report covers visit / JIH / ijtema / baitul / pending / risk / advice in Urdu  
- Campaign answers use secretary sections + analysis  
- «کیا باقی ہے؟» continues last person  
- `npm run verify:rafeeq-secretary` green  
- Prior `verify:rafeeq-campaign-intelligence` / `verify:rafeeq-v2` still pass  

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit | Formatters emit required Urdu headings; no English Status/Pending/Risk labels |
| Integration | `runRafeeqTurn` person report + campaign overview |
| Continuity | Report → «کیا باقی ہے؟» uses same person |
| Regression | Campaign intel + v2 verifies |
| Firestore | `noFirestoreWrite` metadata |
| Production smoke | Manual VoiceDrawer after deploy (Phase 6) |

Evidence: verify script console summary; sample texts contain `موجودہ صورتحال` / `تجویز`.

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Impact understood? | YES — conversation text composition only |
| HIGH risks mitigated? | YES — classify patterns scoped; read-only services |
| Verification defined? | YES — `verify:rafeeq-secretary` |
| Reuse existing services? | YES — no new repos/models |
| Ready to code? | **GO** |

---

## Phase 5 — Certification (post-verify)

**READY WITH KNOWN LIMITATIONS** — `npm run verify:rafeeq-secretary` 12/12.

Limitation: person-report depth depends on in-memory registry + guidance stores (same as existing guidance surfaces).
