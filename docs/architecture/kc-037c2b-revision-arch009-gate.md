# KC-037C2B Revision — Restore Dashboard Execution Priority (ARCH-009)

**Classification:** Enhancement (presentation / layout restore)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Scope:** Rukn dashboard Mission Overview presentation only.

## Phase 0

**Need:** KC-037C2B reordered cards to campaign workflow; day-to-day execution preferred Attendance near the top. Restore prior hierarchy; keep terminology, OPEN badge, matrix helper, card sizing.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `RuknHomePage` | Y | Restore Attendance → Progress → summaries order |
| `RuknExecutionSummaryCards` | Y | Restore Visit → JIH → Invited → Baitul; keep sizing |
| Progress / Attendance / Matrix | Y | Labels / OPEN / helper only |
| Calculations / Firestore / providers / nav | N | Untouched |

## Phase 1

| Domain | Risk | Mitigation |
|--------|------|------------|
| KPI math | HIGH | No `buildCampaignExecutionSummary` / matrix logic edits |
| Hierarchy regression | MEDIUM | Restore pre-C2B component order exactly |

## Phase 2

1. Restore Home order + summary card order  
2. Keep OPEN badge, “Tap any status to update.”, min-height sizing  
3. Clarify Progress metric labels only  
4. Evidence screenshots + commit  

## Phase 3

- Diff confirms no logic/store/provider changes  
- Visual before/after  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Change calculations / Firestore / providers? | **NO** |
| Redesign dashboard IA beyond restore + labels? | **NO** |
| Proceed? | **GO** |
