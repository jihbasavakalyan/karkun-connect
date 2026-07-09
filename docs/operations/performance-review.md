# Performance Review — P1

Audit of Firestore and repository layer for production pilot.

## Firestore Read Patterns

| Domain | Pattern | Assessment |
|--------|---------|------------|
| Boot hydration | Full collection reads on init | ⚠️ Acceptable for pilot scale (~500 karkuns) |
| Assignments | Collection snapshot listener | OK — single listener |
| Karkuns / Rukns | Snapshot listeners | OK |
| Settings | Snapshot listener | OK — small dataset |
| Campaigns | Cache + mock fallback | OK — static library |

### Unnecessary Reads — Mitigation (Post-Pilot)

| Issue | Current | Future |
|-------|---------|--------|
| Full karkun collection on every snapshot | Re-hydrate all | Query by `assignedRuknId` for Rukn role |
| Full assignment collection | Re-hydrate all | Query `ruknId == claim` for Rukn |
| Guidance singleton | Single doc | OK |

**Pilot verdict:** Current scale (~49 Rukns, ~493 Karkuns) is within free-tier comfort for Basavakalyan.

## Firestore Writes

| Operation | Pattern | Assessment |
|-----------|---------|------------|
| Assignment save | Batch write all assignments | ⚠️ Full replace — OK for pilot |
| Karkun registry save | Batch write all karkuns | ⚠️ Full replace on migration |
| Compliance maps | Per-record batch | OK |
| Activity log | Batch on save | OK |

**Recommendation:** Move to incremental writes post-pilot if write costs increase.

## Indexes

Deployed via `firestore.indexes.json`:

- `connections` — `ruknId` + `status`
- `connections` — `karkunId` + `status`
- `karkuns` — `assignedRuknId` + `assignmentStatus`
- `activityLogs` — `ruknId` + `timestamp`
- `followUps` — `ruknId` + `followUpDate`
- `executions` — `ruknId` + `submittedAt`

Verify indexes show **Enabled** in Firebase Console after deploy.

## Snapshot Listeners

Source: `src/repositories/firestore/initialize.ts`

| Collection | Listener | Cleanup |
|------------|----------|---------|
| connections | Yes | `stopFirestoreSnapshotListeners()` on test reset |
| karkuns | Yes | Same |
| rukns | Yes | Same |
| activityLogs | Yes | Same |
| followUps | Yes | Same |
| executions | Yes | Same |
| compliance | Yes | Same |
| communications | Yes | Same |
| settings | Yes | Same |

**Production:** Listeners persist for app lifetime (expected). No leak on navigation.

## Caching

| Layer | Mechanism |
|-------|-----------|
| Firestore SDK | IndexedDB offline cache (`persistentLocalCache`) |
| Repository | `SyncCache` in-memory — optimistic reads |
| Stores | In-memory arrays/maps — unchanged |

## Repository Performance

- Stores call `getRepositories()` synchronously — no async penalty in UI
- Firestore writes are async (`queueWrite`) — UI not blocked
- `unwrapRepository` falls back silently on read errors — monitor in production

## Action Items

| Priority | Item | Owner |
|----------|------|-------|
| P1 | Deploy indexes before pilot | Ops |
| P2 | Monitor daily read/write counts first week | Ops |
| P3 | Scoped queries for Rukn role | Post-pilot |
| P3 | Incremental writes vs full batch | Post-pilot |
