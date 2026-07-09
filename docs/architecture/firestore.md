# Firestore Backend — M8

## Purpose

Karkun Connect persists application data through **Firestore repositories** when `VITE_REPOSITORY_PROVIDER=firestore`. Repository interfaces are unchanged; stores continue to call `getRepositories()` without knowing whether data lives in localStorage or Cloud Firestore.

## Architecture

```
Store (unchanged)
    ↓
Repository Interface (unchanged)
    ↓
RepositoryProvider
    ├── LocalRepository (development / tests)
    └── FirestoreRepository (production)
            ↓
        Cloud Firestore
            ↓
        IndexedDB offline cache (Firebase SDK)
            ↓
        Snapshot listeners → store hydration
```

## Collections

| Collection | Contents | Document ID |
|------------|----------|-------------|
| `campaigns` | Campaign library items | `campaignId` |
| `rukns` | Rukn master records | `ruknId` |
| `karkuns` | Karkun registry records | `karkunId` |
| `connections` | Assignment records | `assignmentId` |
| `activityLogs` | Assignment audit trail | `entryId` |
| `executions` | Annexure forms + guidance state | `annexure_{id}` / `guidance` |
| `followUps` | Follow-up records | `followUpId` |
| `communications` | Communication engine state | `state` |
| `compliance` | Bait-ul-Maal, Ijtema, JIH portal | typed doc IDs |
| `settings` | Migration version, broadcast lists, backups | reserved + prefixed IDs |

Settings meta documents: `karkunCounter`, `connectionMeta`, `migrationVersion`, `backupIndex`.

Each document includes `_updatedAt` and `_revision` metadata for conflict detection.

## Provider Configuration

```env
VITE_REPOSITORY_PROVIDER=firestore
VITE_FIREBASE_API_KEY=...
# (all Firebase vars from M7)
```

Default is `local` for development and CI verification scripts.

## Offline Behavior

- Firebase `persistentLocalCache` with multi-tab manager (`src/lib/firebase/firestore.ts`)
- Firestore repositories update an in-memory cache synchronously (optimistic reads for stores)
- Writes queue to Firestore; SDK retries when offline
- `offlineSyncPort` reports `pending`, `offline`, or `conflict` status

## Synchronization

1. `initializeRepositories()` hydrates caches before the app mounts (`main.tsx`)
2. Snapshot listeners on key collections re-hydrate caches on remote changes
3. `hydrateStoresFromRepositories()` reloads in-memory stores without UI changes
4. Listeners are cleaned up on test reset

## Conflict Handling

- Repository writes detect `failed-precondition` / duplicate conflicts
- Conflicts are recorded via `recordFirestoreConflict()` — not silently overwritten
- `RepositoryResult` error code `Duplicate` surfaces conflict state

## Security Rules

See [`firestore.rules`](../../firestore.rules):

- **Administrator** (`request.auth.token.role == 'administrator'`): full access
- **Rukn** (`role == 'rukn'`, `ruknId` claim): read/write own connections, assigned karkuns, scoped execution data
- **Default deny** on all other paths

Deploy rules: `firebase deploy --only firestore:rules`

## Indexes

See [`firestore.indexes.json`](../../firestore.indexes.json) for composite indexes on:

- `connections` by `ruknId` + `status`
- `karkuns` by `assignedRuknId` + `assignmentStatus`
- `activityLogs` by `ruknId` + `timestamp`
- `followUps` by `ruknId` + `followUpDate`

## Migration

`migrateLocalStorageToFirestore()` in `src/lib/migration/firestoreMigrationService.ts`:

1. Read all domains from `LocalRepository`
2. Write to active `FirestoreRepository` caches + Firestore
3. Re-hydrate caches
4. Return `FirestoreMigrationSummary`

Run from Admin tooling or programmatically after switching provider mode.

## Deployment Checklist

- [ ] Firebase project with Firestore enabled
- [ ] Deploy `firestore.rules` and `firestore.indexes.json`
- [ ] Set custom claims (`role`, `ruknId`) on Firebase users
- [ ] Configure `VITE_REPOSITORY_PROVIDER=firestore` in hosting env
- [ ] Run one-time local → Firestore migration
- [ ] Verify multi-device sync on connections and karkun registry
- [ ] Run `npm run verify:rc1`

## Verification

```bash
npm run verify:firestore
npm run verify:rc1
```

## Related Files

```
src/repositories/firestore/
  collections.ts
  firestoreHelpers.ts
  firestoreRepositories.ts
  initialize.ts
  storeHydration.ts
  offlineSync.ts
src/lib/firebase/firestore.ts
src/lib/migration/firestoreMigrationService.ts
firestore.rules
firestore.indexes.json
```
