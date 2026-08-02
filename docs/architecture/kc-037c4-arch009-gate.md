# KC-037C4 — Weekly Ijtema Attendance Report (ARCH-009 Gate)

**Product brief label:** “KC-037C2 — Weekly Ijtema Attendance Report”  
**Repository ticket id:** **KC-037C4** (KC-037C2 is already assigned to Individual Rukn Performance Report)  
**Classification:** Enhancement (rich operational PDF for existing `weekly_ijtema` report type)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037A/B/C1/C2/C3 frozen  
**Access:** Administrator-only (KC-037 V1). Manual Report Center generation only.

## Phase 0 — Root cause & impact

**Need:** `weekly_ijtema` exists in the catalog but only has a thin domain section; PDF falls through to a JSON dump. Administrators need a canonical operational attendance report (cover → registers → analytics → recommendations → appendix) as the reference pattern for remaining domain reports.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Report Center | Y | Catalog title + blueprint + template; Admin-only path unchanged |
| Section Registry | Y | New active section `weekly_ijtema_attendance` |
| Report Composer | N | No `composeReport` contract changes |
| KC-033 providers | N | Consume only; no new KPI math |
| Presentation model | Y | New `weeklyIjtemaAttendanceReportModel.ts` |
| PDF exporter | Y | Dedicated HTML→PDF + `exportReportDocument` branch |
| Thin `weekly_ijtema` domain section | N | Kept for executive_campaign inclusion |
| Firestore / repositories | N | None |
| Rukn access / scheduling / WhatsApp | N | Out of scope (V1 policy) |
| Summaries view fields | Y | Populate existing optional `ruknId` / `updatedAt` (+ `updatedBy`) from canonical marks |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Executive PDF / KC-034 | **HIGH** | Keep KC-034 branch first; do not edit `campaignReportPdf` content |
| Individual Rukn/Karkun PDF | **HIGH** | Do not alter C2/C3 exporters; add parallel branch only |
| Composer / Registry architecture | **HIGH** | Register section only; no pipeline redesign |
| KPI integrity | **HIGH** | Health slice + `getKpi` + `getActiveRuknRows` + summaries; no alternate % |
| Thin WI domain section | MEDIUM | Leave `domainFromProviders(..., 'weekly_ijtema')` intact |
| Report Center | LOW | Blueprint swap for `weekly_ijtema` type only |

### HIGH mitigations

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Executive PDF | Shared exporter | Wrong briefing | Route only `reportType === 'weekly_ijtema'` | `verify:kc-037c1` + C4 | Revert exporter branch |
| KPI math | Duplicate % would diverge Health | Wrong ops decisions | Reuse provider fields only | `verify:kc-037c4` + `verify:kc-033` | Revert model |
| Composer | Architectural drift | Breaks all reports | No composeReport edits | `verify:kc-037a` | N/A |

**Operational?** No — presentation/export gap, not config/data ops.

## Phase 2 — Implementation plan

1. Gate + short architecture note (this file + `kc-037c4-weekly-ijtema-attendance-report.md`)
2. Presentation model: cover, executive summary, overview KPIs, Rukn ranking, registers, analytics, insights, recommendations, appendix — from Composer context providers + campaign model
3. PDF via existing `downloadUrduHtmlReportPdf` (Executive V2 visual language)
4. Register section; blueprint `weekly_ijtema: ['weekly_ijtema_attendance']`
5. Exporter branch; catalog/template titles
6. Optional summaries view field population (identity/audit, not KPI)
7. `verify:kc-037c4` + regression verifies

**Success:** Preview/PDF via Composer; Admin-only; no Firestore/repo/schema changes; no KPI duplication.

## Phase 3 — Verification

- Compose `weekly_ijtema` → one section, model kind `weekly_ijtema_attendance_report_v1`
- Empty / partial / full / mixed attendance structural cases (provider-backed fields present)
- Ranking sort highest→lowest; top/bottom highlight flags
- Exporter wiring; Executive + C2/C3 unaffected
- `verify:kc-037a|b|c1|c2|c3|cf` · typecheck

## Go / No-Go

| Question | Answer |
|----------|--------|
| Bypass Composer / KC-033? | **NO** |
| Change Composer/Registry architecture? | **NO** |
| Invent KPI calculations? | **NO** |
| Firestore / repository changes? | **NO** |
| Rukn access / auto-distribution / WhatsApp? | **NO** |
| Collide with KC-037C2 Individual Rukn? | **NO** (use C4 id) |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037c4` 5/5 — blueprint, Composer model, structural fields, Executive/C2 unaffected, exporter/KC-033 path
- `verify:kc-037c1` · `verify:kc-037c2` · `verify:kc-037a` · `verify:kc-037b` · `verify:kc-037cf`
- Typecheck clean (no new errors from this change set)
- Visual fixture screenshots: desktop / mobile / Rukn ranking (`docs/kc-037c4-evidence/`)

## Phase 5 — Certification

**READY** — Weekly Ijtema Attendance Report via Composer + KC-033; Executive / Individual Rukn / Individual Karkun PDF paths unchanged; Admin-only V1 policy preserved.

## Phase 6 — Post-deploy

*(after deploy)* Admin Report Center → Weekly Ijtema Attendance Report → Preview + PDF; empty / partial / full attendance windows; hard refresh.