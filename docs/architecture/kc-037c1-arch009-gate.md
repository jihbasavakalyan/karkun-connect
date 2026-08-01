# KC-037C1 — Executive Campaign Report V2 (ARCH-009 Gate)

**Classification:** Enhancement (presentation / content only)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037A/B frozen  
**Scope:** Executive Campaign Report content redesign only. No dashboard, Excel/CSV/JSON, other report types, trends, or Rafeeq insights.

## Phase 0 — Root cause & impact

**Need:** Executive PDF is operationally dense but not structured as a management briefing (where we are → achievements → remaining → priorities → recommendations → appendix).

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `campaignReportModel` | Y | Additive cover/timeline fields + V2 narrative blocks from existing metrics |
| `campaignReportPdf` / Urdu HTML CSS | Y | Section order, hierarchy, KPI layout |
| `campaignReportUrdu` | Y | Section labels |
| Composer / Registry / Providers / PDF download flow | N | Unchanged contracts |
| Report Center UI / Firestore / auth | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Executive PDF KPIs | **HIGH** | Same `CanonicalMetricProviders` / Composer model; no alternate math |
| Composer path | **HIGH** | Keep `composeKc034CampaignReportModel` → `downloadCampaignReportPdf` |
| Urdu typography | MEDIUM | `verify:kc-bug-0126` |
| Report Center | LOW | UI unchanged |

## Phase 2 — Plan

1. Presentation helper: achievements / remaining / priorities / closing from existing model metrics only  
2. Extend cover with timeline days (from `getCampaignTimeline`)  
3. Rebuild Executive HTML section hierarchy + spacing  
4. `verify:kc-037c1` + regression verifies  

## Phase 3 — Verification

- `verify:kc-037c1` — V2 sections present; Composer + KC-033 markers; no Firestore in PDF builder  
- `verify:kc-037a`, `verify:kc-037b`, `verify:kc-bug-0126`, typecheck  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Bypass Composer / KC-033? | NO |
| Change Composer/Registry architecture? | NO |
| Invent KPI calculations? | NO |
| Implement other report types? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037c1` 4/4 — V2 content, Composer PDF path, KC-033-only, Report Center intact
- `verify:kc-037a` 6/6
- `verify:kc-037b` 6/6
- `verify:kc-bug-0126` — Urdu PDF typography / Connection≠Visit
- `typecheck` clean

## Phase 5 — Certification

**READY** — Executive Campaign Report V2 presentation only; Composer + KC-033 + PDF download flow unchanged.

## Phase 6 — Post-deploy

| Check | Result |
|-------|--------|
| GitHub HEAD | `e194bc4` on `origin/main` |
| Vercel | `dpl_3QXK3umnttbCiAPcfmAKETXY2uDW` READY |
| Production URL | https://jihbasavakalyan.org |
| Bundle smoke | `AdminReportCenterPage-DdcJzbeb.js` includes `Executive V2`, V2 section markers, `executive_v2`, `kc034_executive_campaign`, `CanonicalMetricProviders`, `Mehm_Report` |
| Verifies | `verify:kc-037c1` · `verify:kc-037a` · `verify:kc-037b` · `verify:kc-bug-0126` · typecheck |

**Closure:** KC-037C1 complete — Executive Campaign Report V2 live; Composer/KC-033/PDF flow unchanged. STOP (no further report types).
