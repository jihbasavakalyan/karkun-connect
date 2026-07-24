# KC-0102C — Dashboard Duplicate Read Elimination (Phase C)

**Type:** Performance Optimization (duplicate Firestore reads only)  
**Status:** Complete  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Basis:** [KC-0101.1](./kc-0101-1-bootstrap-timing-certification.md) Phase C · KC-0102A · KC-0102B

---

## KC-ARCH-009 — Phases 0–5

### Phase 0–3

| Field | Value |
|-------|-------|
| Request type | **Performance Optimization** |
| Root cause | Verified duplicate startup reads |
| Evidence | KC-0101.1 + production settings inventory |
| Go | **GO** for Phase C only |

### Production settings inventory

`connectionMeta`, `karkunCounter`, `karkunRequests`, `migrationVersion`  
(no `broadcast_*` / `backup_*` docs)

### Phase 4–5

| Check | Result |
|-------|--------|
| Typecheck / unit tests | Pass |
| Schema / auth / APIs unchanged | Pass |
| Phase A/B preserved | Pass |
| Certification | **READY WITH KNOWN LIMITATIONS** — broadcast/backup settings docs not soft-loaded on hydrate (absent in production) |

---

## 1. Duplicate-read audit summary

| Duplicate | Path | Verified? |
|-----------|------|-----------|
| Settings collection re-read | Background `getDocs(settings)` after critical `getDoc(karkunCounter)` + `getDoc(connectionMeta)` and parallel `getDoc(migrationVersion)` | **Yes** — collection is exactly those four docs |
| Pending Queue remount getDoc | `PendingKarkunRequestQueue` → `syncKarkunRequestStoreFromServer` → `refreshKarkunRequestCacheFromServer` | **Yes** — same doc already applied in background hydrate + store reload |
| Critical 6-collection peers | Parallel by design | Not duplicates |
| Snapshot-driven rehydrate | Intentional live refresh | Retained |

---

## 2. Duplicate reads removed

1. **Background `getDocs(settings)`** → replaced with soft **`getDoc(settings/karkunRequests)`** only (plus existing soft `getDoc(migrationVersion)`).  
2. **Pending Queue mount `syncKarkunRequestStoreFromServer`** → replaced with in-memory **`reloadKarkunRequestStoreFromPersistence()`** (no network). Live updates remain via settings `onSnapshot` → hydrate cycle.

---

## 3. Duplicate reads intentionally retained

| Item | Why retained |
|------|----------------|
| Critical `karkunCounter` + `connectionMeta` getDocs | Required for fail-closed ASN / counter (KC-ARCH-001) |
| Soft `migrationVersion` getDoc | Needed for migration gate; not part of critical path |
| Full collection watches / snapshot refresh cycles | Live correctness; not startup duplicates |
| Broadcast/backup settings hydrate via collection scan | **Removed** with collection getDocs; **no such docs in production**. If added later, add dedicated soft `getDoc`s — do not restore full collection scan without audit |
| `refreshKarkunRequestCacheFromServer` API | Kept for durable append / explicit refresh paths (not Admin home mount) |

---

## 4. Before vs after startup read comparison

### Settings-related (background phase)

| | Before | After |
|--|--------|-------|
| Reads | `getDoc(migrationVersion)` + **`getDocs(settings)`** (4 docs: counter, meta, requests, migrationVersion) | `getDoc(migrationVersion)` + **`getDoc(karkunRequests)`** |
| Duplicate of critical docs | Yes (counter + meta re-fetched) | **No** |
| Duplicate migrationVersion | Yes (soft + inside collection) | **No** |

### Pending Queue

| | Before | After |
|--|--------|-------|
| Mount | Extra **`getDoc(karkunRequests)`** | Cache reload only (0 network) |

### Net startup savings (Admin cold path)

- Eliminate 1× settings **collection** read (4 document reads billed)  
- Eliminate 1× remount **getDoc(karkunRequests)**  
- Add nothing beyond the single targeted `getDoc(karkunRequests)` already covered by the old collection scan  

Critical hydrate peer set unchanged (6 parallel reads).

---

## 5. Performance observations

- Expected latency savings: ~100–300 ms class from KC-0101.1 Phase C estimate (settings ~141 ms + pending getDoc ~141 ms upper bound; actual overlap varies).  
- Correctness: Pending queue still seeded from background hydrate; Admin settings collection watch still triggers refresh on remote writes.  
- No query shaping / pagination (Phase D untouched).

---

## 6. Regression verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` | Pass |
| Unit tests (coalesce + readiness) | Pass |
| Firestore schema / repository APIs | Unchanged public APIs |
| Auth / claims / routing | Unchanged |
| KC-0102A readiness | Unchanged |
| KC-0102B coalescing | Unchanged |

---

## 7. Files modified

- `src/repositories/firestore/firestoreRepositories.ts` — targeted settings soft reads; apply payload uses `karkunRequestsDoc`  
- `src/components/admin/PendingKarkunRequestQueue.tsx` — remove remount server sync getDoc  
- `docs/architecture/kc-0102c-duplicate-read-elimination.md` — this report  
- `docs/architecture/index.md` — link  

---

## 8. Git / deploy / manual verification

| Item | Value |
|------|-------|
| Feature commit | `583bc867bd106517b2d3eae3cdfb63faa3613564` |
| Feature message | `feat(performance): eliminate duplicate dashboard startup reads (KC-0102C)` |
| Build-fix commit | `5a347fbb395c28c126a8f2640644b32816b6caf9` |
| Build-fix message | `fix(build): exclude vitest unit tests from production tsc build` |
| Push | Confirmed — `main` → `origin/main` (`faf8180..5a347fb`) |
| Production deploy | `https://karkun-connect-qcoa981dq-jihbk.vercel.app` **Ready** (alias `karkun-connect.vercel.app`) |
| Rollback | `git revert 5a347fb 583bc86` (restore settings `getDocs` + Pending remount sync; re-include tests in tsc if needed) |

### Manual verification results

| Check | Result |
|-------|--------|
| Prod deploy build | First push failed (`vitest` in `tsc -b`); fixed by excluding `*.test.ts`; redeploy **Ready** |
| Prod login URL loads | `https://karkun-connect.vercel.app/login` served (deploy Ready) |
| Admin cold load (auth smoke, Vite + prod Firebase) | `/admin` · `hydration=ready` · Campaign Health present · no page errors · no “Unable to load” |
| Rukn cold load (same) | `/rukn` · `hydration=ready` · portal + campaign progress present · bottom nav present · no page errors |
| Dashboard data correctness | Connection/progress widgets rendered with real counts (not fail panel) |
| Pending Queue / Campaign Health / Mission | Admin home rendered command-center sections without hydrate failure |
| Navigation | Admin sidebar + Rukn portal chrome visible |
| Console/page errors | None in smoke capture |

**Note:** Unrelated auth/claims WIP files remain uncommitted on the working tree and were **not** included in this push.

---

## Stop line

**Phase C complete. Do not begin Phase D (Query Shaping).**
