# People Classification Model (KC-0101)

## Summary

Karkun Connect keeps a **single authoritative Person record** in Firestore collection `karkuns/{id}`.  
Organizational classification (`Karkun` | `Muttafiq`) determines where the person appears and whether they participate in campaign execution.

Archive is no longer a People Management workflow. Legacy standard archives are restored into the **Muttafiqeen Registry**.

## Data model

Additive fields on `KarkunRegistryRecord`:

| Field | Purpose |
|-------|---------|
| `category` | `'Karkun'` \| `'Muttafiq'` (optional for backward compatibility) |
| `classificationHistory[]` | Append-only moves: previous/new category, admin, timestamp, remarks |

Resolve category with `getPersonCategory()` (`src/lib/peopleClassification.ts`).  
Campaign eligibility: `isCampaignEligible()` — Karkun only, never soft-removed.

### Soft-removed (not Muttafiqeen)

`isArchived` remains for:

- `archiveKind: 'duplicate_merge'`
- `archiveKind: 'admin_delete'`

These are controlled removals, not organizational classification.

## Registries

| Registry | Route | Source |
|----------|-------|--------|
| Karkuns | `/admin/karkun` | `getAllKarkuns()` |
| Muttafiqeen | `/admin/muttafiqeen` | `getAllMuttafiqeen()` |

Both share profile UI at `/admin/karkun/:id`.

## Workflows

- **Add Karkun** → `createKarkun()` → `category: 'Karkun'`
- **Add Muttafiq** → `createMuttafiq()` → `category: 'Muttafiq'`
- **Move to Muttafiqeen** → `moveToMuttafiqeen()` (replaces Archive; requires disconnect)
- **Move to Karkun Registry** → `moveToKarkunRegistry()`

## Campaign behaviour

Assignment, Connections, Connect, Connected, campaign dashboards, and campaign reports continue to use `getAllKarkuns()` / `isCampaignEligible()`. Muttafiqeen are excluded until reclassified as Karkun.

## Migration (idempotent)

`migrateArchivedPeopleToMuttafiqeen()` (`src/services/muttafiqeenMigrationService.ts`):

1. Scans in-memory `MOCK_KARKUN_REGISTRY` (hydrated from Firestore).
2. Standard archives (`isArchived` and not soft-removed) → `category: 'Muttafiq'`, clear archive flags, preserve ID.
3. Soft-removed duplicates/deletes are skipped.
4. Unclassified active people → `category: 'Karkun'`.
5. Safe to rerun; persists when changes occur.

Invoked from `runProductionDataMigration` / adopt path after registry hydration.

## Investigation notes (pre-migration)

- Archived people lived **in place** on `karkuns` docs (`isArchived` + metadata), not a separate collection.
- Archive was a soft flag via `archiveService` / `registryMaintenanceService`.
- Campaign modules already excluded archived via `getAllKarkuns()` and `!isArchived` gates.
- Restoration preserves Person ID, profile, assignment/communication history keyed by ID, and audit entries.

## Non-goals

- No new Person database or collection
- No redesign of campaign execution, repositories, or auth
- Rukn / assignment / request soft-archive APIs remain for those entities
