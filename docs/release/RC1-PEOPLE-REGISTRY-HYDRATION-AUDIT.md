# RC1 — People Registry Hydration & Notification Audit

**Date:** 2026-07-12  
**Scope:** Synchronization only (no auth / Firestore schema / repository pattern / business-rule changes)

## 1. Root cause

`loadPeopleRegistryFromPersistence()` and the production-migration early-return path mutated `MOCK_KARKUN_REGISTRY` / `ruknMaster` without reliably waking React subscribers. Pages that painted before deferred bootstrap finished kept stale memos (`0 members` / `0 matches`).

## 2. Files changed

| File | Change |
|------|--------|
| `src/lib/peopleRegistryEvents.ts` | **New** — shared subscribe/emit bus (avoids circular imports) |
| `src/lib/peopleStore.ts` | Uses emit bus; still re-exports `subscribeToPeopleStore` |
| `src/lib/peopleRegistryPersistence.ts` | Emits on every successful in-memory load mutation |
| `src/services/productionDataMigrationService.ts` | No early-return when `MOCK` empty; notifies after skip-load |
| `src/hooks/usePeopleStore.ts` | Subscribes via events module |
| `src/hooks/useAssignmentEngine.ts` | People + assignment subscription (already) |
| `src/hooks/useKarkunPeopleManagement.ts` | `peopleVersion` in list memo |
| `src/hooks/useRuknManagement.ts` | `peopleVersion` in list memo |
| `src/hooks/useRuknMaster.ts` | `peopleVersion` in search memo |
| `src/hooks/useKarkunRegistry.ts` | `peopleVersion` in filter memo (prior) |
| `src/pages/admin/AssignmentManagementPage.tsx` | peopleVersion in memos + mapping view |
| `src/pages/admin/CampaignListsPage.tsx` | peopleVersion for lists/members |
| `src/pages/rukn/AvailableKarkunPage.tsx` | peopleVersion (prior) |
| `src/components/forms/assignment/AssignRuknModal.tsx` | peopleVersion (prior) |
| `src/components/forms/assignment/AssignKarkunModal.tsx` | assignmentVersion (includes people) |
| `src/components/forms/assignment/ReplaceKarkunModal.tsx` | assignmentVersion (includes people) |
| `src/components/forms/people/RuknAssignmentSelect.tsx` | peopleVersion |
| `src/components/forms/campaign-setup/StepRukn.tsx` | peopleVersion |
| `src/components/communication/IndividualMessagesPanel.tsx` | peopleVersion |
| `scripts/verify-karkun-management-hydration.ts` | Expanded regression |
| `package.json` | `verify:karkun-hydration` script |

## 3. Notification audit report

| Function | Updates registry? | Calls notify / emit? |
|----------|-------------------|----------------------|
| `loadPeopleRegistryFromPersistence` | YES | YES (`emitPeopleRegistryChange`) |
| `hydrateStoresFromRepositories` | YES (via load) | YES (emit from load + `notifyPeopleRegistryChange`) |
| `runProductionDataMigration` early-return | YES (via load) | YES (load emit + `notifyPeopleRegistryChange`) |
| `runProductionDataMigration` full import | YES | YES (via create/import + remove*) |
| `createRukn` / `updateRukn` / `setRuknStatus` / `bulkSetRuknStatus` | YES | YES |
| `createKarkun` / `updateKarkun` / `setKarkunStatus` / `bulkSetKarkunStatus` | YES | YES |
| `importRuknsFromRows` / `importKarkunsFromRows` | YES | YES (per create) |
| `clearKarkunRegistry` / `removeMale*` / `removeFemale*` | YES | YES |
| `replaceRuknMaster` / `clearRuknMaster` | YES | YES |
| `restorePeopleRegistrySnapshot` | YES | YES |
| `createRuknForMigration` | YES | YES |
| `updateKarkunMeetingOutcomes` / `updateKarkunVisitExecution` | YES | YES |
| `syncKarkunRegistryFromAssignments` | YES | YES (batched / per-options) |
| `persistPeopleRegistry` | Persistence only | N/A (no in-memory change) |
| `clearPeopleRegistryPersistence` | Persistence only | N/A (full page reload follows) |

## 4. Subscription audit report

| Surface | Subscribes to people? | Notes |
|---------|----------------------|-------|
| Karkun Management (`useKarkunPeopleManagement`) | YES | `peopleVersion` |
| Rukn Management (`useRuknManagement`) | YES | `peopleVersion` |
| Connections (`AssignmentManagementPage`) | YES | `peopleVersion` + assignment |
| `AssignRuknModal` | YES | `peopleVersion` |
| `AssignKarkunModal` | YES | via `useAssignmentEngine` people bump |
| `ReplaceKarkunModal` | YES | via `useAssignmentEngine` |
| Available Karkun (`AvailableKarkunPage`) | YES | people + assignment |
| `RuknAssignmentSelect` | YES | people + assignment |
| `useRuknMaster` / Campaign Step Rukn | YES | `peopleVersion` |
| Campaign lists / Individual messages | YES | `peopleVersion` |
| Command Center people stats | YES | `usePeopleStore` |
| My Karkun | YES | via `useAssignmentEngine` |

## 5. Memo dependency audit

Fixed empty-`[]` / missing-people deps on:

- `useKarkunPeopleManagement` → `[sectionGender, peopleVersion]`
- `useRuknManagement` → `[peopleVersion]`
- `useRuknMaster` / `StepRukn` → `[query, peopleVersion]`
- `CampaignListsPage` dynamic counts, member modal, karkun lookup
- `IndividualMessagesPanel` options
- `AssignKarkunModal` / `ReplaceKarkunModal` available lists
- `AssignmentMappingView` version now includes `peopleVersion`

## 6. Regression results

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run verify:assignments` | PASS |
| `npm run verify:karkun-hydration` | PASS |

Manual checks remain for pilot sign-off after deploy: login → Karkun Management counts, hard refresh, search clear, Connections eligible list, Connect/Replace.

## 7. Final confirmation

After hydration, migration early-return, import, and refresh, Karkun Management, Rukn Management, and Connections re-subscribe and invalidate memos from the shared people-registry event bus. In-memory `MOCK_KARKUN_REGISTRY` remains the UI source of truth.
