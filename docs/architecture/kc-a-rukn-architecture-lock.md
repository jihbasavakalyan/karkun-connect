# A Rukn / عازمِ رکن — Final Architecture Lock

**Status:** LOCKED (design only — not implemented)  
**Date:** 2026-09-05  
**Baseline inspection:** prior same-day A Rukn promotion architecture inspection (no code changes).  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-0100 (fail-closed JWT) · Increment A Muttafiq↔Rukn certification  

This document is the implementation-ready specification. It does not change application code, Firestore rules, or production data.

---

## Frozen product statements

1. The organisation has **exactly four categories**: Rukn, A Rukn / عازمِ رکن, Karkun, Muttafiq.
2. **A Rukn** and **عازمِ رکن** are the same category. There is no fifth category and no intermediate “Aazim candidate” stage.
3. A Rukn is a **promotion from an existing Karkun**, not a capability layered onto an active Karkun.
4. A Rukn is **not** another `R###`. Canonical operational identity is `AR##`.
5. Certified `muttafiqRelationships` behaviour is **untouched**. A Rukn participates by supplying `ruknId = AR##`.
6. A Rukn **reuses Rukn Home** (`/rukn`) and Rukn operational facilities. No parallel A Rukn Home.
7. Historical `kr-*` person records and historical campaign/connection/ledger documents are **never rewritten** to `AR##` and **never deleted**.
8. Internal Firestore document IDs are not changed for cosmetics. `kr-*` stays the person id. `R###` stays existing Rukn ids.

---

## KC-ARCH-009 gate (Phases 0–3)

| Item | Decision |
|------|----------|
| Classification | **New Feature** (promotion lifecycle + officer identity) on existing Rukn operational plane |
| Root cause of “missing A Rukn” | **Architecture** — two identity planes exist today (people `karkuns/{kr-*}` vs officers `rukns/{R###}` + JWT `{ role: 'rukn', ruknId }`). There is no A Rukn type, role, or category in code. |
| Speculative fix? | **No.** This lock is evidence-based from current types, rules, claims provisioner, assignment sync, and Muttafiq relationship ids. |
| Code before this lock? | **Forbidden.** |
| Deploy? | **Forbidden** until a later implementation increment completes Phase 5 as READY. |

### Impact matrix (design)

| Area | Impact | Notes |
|------|--------|--------|
| UI / Admin nav | HIGH | New عازمِ رکن destination; Karkun registry Promote action |
| Rukn Home / `/rukn` | LOW | Reuse; scope is JWT `ruknId` |
| JWT / auth | MEDIUM | Same `role=rukn`; `ruknId` may be `AR##`; provisioner already keys off `rukns` phone lookup |
| People registry | HIGH | Exclude promoted persons from active Karkun lists without deleting `kr-*` |
| `assignedRuknId` / connections | HIGH | Must **end** Active campaign connection before/as promotion; mirror field is derived |
| `muttafiqRelationships` | LOW | No schema change; `ruknId` accepts `AR##` |
| Campaign engine | LOW | No campaign redesign. Future `ruknId` values may be `AR##` on new connections only |
| Firestore rules | MEDIUM | Additive Admin-only promotion fields + AR counter; **do not weaken** Rukn write paths |
| Claims provision API | LOW | Must treat Active `rukns/AR##` like Active `rukns/R###` (already collection-wide phone scan) |
| Muttafiq category / conversion | NONE | Do not reuse Karkun→Muttafiq conversion |

### Go / No-Go (design)

- Changes auth claims shape? **NO** (same `role` + `ruknId`).
- Changes certified Muttafiq relationship machine? **NO**.
- Rewrites historical connection `karkunId` / `ruknId`? **NO**.
- New JWT role `a_rukn`? **NO** (rejected).
- New `/a-rukn` operator app? **NO** (rejected).
- Safe to implement after this lock? **YES**, in the increments in §18.

---

## 1. Four-category model

Product categories are organisational. They are **not** a single TypeScript union today.

| Product category | Identity plane | Canonical store | Canonical id |
|------------------|----------------|-----------------|--------------|
| Rukn | Officer | `rukns/{id}` | `R###` |
| A Rukn / عازمِ رکن | Officer | `rukns/{id}` | `AR##` |
| Karkun | Person | `karkuns/{id}` | `kr-*` |
| Muttafiq | Person | `karkuns/{id}` | `kr-*` + display `registryNumber` `MT-*` |

**Locked mapping:**

- `PersonCategory` remains `'Karkun' | 'Muttafiq'` (KC-0101). **Do not** add `'ARukn'` to people classification. A Rukn is not a people-registry category.
- Officer kind is a **new explicit field** on `Rukn` (see §3), not a fifth `PersonCategory`.
- Admin navigation shows four people/officer areas: ارکان, عازمِ رکن, کارکنان, متفقین.

**Invariants:**

- A person is never **active** as Karkun and A Rukn at the same time.
- A Muttafiq is not promotion-eligible (must be an active Karkun first; Muttafiq→Karkun remains the existing classification path if ever needed).
- Rukn (`R###`) creation via Admin Add Rukn is unchanged and is **not** this promotion path.

---

## 2. Identity numbering model

| Category | Public / operational id | Internal Firestore document id | Allocator |
|----------|-------------------------|--------------------------------|-----------|
| Rukn | `R001`, `R002`, … | `rukns/R###` **is** the id | Existing `getNextRuknId()` **must be prefix-strict** (`/^R(\d+)$/`). Independent of AR. |
| A Rukn | `AR01`, `AR02`, … | `rukns/AR##` **is** the id | New AR allocator (§13). Independent of R. |
| Karkun | `kr-*` | `karkuns/kr-*` **is** the person id | Existing KC-0056 `allocateNextKarkunId` + `settings/karkunCounter`. **No separate K### display exists.** |
| Muttafiq | Display `MT-*` | Person id remains `kr-*` | Existing `registryNumber` + `allocateNextMuttafiqRegistryNumber`. |

### Karkun numbering (locked)

There is **no** separate Karkun display number in production architecture. `kr-*` is both document id and operational person key (connections, reviews, activity, Muttafiq `personId`). **Preserve `kr-*`.**

### Muttafiq numbering (locked adaptation)

Product freeze text says `MT-01`. Production already certifies **display** `registryNumber` as `MT-*` with **3-digit pad** (`MT-001`) via `formatMuttafiqRegistryNumber`. The parser is `/^mt-(\d+)$/i` (width-agnostic).

**Lock:** Do **not** rewrite existing `registryNumber` values. Do **not** change `kr-*`. A Rukn work must not migrate Muttafiq display strings. New Muttafiq numbers continue the existing allocator. Treat `MT-01` and `MT-001` as the same namespace (`MT-{n}`); cosmetic pad unification is **out of scope** for A Rukn.

### Prefix isolation (mandatory)

`getNextRuknId()` today does `rukn.id.replace('R', '')`. For `AR01` that yields `A01` → `NaN` (currently ignored). That is accidental, not a contract.

**Implementation must parse:**

- Rukn: `^R(\d+)$` only (do not strip the first `R` from `AR##`).
- A Rukn: `^AR(\d+)$` only.

Never take “digits from any officer id” as a shared sequence.

---

## 3. A Rukn identity representation

### Decision: same officer collection, distinct document id

| Option | Verdict |
|--------|---------|
| Convert `kr-*` into `R###` | **Rejected** — destroys person identity; collides with Rukn numbering; breaks history |
| New collection `aRukns` | **Rejected** — claims provisioner, hydrate, rules, and `ruknId` scoping all assume `rukns` |
| JWT role `a_rukn` | **Rejected** — doubles every `isRukn()` rule and client gate |
| **`rukns/AR##` + JWT `{ role: 'rukn', ruknId: 'AR##' }`** | **Accepted** |

A Rukn **is** a Rukn-shaped officer record whose **id** is the category discriminator.

### Officer document (`rukns/{id}`)

Reuse the existing `Rukn` document. Additive fields only:

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | `AR01` … (document id = field `id`, same as Rukn) |
| `officerKind` | yes for new A Rukn | `'rukn' \| 'a_rukn'`. Existing Rukn docs omit it; **treat missing as `'rukn'`**. |
| `sourcePersonId` | yes for A Rukn | Immutable `kr-*` of the promoted person |
| `promotedAt` | yes for A Rukn | ISO timestamp |
| `promotedBy` | yes for A Rukn | Admin actor |
| `previousAssignedRuknId` | if previously assigned | Snapshot of Active assignment at promotion (e.g. `R001`). **Not** used for live ownership. |
| `referredByRuknId` | optional | Existing Increment C field; may equal previous assigned Rukn; **immutable after create** (current rules) |
| `status` / `isArchived` / `mobile` | yes | Same AUTH-01…03 rules as Rukn |

**Do not** copy the person into a second people document. **Do not** change `rukns` document id after create.

### Person document (`karkuns/{kr-*}`) — historical + exclusion

Keep the same `kr-*` row. Additive fields:

| Field | Meaning |
|-------|---------|
| `promotedToARuknId` | `AR##` when this person is an A Rukn. Empty/absent = not promoted. |
| `promotedAt` / `promotedBy` | Audit |
| `previousAssignedRuknId` | Snapshot at promotion (denormalized; must not drive `assignedRuknId`) |

**Classification:** leave `category: 'Karkun'` as the **historical people classification** of that record (they were a Karkun). Append `classificationHistory` **or** a dedicated `promotionHistory` entry:

```
previous: Karkun (active person)
new: A Rukn (officer) — recorded as promotion metadata, not PersonCategory
```

**Active Karkun tests** (`isKarkun`, `isCampaignEligible`, registry filters, Available pool) **must** treat `promotedToARuknId` as exclusion, equivalent in effect to “not an active normal Karkun”, **without** soft-delete and **without** Muttafiq conversion.

`assignedRuknId` after promotion: **empty**, and it must stay empty because Active `connections` for that `karkunId` are ended (§5). `syncKarkunRegistryFromAssignments` is the mirror — ending connections is the source of truth.

### Linkage (bidirectional, non-authoritative for auth)

- Auth / Home / ownership: **`rukns/AR##` + JWT `ruknId`**
- History / profile: **`karkuns/kr-*`**
- Join: `rukn.sourcePersonId` ↔ `person.promotedToARuknId`

---

## 4. Karkun → A Rukn promotion lifecycle

### Eligibility (Admin only)

Must **all** be true:

- Person exists, not soft-removed (`archiveKind` duplicate_merge / admin_delete).
- `getPersonCategory` is Karkun (not Muttafiq).
- `promotedToARuknId` is empty.
- Person `status` is `active`.
- Valid unique 10-digit mobile.
- That mobile is **not** already used by another **Active** officer on `rukns` (AUTH-03).
- Not already an Active Rukn (`R###`) for the same phone.

### Forbidden

- Rukn self-promotion, Karkun self-promotion, Inbox-as-promotion.
- Promoting while leaving an Active campaign connection in place.
- Allocating `R###` for this path.
- Deleting or re-iding the `kr-*` document.
- Creating campaign `connections` as part of Muttafiq linking (unchanged certified rule; promotion itself also must not invent Muttafiq links).

### Target tree

```
Before:  Admin → R001 → kr-123 (active Karkun)
After:   Admin → R001
         Admin → AR01 (independent officer; sourcePersonId = kr-123)
```

The promoted person:

- is not a normal Karkun
- is not subordinate to R001
- has login (same OTP path as Rukn)
- has `AR##`
- uses `/rukn` scoped to `AR01`
- may own Karkuns via `connections.ruknId = AR01`
- may own Muttafiqeen via `muttafiqRelationships.ruknId = AR01`

---

## 5. Previous Rukn relationship handling

`assignedRuknId` is a **derived mirror** of Active `connections` (`syncKarkunRegistryFromAssignments`). Clearing the mirror without ending connections will be overwritten.

**Required sequence (logical):**

1. Snapshot `previousAssignedRuknId` from Active assignment (if any).
2. End Active campaign assignment(s) for `karkunId` using the **existing** `removeAssignment` path (Administrator). Status becomes a non-Active value (`Unassigned` / existing engine semantics). **Do not invent a new AssignmentStatus.**
3. Append `connectionLedger` (existing append-only collection). Use metadata `action: 'promote_karkun_to_a_rukn'` plus `toARuknId`. Prefer an additive `RemovalReason` (e.g. `PromotedToARukn`) rather than overloading unrelated reasons.
4. Let registry sync clear `assignedRuknId` / `assignedRukn` / `assignmentStatus`.
5. **Do not** create a new Active `connections` row from R001→AR01 or kr-123→self.

**Preserve:**

- Historical `connections` documents (same `assignmentId`, original `ruknId` = `R001`, `karkunId` = `kr-123`).
- `referredByRuknId` on the **person** (Increment B — who referred the Karkun). **Immutable / unchanged.**
- Activity, reviews, executions keyed by `karkunId`.

**Pending assignment reviews / pending locks** (`assignmentReviews`, `pending_{karkunId}`): promotion must **not** leave the old Rukn able to act on this person as an assigned Karkun. Admin must resolve or release pending locks as part of the promotion transaction (reuse existing Admin resolve/delete-lock rules; do not let the old Rukn “keep” the person via a Pending review).

After promotion, R001’s My Karkun / ownership queries (`assignedRuknId == ruknId` / Active connections for R001) **must not** include `kr-123`.

---

## 6. Historical Karkun record handling

| Concern | Lock |
|---------|------|
| Delete `karkuns/kr-*` | **Forbidden** |
| Change person `id` | **Forbidden** |
| Rewrite historical `connections.karkunId` / `ruknId` | **Forbidden** |
| Rewrite activity / reviews / executions / ledger `karkunId` | **Forbidden** |
| Referral attribution `referredByRuknId` | **Unchanged** |
| Campaign history | Remains on old connection + ledger + activity docs |
| Active Karkun registry / Available pool / campaign eligibility | **Excluded** via `promotedToARuknId` |
| Person profile | Still readable by Admin (and historically attributable). Label: was Karkun, now A Rukn `AR##` |

Do **not** use `moveToMuttafiqeen` or `convertKarkunToMuttafiqPreservingIdentity` for this.

---

## 7. A Rukn login / auth model

**Preferred model (verified against code): `role = rukn`, `ruknId = R001 | AR01`.**

Evidence:

- `UserRole = 'administrator' | 'rukn'` (`src/types/auth.types.ts`)
- Firestore `isRukn()` is `request.auth.token.role == 'rukn'`; scope is `request.auth.token.ruknId`
- `/api/rukn-claims-provision` loads **all** `rukns`, matches Active + non-archived mobile, sets `{ role: 'rukn', ruknId: doc.id }`
- OTP gate is Rukn Master lookup (`ruknIdentityService.findByMobile`) — **not** Karkun registry
- There is **no Karkun login**

**Therefore:**

1. Create Active `rukns/AR##` with the person’s mobile **before** login can succeed.
2. Do **not** provision claims before the officer document exists (the provisioner cannot find them).
3. Claims **after** officer create may wait until first OTP (existing KC-0100.3 pattern for Rukn). That is an accepted delayed-claims state, not a promotion failure, **provided** the officer doc exists.
4. Optional later increment: Admin SDK set claims immediately if an Auth user already exists for that phone — still **after** `rukns/AR##` commit.
5. `getNextRuknId` / Rukn Add path must not be used for promotion.
6. Administrator accounts still cannot receive Rukn claims (existing 403).

**Adaptations (not a new role):**

- `officerKind` is **not** required in JWT.
- Client `findRuknIdByPhone` / `findByMobile` already return `rukn.id`; `AR##` works if the doc is in `ruknMaster`.
- KC-0100.2 validator compares `ruknId` to expected Master id — works for `AR##`.
- Fail-closed: missing/wrong claims still block `/rukn`.

Ordinary Karkun **cannot** OTP into Home: they are not on `rukns` until Admin promotion.

---

## 8. A Rukn Home reuse

| Layer | Change |
|-------|--------|
| Routes | **None.** Keep `/rukn`, Connect, Connected, Communication, Ijtema, Baitul Maal |
| Layout | `RuknLayout` + `useRequiredRuknId()` → JWT `ruknId` (`AR01`) |
| Hydrate | Existing Rukn scope `where assignedRuknId == scope.ruknId` and `muttafiqRelationships` `ruknId == scope.ruknId` |
| Navigation | Existing Rukn bottom nav |
| Admin vs operator | Admin still `/admin`; A Rukn is not Admin |

**Do not** create `/a-rukn` or a second command center.

**Labeling:** UI may show “عازمِ رکن” / `AR01` from `officerKind` + id. Operational facilities stay the Rukn surface.

**Arkaan comms group:** `resolveArkaanRecipients()` is “all active non-archived officers on Rukn Master”. A Rukn **will** be included unless a later product increment splits groups. Default lock: **include** A Rukn (same operational facilities). If Admin later wants a separate عازمِ رکن list, that is a comms-group filter — not a new Home.

---

## 9. A Rukn → Karkun ownership model

Identical to Rukn → Karkun:

- New Active `connections` with `ruknId = AR01`, `karkunId = kr-*` (the **subordinate** Karkun, never the A Rukn’s own historical `sourcePersonId` as an Active subordinate of self).
- Registry mirror: those Karkuns get `assignedRuknId = AR01`.
- Rules: `assignedRuknId == ruknId()`, `assignedToRukn`, Connect Available pool — **no change** if JWT `ruknId` is `AR01`.
- Gender / one-active-assignment invariants unchanged.

**Forbidden:** keeping the promoted person as Active Karkun under AR01 (self-ownership).

---

## 10. A Rukn → Muttafiq relationship model

**Do not redesign Increment A.**

Certified machine (unchanged):

- Admin-created Muttafiq→officer assignment → Active `muttafiqRelationships` immediately.
- Rukn-created request → Pending Inbox → Admin approval → Active.
- Person `category` stays `Muttafiq`.
- **No** campaign `connections` from this relationship.
- Relationship id: `mr_{ruknId}_{personId}` (`muttafiqRuknRelationshipId`).

**Participation:** `ruknId = 'AR01'`, `personId = 'kr-*'` (Muttafiq person). Example: `mr_AR01_kr-9`.

Rules already gate on `resource.data.ruknId == ruknId()` and Admin-only Active writes. An A Rukn with `role=rukn` and `ruknId=AR01` reads **own** rows only, same as R001.

**Do not** create `aRuknMuttafiqRelationships` or a second id scheme.

---

## 11. Admin navigation

Dedicated item (not a candidate queue):

| id | Label | Route |
|----|--------|--------|
| `a-rukn` | عازمِ رکن | `/admin/a-rukn` (new Admin route) |

Place with the other organisational registries: after ارکان (`/admin/rukn`), before کارکنان.

**ارکان registry** lists `officerKind === 'rukn'` (missing kind = Rukn).  
**عازمِ رکن registry** lists `officerKind === 'a_rukn'` (or id `^AR`).

Do not show A Rukn rows inside ارکان as if they were `R###`.

Reuse Rukn master table/detail **components** with a kind filter and labels. Do **not** reuse the list as an unfiltered dump of `ruknMaster`.

---

## 12. Admin promotion entry point

**Primary:** Admin → کارکنان (Karkun registry) → person → **Promote to عازمِ رکن**.

Also allowed: Karkun profile page action (same service).

**Not** entry points: Inbox request types, Rukn Home, self-service, Muttafiqeen registry.

After success: Admin → عازمِ رکن shows `AR##`; person disappears from **active** Karkun registry (historical profile still Admin-reachable from A Rukn detail via `sourcePersonId`).

### Registry reuse

| Surface | Reuse? |
|---------|--------|
| Rukn master **create** (`createRukn` / `getNextRuknId`) | **No** for promotion |
| Rukn master **list/detail UI** | **Yes**, filtered |
| Karkun registry | **Yes**, as source + Promote |
| Muttafiqeen registry | **No** |

---

## 13. AR number allocation strategy

### Format

- `AR` + at least two digits: `AR01` … `AR99`, then `AR100` … (no silent wrap, no reuse).
- Parser: `^AR(\d+)$`; formatter: pad 2 while `n < 100`, otherwise full decimal (`AR100`).

### Concurrency (mandatory)

Do **not** use in-memory `max(id)+1` alone (that is today’s Rukn allocator weakness).

Mirror **KC-0056**:

- `settings/aRuknCounter` with monotonic `nextARuknNum`.
- Allocation in a **Firestore transaction**: read counter + max existing `^AR(\d+)$` docs; candidate = `max(counter, maxExisting+1)`; skip occupied ids; write officer doc **in the same transaction**; increment counter **never downwards**.
- Occupied includes **inactive/archived** `AR##` documents (ids are never recycled).
- Rules: Admin-only create/update of `aRuknCounter`; monotonic bump like `karkunCounter`; Rukn **must not** write this doc.

### R### and MT-*

- Rukn: keep independent `R###` sequence; harden `getNextRuknId` to prefix-strict parse in the same implementation wave **so AR cannot pollute R**. Full transactional R counter is recommended but **not** required to ship A Rukn if Admin Rukn-create stays rare and prefix-strict.
- Muttafiq: existing display allocator only; not part of promotion.

### Reversal

Ended A Rukn: `status: inactive` and/or `isArchived: true` on `rukns/AR##`. **Id remains.** Next allocation is next unused integer, never `AR01` again.

---

## 14. Authorization / security model

### App + JWT

- Operator access: `role === 'rukn'` and `ruknId` present.
- Admin-only: create officer, allocate AR, promote, reverse.
- Rukn `categoryUnchanged` / `ruknMayUpdateKarkun` must **not** allow a Rukn to set `promotedToARuknId` or to “claim” the promoted person.

### Firestore rules (design — not applied in this task)

Keep existing `isRukn()` / `ruknId()` / `assignedToRukn`. They already grant Rukn-level access to **whatever** `ruknId` is in the token, including `AR01`.

**Additive only:**

1. `karkuns` updates: Rukn cannot modify `promotedToARuknId` / promotion timestamps (unchanged-keys or Admin-only).
2. `rukns` create: still Admin-only. Enforce (in app + ideally rules) `id` matches `^AR\\d+$` iff `officerKind == 'a_rukn'`, and `sourcePersonId` required for that kind.
3. `settings/aRuknCounter`: Admin-only; monotonic `nextARuknNum`.
4. **Do not** grant Karkun any `rukns` write.
5. **Do not** broaden `muttafiqRelationships` beyond Admin writes + Rukn read-own.
6. **Do not** allow Rukn to create `rukns` documents.

### Ownership after promotion

Old Rukn loses `assignedRuknId` match. Rules then deny that Rukn updates to `karkuns/kr-123` except Available-pool patterns — and the person must **not** remain Available as a normal Karkun (exclusion from pool via promotion flag + `isCampaignEligible === false`). Confirm Available query cannot pick them up: today Available is `assignedRuknId == ''`. **Promotion exclusion must also apply to Available reads** (app filter **and** rules if `assignedRuknId == ''` would otherwise expose the person to every Rukn). This is a **security-critical** adaptation: a promoted person with cleared `assignedRuknId` looks “Available” under current rules.

**Lock:** Firestore `karkuns` read for Rukn must treat promoted persons as **not** Available. Options (pick one in implementation; prefer rules + app):

- Rules: Available clause requires empty `promotedToARuknId` (or field absent).
- App: never list them in Connect; rules still must match or any Rukn can read the historical person.

**Prefer rules + app together.** Do not rely on UI hiding.

### Claims

Old Rukn’s JWT unchanged. Promoted user’s JWT is `ruknId=AR##` after provision. They must not retain a hypothetical Karkun token (none exists).

---

## 15. Atomicity / failure recovery

Stores involved:

1. `settings/aRuknCounter`
2. `rukns/AR##`
3. `connections` (end Active)
4. `karkuns/kr-*` (promotion fields + assignment mirror)
5. `connectionLedger` (append)
6. `assignmentReviews` pending lock (if any)
7. JWT claims (Admin SDK, **after** 2)

There is **no** single transaction across Firestore + Firebase Auth. Split:

### Phase A — Firestore transaction / batched Admin writes (all or compensate)

Authoritative durable promotion:

1. Allocate `AR##` (counter + uniqueness).
2. Create `rukns/AR##` (`status: active`, `officerKind: 'a_rukn'`, `sourcePersonId`).
3. End Active connections + ledger + pending-lock cleanup.
4. Update person: `promotedToARuknId`, clear assignment mirror, bump version.

If Phase A fails mid-way:

| Symptom | Recovery |
|---------|----------|
| Counter advanced, no officer doc | Allocator already skips occupied; also skip holes by scanning max+gaps **or** only increment counter when officer create succeeds in the **same** transaction (required) |
| Officer doc without person flag | Repair job: set person flag if `sourcePersonId` points at unpromoted Karkun; do not allocate a second AR |
| Person flag without officer doc | **Invalid.** Do not set person flag before officer create. Repair: clear flag or complete officer create with reserved id |
| Connections still Active | Person may still show under old Rukn. Retry end-assignment; do not provision login until connections ended |
| Officer exists, connections ended, person not flagged | Retry person update; block second promotion by unique `sourcePersonId` query |

**Ordering lock:** `rukns/AR##` create **before** person `promotedToARuknId` **before** claims. End connections **before or in the same atomic group as** person mirror clear.

### Phase B — Claims (existing provisioner)

On first OTP, or Admin repair script. Never invent claims on the client.

Invalid states to prevent:

| State | Prevention |
|-------|------------|
| Active Karkun + Active A Rukn | Person exclusion + no Active connections |
| Still owned by R001 | End connections first |
| AR without claims | Allowed until OTP (same as Rukn); Home fail-closed |
| Claims before AR doc | Provisioner cannot match phone |
| Duplicate AR | Transaction + never-reuse |
| Historical Karkun deleted | No delete in service; rules `allow delete: if false` |

Use existing `awaitQueuedWrite` / durable persist patterns for any client-visible Admin action; surface success only after Phase A durability (KC-ARCH-001).

---

## 16. Reversal considerations

Reversal is **not** required for the first implementation increment, but the identity model must allow it without id reuse.

**If Admin reverses:**

1. Set `rukns/AR##` inactive/archived (keep document).
2. Clear or fail-close JWT (`role`/`ruknId`) via Admin SDK; next OTP must **not** match an Active officer.
3. Clear `promotedToARuknId` on `kr-*` **or** keep it as history with `reversedAt` and a `promotionStatus: 'reversed'` — prefer **status on the officer** as source of “is this person currently an A Rukn?” and keep `promotedToARuknId` as last AR id for audit.
4. Restore **eligibility** as Karkun (Available), **not** automatic re-assignment to R001.
5. Do **not** rewrite history; do **not** recycle `AR##`.
6. Do **not** delete Auth user unless ops policy says so (out of band).
7. Active Muttafiq relationships and Karkun connections under `AR##` must be ended or reassigned **before** reversal (blockers), same class of constraint as Muttafiq move blockers.

---

## 17. Exact fields / collections affected

### Collections (no new relationship or campaign collections)

| Collection / doc | Change |
|------------------|--------|
| `rukns/{AR##}` | New officer docs; additive fields on type |
| `rukns/{R###}` | Unchanged except prefix-strict listing |
| `karkuns/{kr-*}` | Additive promotion fields; exclusion from active Karkun |
| `connections` | End Active rows for promoted `karkunId` (existing statuses) |
| `connectionLedger` | New event metadata |
| `settings/aRuknCounter` | **New settings doc** (same collection as `karkunCounter`) |
| `muttafiqRelationships` | **No schema change**; new rows may use `ruknId=AR##` later |
| `assignmentReviews` | Pending lock cleanup on promotion |
| `activityLogs` | Optional audit create with `ruknId=AR##` after login; historical rows keep old ids |
| Auth custom claims | `{ role: 'rukn', ruknId: 'AR##' }` |

### Campaign / Meqati / work

No campaign architecture change. New operational rows **may** carry `ruknId=AR##` (`work`, `responsibilities`, `localProgrammes.responsibleRuknId`, compliance submissions). That is existing `ruknId` typing, not a new model.

### Client surfaces

- `src/constants/adminNavigation.ts`, `src/constants/routes.ts`
- Karkun registry/profile Promote
- A Rukn Admin page (filtered Rukn master)
- `isKarkun` / `isCampaignEligible` / Available list / hydrate filters
- `getNextRuknId` prefix-strict parse
- Claims provisioner: no structural change if `rukns` contains AR docs
- Firestore rules (later increment)

### Explicitly not affected

- Muttafiq relationship id function (already parameterized)
- Karkun `kr-*` allocator
- Existing `R###` document ids
- Certified Inbox Muttafiq approval machine (beyond using `AR##` as `ruknId` when Admin assigns)

---

## 18. Implementation increments

Do **not** start increment 1 until this lock is accepted.

| Inc | Scope | Out of scope |
|-----|--------|--------------|
| **0** | Types + prefix parsers + `officerKind` defaulting; `isActiveKarkun` exclusion helper; ARCH-009 verification list | UI, rules deploy, promotion writes |
| **1** | `settings/aRuknCounter` + transactional `allocateNextARuknId`; prefix-strict `getNextRuknId` | Promotion UX |
| **2** | Admin-only `promoteKarkunToARukn` service: Phase A (officer + end assignment + person flag + ledger); rules for promotion fields + Available exclusion + counter | Claims UX extras |
| **3** | Admin nav عازمِ رکن + filtered registry + Karkun Promote entry; Rukn master list excludes AR | New Home |
| **4** | Confirm OTP + existing claims provisioner against `AR##`; KC-0100 smoke | New JWT role |
| **5** | A Rukn Connect / Muttafiq relationship using `ruknId=AR##` (certified paths only) | Relationship redesign |
| **6** | Phase 5 certification + production smoke (Admin promote, old Rukn list, A Rukn login, Muttafiq link, Connect) | Reversal UI unless blockers complete |

Each increment: one responsibility; verify; commit; push; deploy from commit only.

---

## Conceptual model vs code (verification summary)

```
role = rukn
ruknId = R001 | AR01
```

**Fits the codebase** with these adaptations:

1. Discriminate category by **officer id / `officerKind`**, not JWT `role`.
2. People `PersonCategory` stays Karkun|Muttafiq; promotion is a **lifecycle flag** on `karkuns/{kr-*}`.
3. End Active **connections** so `assignedRuknId` cannot resurrect old ownership.
4. **Rules must not treat promoted persons as Available** after `assignedRuknId` is cleared.
5. Muttafiq links already key by `ruknId` — `AR01` is a legal `ruknId` string.
6. Do not allocate `R###` or a parallel Home.

---

## Non-goals (frozen)

- Intermediate Aazim / candidate stage
- Fifth category
- Parallel A Rukn Home or JWT role
- Rewriting historical campaign or Muttafiq documents to `AR##`
- Changing `kr-*` or existing `R###` ids
- Redesigning `muttafiqRelationships`
- Campaign engine changes unless a later increment proves a concrete break (none identified for id-as-string `ruknId`)
