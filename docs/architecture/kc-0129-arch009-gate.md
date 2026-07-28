# KC-0129 — KC-ARCH-009 Gate (Rukn Workspace Simplification & Communication-First Experience)

**Classification:** Enhancement (UX / workflow / presentation)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Scope:** Admin Rukn → Connections overview cards become an operational workspace. No business-rule, schema, repository, API, campaign-calculation, assignment-logic, or communication-generation changes.

## Phase 0 — Root cause & impact

**Request type:** Enhancement  

**Problem (proven by current UI):** Connections cards emphasize Available Capacity / Completed statistics and navigate to profile on whole-card click. Administrators cannot identify pending responsibilities or launch Official Communication in one click.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | Y | `RuknAssignmentCard` redesign; new `OfficialBriefingModal` |
| Pages | Y | `RuknModulePage` Connections tab hosts Communicate + modal |
| Lib / presentation | Y | `ruknWorkspacePresentation` — pending counts + status badge from existing `buildCampaignExecutionSummary`; `resolveOfficialBriefingTemplateId` selection only |
| Communication | Y (workflow only) | One-click open of existing Official Briefing preview/send; no new generators |
| Hooks | N | Reuse `useCommunication` / existing send path |
| Repositories / Firestore / APIs | N | Forbidden |
| Auth / Session / Bootstrap | N | — |
| Dashboard / Campaign calculations | N | Read-only reuse of execution summary |
| Assignment logic | N | Capacity remains in Assign workflow / engine; removed from overview cards only |
| Persistence / Routing / Caching | N | Existing routes for secondary actions |
| Security / Dependencies | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / Firestore / repos | N/A | No writes/schema beyond existing sendIndividualMessage |
| Campaign arithmetic | LOW | Presentation subtraction of existing summary fields only |
| Communication generation | LOW | Reuse `buildOfficialCommunicationPreview` + existing templates |
| Assignment / capacity | LOW | Removed from overview cards; Assign + detail paths unchanged |
| UI / Navigation | MEDIUM | Card no longer whole-link; Communicate primary; overflow for secondary |
| Auth / Bootstrap / Dashboard totals | N/A | Untouched |

### HIGH items

None.

## Phase 2 — Implementation plan

1. Presentation helper: pending visits / ijtema / baitul maal / app registration + status badge from existing campaign progress %.
2. `resolveOfficialBriefingTemplateId(ruknId)` — auto-select existing official template (initiation vs weekly encouragement vs appreciation) using existing helpers; no new math.
3. Redesign `RuknAssignmentCard` — operational metrics, status badge, Communicate primary, overflow secondary actions; remove Available Capacity.
4. `OfficialBriefingModal` — Review generated body + optional Personal Note → Open WhatsApp → Send (reuse launch + `sendIndividualMessage`).
5. Wire modal from `RuknModulePage` Connections tab.
6. Verify script asserting capacity absent from card source, pending fields present, Communicate primary, briefing resolver uses existing templates.
7. No schema, repository, rules, campaign engine, or assignment-logic changes.

**Rollback:** Revert card / page / modal / presentation helper / verify script / gate.

**Success criteria:** Overview cards show pending responsibilities + status; Communicate opens Official Briefing without library/template/variable UI; capacity gone from overview; lint/typecheck/build green.

## Phase 3 — Verification

- `npm run lint` / `typecheck` / `build`
- `npm run verify:kc-0129`
- Manual: Connections cards, one-click Communicate, mobile primary action visible
- Regression: Assign Karkun + Rukn detail still expose capacity where needed; campaign totals unchanged

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1 | Root cause proven? | YES — overview cards are stats-first, not action-first |
| 2 | Objective evidence? | YES — current `RuknAssignmentCard` source |
| 3 | Software problem? | YES (UX/workflow) |
| 4–5 | Config / operational only? | NO |
| 6–8 | Bootstrap / auth / authorization? | NO |
| 9–10 | Repositories / Firestore? | NO |
| 11 | Dashboard campaign math? | NO — read-only reuse |
| 12 | Persistence? | NO (existing send path only) |
| 13 | Routing? | Secondary links only (existing routes) |
| 14–17 | Caching / races / startup? | NO |
| 18 | Existing workflows impact? | YES — Connections card UX; mitigated by preserving Assign/detail/capacity elsewhere |

**Proceed?** **GO** — presentation, navigation, and workflow simplification only.

---

## Phase 4 — Regression audit (post-implementation)

Workflows exercised:

- `npm run verify:kc-0129` (exit 0) — capacity removed from card source; Communicate primary; pending rows present; status badges; briefing template resolver; module hosts OfficialBriefingModal
- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run build` — pass

No Firestore schema, repository, auth, bootstrap, campaign arithmetic, or assignment-logic changes.

## Phase 5 — Certification

**READY**

- Connections cards are action-oriented task cards
- Communicate opens Official Briefing (auto template, review, optional note, WhatsApp)
- Available Capacity removed from overview cards; Assign / detail paths unchanged

## Phase 6 — Post-deploy

Pending production deploy. Verify Admin → Rukn → Connections: action cards, status badges, one-click Communicate, no Available Capacity, desktop + mobile.

---

## Phase 4 — Regression audit (post-implementation)

Workflows exercised:

- `npm run verify:kc-0129` (exit 0) — capacity removed from card source; Communicate primary; pending rows present; status badges; briefing template resolver; module hosts OfficialBriefingModal
- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run build` — pass

No Firestore schema, repository, auth, bootstrap, campaign arithmetic, or assignment-logic changes.

## Phase 5 — Certification

**READY**

- Connections cards are action-oriented task cards
- Communicate opens Official Briefing (auto template, review, optional note, WhatsApp)
- Available Capacity removed from overview cards; Assign / detail paths unchanged

## Phase 6 — Post-deploy

Pending production deploy. Verify Admin → Rukn → Connections: action cards, status badges, one-click Communicate, no Available Capacity, desktop + mobile.
