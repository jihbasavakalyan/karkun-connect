# KC-037C3 — Individual Karkun Performance Report (ARCH-009 Gate)

**Classification:** Enhancement (presentation / export for existing `individual_karkun` type)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037A/B/C1/C2 frozen  
**Scope:** Individual Karkun Performance Report only. No Men/Women/Dashboard/Excel/CSV.

## Phase 0

**Need:** Operational PDF for one selected Karkun. Catalog/section exist; PDF still dumps JSON for non–KC-034 / non–C2 types.

### Impact

| Area | Impacted? | How |
|------|-----------|-----|
| `individual_karkun_performance` section model | Y | Rich presentation from person + KC-033 views + journey timeline |
| Individual Karkun PDF exporter | Y | New HTML→PDF |
| `exportReportDocument` | Y | Route `individual_karkun` PDF |
| `validateReportConfig` | Y | Require `scopeTarget.personId` |
| Report Center UI | Y | Karkun selector |
| Composer / Registry / Providers / Executive PDF | N | Unchanged |

## Phase 1

| Risk | Level | Mitigation |
|------|-------|------------|
| Executive PDF | HIGH | Keep KC-034 path first |
| Invented timeline | HIGH | Only `buildJourneyTimeline` + existing fields |
| KPI integrity | HIGH | Provider views only |

## Phase 2

1. Presentation model · 2. PDF · 3. Exporter + validation · 4. Report Center select · 5. `verify:kc-037c3`

## Phase 3

- Compose with personId; PDF markers; executive unaffected; typecheck  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Bypass Composer / KC-033? | NO |
| Change Composer architecture? | NO |
| Invent events/KPIs? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037c3` 4/4 — Karkun required; Composer model; executive unaffected; exporter/UI/KC-033 path
- `verify:kc-037c2` · `verify:kc-037a` · `verify:kc-037b` · `verify:kc-037cf` · `verify:kc-bug-0126`
- `typecheck` clean

## Phase 5 — Certification

**READY** — Individual Karkun Performance Report via Composer + KC-033; Executive / Rukn PDF paths unchanged.

## Phase 6 — Post-deploy

*(after deploy — SHA + deployment ID in release notes)*
