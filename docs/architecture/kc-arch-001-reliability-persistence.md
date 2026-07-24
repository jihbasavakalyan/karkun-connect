# KC-ARCH-001 — Reliability & Persistence Standard

**Status:** Permanent architecture policy (not a sprint)  
**Applies to:** All current and future modules — persistence, Firestore, repositories, async workflows  
**Cursor rule:** `.cursor/rules/kc-arch-001-reliability.mdc` (always applied)

## Prompt preamble (mandatory)

Every future implementation prompt (KC-0102, Requests, Communication, Muttafiqeen, etc.) should begin with:

> **Implementation must comply with KC-ARCH-001 — Reliability & Persistence Standard.**

Do not rediscover these constraints module by module.

---

## Reliability rules

### 1. Durable saves

- Never report success until the write is durably completed.
- Do not use fire-and-forget writes for user-visible operations.
- Await persistence before showing success (`awaitQueuedWrite`, `confirmExecutionSaveFeedback`).

### 2. Shared documents

Avoid shared blob documents.

Preferred order:

1. Per-entity documents (with `ruknId` when Rukn-scoped)
2. Transactional merge
3. Shared blobs only when unavoidable

Never perform full document replacement on shared state.

### 3. Latest state only

Never persist stale closures. Always flush the latest repository/cache state at execution time.

### 4. Security first

Firestore schema and Security Rules must evolve together.

No feature is complete until **schema**, **repository**, and **security rules** are aligned.

### 5. Correct error messages

Never reuse read-error messages for write failures.

`FRIENDLY_DATA_ACCESS_ERROR` (“Unable to load additional information”) is reserved for optional **read** enrichment only.

Users should receive save-oriented copy:

- Save failed
- Permission denied
- Offline
- Retry required

Use `toOperatorPersistError` / `formatPersistFailureBanner` from `src/lib/reliability/persistErrors.ts`.

### 6. Shared reliability layer

All modules must reuse common reliability utilities. Do not create feature-specific persistence logic.

| Utility | Path |
|---------|------|
| Persist error mapping | `src/lib/reliability/persistErrors.ts` |
| Guidance blob merge | `src/lib/reliability/guidanceStateMerge.ts` |
| Await queued write | `awaitQueuedWrite` in `firestoreRepositories.ts` |
| Persist failed / success events | `src/lib/executionPersistEvents.ts` |
| Request blob merge | `src/lib/karkunRequestMerge.ts` |
| Regression | `npm run verify:reliability` |

### 7. Async consistency

Every user-visible async operation must have:

- loading state
- success state
- failure state
- retry path

No silent failures.

### 8. Concurrency safety

Assume multiple Admins and multiple Rukns operate simultaneously. No implementation may lose another user’s data.

### 9. Repository contract

Repositories must:

- return consistent `RepositoryResult` values
- never leak undefined durable state after a failed write
- handle Firestore failures gracefully
- expose structured diagnostics (label, code, cause)

### 10. Production diagnostics

Every production write should emit structured logs including:

- module / label
- operation
- duration (when practical)
- result
- error code (if any)

---

## Definition of done

A feature is **not complete** unless:

- [ ] Security rules verified
- [ ] Firestore verified
- [ ] Concurrent writes verified
- [ ] Refresh / hydrate verified
- [ ] Multi-user verified
- [ ] Error handling verified (write ≠ read copy)
- [ ] Offline behavior verified
- [ ] No uncaught async failures
- [ ] No optimistic false success
- [ ] Regression tests passed (`verify:reliability` and module verifies)

---

## Related docs

- [Repository layer](./repository-layer.md)
- [Firestore](./firestore.md)
- [Data preservation](./DATA_PRESERVATION.md)
