# KC-0128 — KC-ARCH-009 Gate (Unified Person Resolution & Live Communication)

**Classification:** Enhancement (workflow consistency / presentation) + Bug Fix (lookup discoverability + unresolved communication placeholders)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Root cause (proven):** Architecture — duplicate lookup paths (category-siloed registry search vs full-registry `findMobileOwner`) and incomplete mail-merge seeding in single-recipient Communication Preview.

## Phase 0 — Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | Y | MessageComposerModal live merge; registry search pool during query; AssignmentMappingView matcher |
| Hooks | Y | `useKarkunPeopleManagement` search pool → canonical resolver |
| Services / lib | Y | New `personResolution` facade; extend official/mail-merge variable builders (presentation only) |
| Pages | N | No page IA change; consumers stay |
| Repositories / Firestore / APIs | N | Forbidden by prompt |
| Auth / Session / Bootstrap | N | — |
| Dashboard / Campaign calculations | N | Reuse `buildCampaignExecutionSummary` / existing metrics — no new arithmetic |
| Persistence / Routing / Caching | N | Profile paths reuse existing helpers |
| Communication templates | Y | Briefing copy may reference additional progress placeholders; values from existing builders |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / Firestore / repos | N/A | No writes / schema |
| Campaign arithmetic | LOW | Read-only reuse of matrix summary |
| Auth | N/A | — |
| Registry browse totals | MEDIUM | Browse mode stays category-siloed; **search mode only** expands to full people pool |
| Communication preview | MEDIUM | Single-recipient composer seeds live vars; preview must not leave `{{…}}` |
| Assignment mapping search | LOW | Switch to canonical matcher |

### HIGH items

None. MEDIUM mitigated by: browse-only category silo preserved; search expansion mirrors KC-BUG-0125 gender expansion; verify script for mobiles `8123310584` / `7795505557`.

## Phase 2 — Plan

1. Add `src/lib/personResolution/*` — canonical `ResolvedPerson` + search/resolve by mobile/id/query (wraps `findMobileOwner`, `matchesKarkunRegistrySearch`, stores).
2. Delegate `searchPeopleForProfile` / registry search-during-query / mapping search / existing-person id resolve to that facade.
3. Extend official communication variables with visit / ijtema / BM / app / responsibility progress strings from `buildCampaignExecutionSummary` (no new math).
4. Seed `MessageComposerModal` (and bulk preview path) with `buildOfficialCommunicationVariables` so Rukn briefing preview is fully populated.
5. Update briefing template placeholders for new progress keys; free-text fields remain the only manual edits.
6. Verify script + lint/tsc.

**Rollback:** Revert facade + composer seeding; matchers remain additive.

## Phase 3 — Verification

- Unit: resolve mobiles `8123310584`, `7795505557` via canonical search, mobile owner, profile search, registry search pool.
- Communication: select Rukn + briefing template → body has no `{{` tokens; live counts present.
- Regression: `verify:kc-bug-0125`, scoped tsc/build.
- No Firestore / auth / bootstrap checks required (unchanged).

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES — divergent lookup pools + composer skips mail-merge |
| Software problem? | YES |
| Config / ops / data-only? | NO |
| Bootstrap / auth / repos / Firestore / persistence? | NO |
| Dashboard campaign math changed? | NO — reuse only |
| Routing / caching / races? | NO significant |
| Proceed? | **GO** — presentation/workflow consistency only |

---

## Phase 4 — Regression audit (post-implementation)

Workflows exercised via `npm run verify:kc-0128` + `npm run verify:kc-bug-0125`:

- Mobile owner / duplicate detection parity for `8123310584`, `7795505557`
- Registry search pool (cross-category while querying)
- Global / profile search
- Existing-person relationship graph
- Live Rukn briefing compose — no raw `{{…}}` tokens
- Visit / Ijtema / BM / App / responsibility progress keys populated from `buildCampaignExecutionSummary`

No Firestore, auth, bootstrap, or campaign arithmetic changes.

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

- Browse mode remains category-siloed (search mode expands) — intentional.
- Context-Aware Notify path remains editorial (not playbook mail-merge); Official / MessageComposer / Bulk use live merge.
- Production UI smoke for Connection / Assignment dialogs still recommended on deploy (Phase 6).

## Phase 6 — Post-deploy

Pending production deploy. Verify Admin login → Registry Quick Search both mobiles → Add New duplicate panel → Communication → select Rukn → briefing template → preview fully populated.

