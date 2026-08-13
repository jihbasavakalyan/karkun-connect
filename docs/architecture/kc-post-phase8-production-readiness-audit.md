# KC Post-Phase-8 — Production Readiness & Architecture Audit

**Status:** **PRODUCTION READY** — see [kc-production-signoff.md](./kc-production-signoff.md)  
**Type:** Production-readiness execution recorded on the original audit (no product implementation)  
**Audit date:** 2026-08-13  
**Execution date:** 2026-08-13 / 2026-08-14  
**Sign-off date:** 2026-08-14  
**Product commit:** `3f54e444c08629e0359b9d77aecc71c7f99a8b4d`  
**Audit commit:** `4f851017a839fd238589686e794ab580026e3d5a`  
**Deployed commit:** `4f851017a839fd238589686e794ab580026e3d5a` (documentation only; product code identical to Phase 8 `3f54e44`)  
**Branch:** `chore/kc-027-2-nonprod-recovery-readiness`  
**Historical counter:** **70 / 72** (TASK-071 and TASK-072 remain skipped; no substitutes created)  
**Authority:** [Phase 8 certification](./kc-phase8-certification.md) · [Phase 7 certification](./kc-phase7-certification.md) · [Phase 6 certification](./kc-phase6-certification.md) · [Phase 5 certification](./kc-phase5-certification.md) · [Phase 4 certification](./kc-phase4-certification.md) · [Phase 0](./kc-post-campaign-phase0-system-mapping.md)  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020

The original 2026-08-13 audit remains below. This document now also records the authorised production-readiness execution. No product code was changed. TASK-071 / TASK-072 were not invented. Phases 0–8 were not reopened.

---

## A. Overall readiness

**PRODUCTION READY**

Final decision: [kc-production-signoff.md](./kc-production-signoff.md) (2026-08-14).

Phases 0–8 remain certified. Production deploy, Firestore rules/indexes, Admin smoke, Rukn smoke, and live Rafeeq voice are now complete. Known limitations remain documented and are not production blockers.

No Phase 8 regression was found. No new intelligence database, LLM, or autonomous operational action was found. Product code was not modified.

---

## B. Critical blockers

**None that require reopening Phases 0–8 or rewriting certified product code.**

The following would **fail a production sign-off today**, but they are pre-deployment / verification gaps, not Phase 8 defects. **Closed on 2026-08-14** — see [kc-production-signoff.md](./kc-production-signoff.md).

| Item | Why it is not a code blocker | Required before sign-off |
|------|------------------------------|--------------------------|
| Firestore rules/indexes in git, not published | Certified local-first; rules exist and are internally consistent | Authorised `firebase deploy --only firestore:rules,firestore:indexes` |
| This branch not deployed to production | Explicit Phase 8 constraint | Authorised Vercel production deploy of this commit |
| Authenticated browser smoke **UNVERIFIED** | Credentials were not used in this session | Admin + Rukn smoke after deploy (§E) |
| Live Google TTS **UNVERIFIED** | No `GOOGLE_TTS_*` keys in local `.env.local`; `verify:tts` not run | Optional: confirm Vercel server env, then gesture-driven speak |

A **latent Firestore gap** exists for Rukn Work mutation (`units` is Admin-read-only while `WorkFirestoreRepository.saveDurable` requires a hydrated Unit). It is **not an immediate go-live blocker** because there is still **no Admin Work-create UI** (Phase 4 known limitation); the only `work.saveDurable` caller is `RuknWorkActionPanel` updating existing rows. See §G and §I.

---

## C. Non-blocking limitations

| Limitation | Production blocker? | Required action |
|------------|---------------------|-----------------|
| Authenticated browser smoke unverified | No (verification gap) | Run §E after deploy; do not treat automated certs as UI proof |
| Live Google TTS unverified | No | Voice remains optional; visual Rafeeq works without TTS |
| Firestore rules not deployed | Yes for **new** Phase 1–6 docs; No for existing live collections | Publish git rules **before or with** this app deploy |
| Production not deployed (this branch) | Yes for enabling post-campaign surfaces | Authorised production deploy after rules + env |
| Monitoring not wired to Phase 6 notifications | No — by design | Do not wire; monitoring is a derived compare |
| Monitoring history caller-supplied | No — by design | Caller passes previous snapshot; no monitoring collection |
| Phase 2 `verify:kc-phase2-local-programme-persistence` provider-string assert | No | Leave documented; wiring constructs then assigns `localProgramme` |
| No Admin Work / Responsibility create UI | No — Phase 4 known limitation | Product decision if Admin must create Work in UI |
| Occurrence generator is callable, no Admin button, no scheduler | No — Phase 3 TASK-023 design | Calendar/history stay empty until generation is invoked |
| Rukn cannot read `occurrences` / `localProgrammes` / planning collections | No for current WI/BM paths; Yes for Rukn **calendar** notifications | Soft-skip → empty lists; Work notices still hydrate |
| Rukn cannot read `units` | Latent for Work **save** | Address before enabling Rukn Work mutation in Firestore (§I) |
| Push / WhatsApp **notification dispatch** reserved | No — Phase 6 | Device `wa.me` actions remain; no server WhatsApp send |
| `InboxItemKind` `admin_notification` unused | No — by design | Inbox is not a notification dump |
| `RuknConversationsPanel` placeholder | No — by design | Not a chat system |
| `selectPrimaryContextualRecommendation` is a concise surface | No — by design | Not a ranked feed |
| No production scheduler | No — Phase 3/6 | Notifications evaluate on read |
| TASK-071 / TASK-072 skipped | No | Do not invent substitutes |

---

## D. Required pre-deployment actions

Ordered by dependency. Do **not** deploy from this audit session.

```text
Code verification (this audit — PASS)
      ↓
Firestore rules + index publish (git → live project)
      ↓
Environment verification (Firebase Auth/Firestore + optional TTS)
      ↓
Production application deploy (this commit)
      ↓
Authenticated Admin / Rukn smoke (§E)
      ↓
Post-deploy verification (existing ops checklist + new surfaces)
      ↓
Production readiness sign-off
```

Repository evidence for this order:

1. **Code verification** — `npm run typecheck` / `npm run build` / Phase 3–8 verifies (this session). `docs/operations/deployment-guide.md` requires build before deploy.
2. **Firestore rules/indexes first** — new collections are default-deny until published. Deploying this app **before** rules would make Admin Planning / Inbox messages / notification prefs fail on persist. Additive rules-first is the safer order (`firebase.json` + deployment guide §4 then §6).
3. **Environment** — `VITE_*` are build-time (`docs/operations/environment-management.md`). TTS/STT are server-only (`GOOGLE_TTS_CREDENTIALS_JSON`, never `VITE_*`). `FIREBASE_SERVICE_ACCOUNT_JSON` remains required for Rukn claims provisioning (KC-0100.5).
4. **Application deploy** — Vercel (existing production host) with `VITE_REPOSITORY_PROVIDER=firestore`.
5. **Authenticated smoke** — no substitute; Phases 4–8 certified without browser login.
6. **Post-deploy** — `docs/operations/smoke-test.md` plus §E post-campaign surfaces.
7. **Sign-off** — only after expected vs actual is recorded.

No localStorage → Firestore migration of existing Karkun / Rukn / Connection / Campaign / WI / BM data is required for Phases 1–8. New collections start empty and are compatible with existing documents.

---

## E. Required browser smoke checklist

**Admin smoke executed 2026-08-14** on production `https://karkun-connect.vercel.app` as existing session `jihbasavakalyan1@gmail.com` (Administrator). **Rukn smoke PASS** on 2026-08-14 via a real authenticated Rukn session in live production (see [kc-production-signoff.md](./kc-production-signoff.md)). Karkun login was not tested.

Login roles remain `administrator` \| `rukn` only (`src/types/auth.types.ts`). There is **no Karkun login**. Karkun is a registry / connected-person record.

### Admin

| # | Surface | Route | Expect |
|---|---------|-------|--------|
| A1 | Login | `/login` | Email + password → `/admin` |
| A2 | Home / Command Center | `/admin` | Loads; no infinite spinner after hydrate |
| A3 | Attention Required | Command Center panel | Derived rows; existing destinations |
| A4 | Organisational Picture | Command Center panel | Stage counts + existing Admin routes |
| A5 | Actionable notifications | Command Center panel | Derived; deep-links; not dumped into Inbox |
| A6 | Planning | `/admin/planning` | Mansooba / Objectives / Units / Local Programme CRUD persist |
| A7 | Occurrence calendar / history | Planning page | Derived from Occurrence; empty is valid until generated |
| A8 | Campaign / Local Programme | `/admin/campaign` + Planning programmes | Existing campaign library intact; programmes under campaign |
| A9 | Work (read) | Planning lists Work if present | No Admin Work-create UI (known limitation) |
| A10 | Admin Inbox | `/admin/inbox` | People intake + Rukn → Admin messages; mark read |
| A11 | Notifications prefs | `/admin/settings` | `inApp` toggles persist; voice autoplay remains off |
| A12 | Rafeeq | Command Center / drawer | Visual guidance; speak is gesture-driven |
| A13 | Hard refresh / logout / login | — | Session restore; dashboard still loads |
| A14 | Existing ops (regression) | WI, BM, Karkun registry, Connections | Pre-phase-1 production paths unchanged |

### Rukn

| # | Surface | Route | Expect |
|---|---------|-------|--------|
| R1 | OTP login | `/login` | Registered mobile → `/rukn` |
| R2 | Home | `/rukn` | Mission + Work panel + notifications + journey counts |
| R3 | Work / actions | Home `RuknWorkActionPanel` | Empty until Work exists; persist errors must be visible if save attempted |
| R4 | Action dashboard (now-actions) | Home | Derived follow-ups / journey / in-force responsibility; not a second Work SoT |
| R5 | Connected Karkuns | `/rukn/my-karkun` | Assigned people load |
| R6 | Connect / available | `/rukn/available-karkun` | Available pool (existing rules) |
| R7 | Connection Journey | `/rukn/visit/:karkunId` | Existing tracker + continuous-journey strip |
| R8 | Rukn → Admin message | Home compose | One-way; appears in Admin Inbox; no thread |
| R9 | WhatsApp | Connected / Companion / Admin Rukn-Karkun actions | Device `wa.me` only |
| R10 | Weekly Ijtema / Bait-ul-Maal | `/rukn/weekly-ijtema`, `/rukn/baitul-maal` | Existing compliance SoTs |
| R11 | Settings / voice | `/rukn/settings` | `voiceResponses` / `voiceSpeed`; autoplay off |
| R12 | Rafeeq | Home launcher / drawer | Visual works; Objective strip may be empty (Rukn cannot read planning collections) |
| R13 | Unauthorized | `/admin` | Redirect away from Admin |

### Karkun (no login)

| # | Surface | Route | Expect |
|---|---------|-------|--------|
| K1 | Admin registry | `/admin/karkun`, `/admin/karkun/:id` | Existing registry / Person 360 |
| K2 | Rukn connected person | `/rukn/my-karkun`, visit, Companion | Existing connection journey |
| K3 | Public / Karkun portal | — | **None.** Do not invent Karkun functionality |

---

## F. Firestore deployment requirements

### Rules (git only today)

`firestore.rules` is the candidate to publish. Live project delta was **not** inspected this session (no Firebase deploy/inspect). Phases 6–8 certify rules were **not** published.

| Path | Access | Notes |
|------|--------|--------|
| Existing: `campaigns`, `rukns`, `karkuns`, `connections`, `activityLogs`, `connectionLedger`, `executions`, `followUps`, `assignmentReviews`, `communications`, `compliance`, `settings` | Unchanged intent vs prior production hardening | Default deny; no client deletes on critical people collections |
| `meqatiMansoobas`, `objectives`, `units` | Administrator read/write; no client delete | Phase 1 |
| `localProgrammes` | Administrator; no Rukn | Phase 2 (verify asserts no Rukn) |
| `occurrences` | Administrator; no Rukn | Phase 3; Rukn hydrate **soft-skips** to `[]` |
| `responsibilities`, `work` | Admin all; Rukn read/update own | Phase 4; Work update gated by `ruknMayActOnWork` |
| `settings/ruknAdminMessages` | Admin + Rukn create/update | Phase 6; transactional merge in repository |
| `settings/notificationPreferences_{uid}` | Signed-in user own doc | Phase 6 |

Publishing these rules should **not** rewrite existing Karkun/Rukn/Connection documents. Risk to live features is low if production already has KC-0058 / assignment-review / compliance rules; confirm live rules before publish.

Could rules **block** existing functionality? Only if live production is more permissive than git on an existing path. Treat publish as a reviewed diff against the live project, not a blind overwrite.

Could unpublished rules **block** new functionality? **Yes.** New collections and the two settings docs are default-deny until published.

### Indexes

`firestore.indexes.json` — existing composites only (`connections`, `karkuns`, `activityLogs`, `followUps`, `executions`). No Phase 1–8 composites. Rukn `work` / `responsibilities` queries are single-field `ruknId` (auto-index). No new index is required for the certified query shapes.

### Migrations

**None required** for existing production people/campaign/WI/BM data. Phases 1–8 collections are additive and may be empty. `migrateLocalStorageToFirestore()` remains the historical local→cloud tool; it is not a Phase 8 data rewrite.

### Production data compatibility

Existing documents remain valid. Intelligence / journey / notifications are derived reads. No evaluation / NBA / recommendation / monitoring collection.

---

## G. Environment requirements

| Variable | Required for this deploy? | Notes |
|----------|---------------------------|--------|
| `VITE_FIREBASE_*` | **Yes** | Build-time |
| `VITE_REPOSITORY_PROVIDER=firestore` | **Yes** | Production |
| `VITE_ADMIN_EMAILS` | Bootstrap only | Prefer custom claims |
| `FIREBASE_SERVICE_ACCOUNT_JSON` + `FIREBASE_PROJECT_ID` | **Yes** for Rukn OTP claims (`/api/rukn-claims-provision`) | KC-0100.5 |
| `GOOGLE_TTS_CREDENTIALS_JSON` (or base64 / `GOOGLE_APPLICATION_CREDENTIALS`) | **No** for visual Rafeeq | Required only for live TTS/STT |
| Any `VITE_GOOGLE_*` | Must **not** exist | Client must not receive Google credentials |

This session: local `.env.local` exists and has Firebase project / repository provider set; **no** `GOOGLE_TTS_*` / `GOOGLE_APPLICATION_CREDENTIALS` keys. Historical ops notes record `GOOGLE_TTS_CREDENTIALS_JSON` on Vercel; **live Vercel env was not inspected** (Vercel MCP unauthenticated).

Voice architecture (unchanged):

```text
spokenText → RafeeqSpeakButton (click) → cloudSpeechPlayback → POST /api/tts
  → VoiceService → GoogleTTSProvider → server credentials only
```

- `voiceResponses === false` blocks playback; UI remains.
- `voiceSpeed` maps to speaking rate (slow 0.85 / normal 0.95 / fast 1.1).
- Autoplay remains off (`verify:settings` 6/6).
- Voice can **safely remain optional**. Missing TTS is a degraded speak button, not an auth/data outage.

---

## H. Architecture integrity

### Certified chain (still derived)

```text
Operational Data
      ↓
Objective Evaluation          (Planning Objective SoT; no score)
      ↓
Activity Evaluation           (WI / BM / Occurrence / Work SoTs)
      ↓
Next Best Action              (one action; does not replace per-execution NBA)
      ↓
Contextual Recommendation     (wraps passed NBA)
      ↓
Rafeeq Presentation           (Urdu; actionCode copied; no LLM)
      ↓
Voice                         (same spokenText; optional)
      ↓
Intelligent Monitoring        (fingerprint compare; no persist)
```

| Check | Result |
|-------|--------|
| Planning Objective SoT | **PASS** — `objectives` collection; evaluation does not persist |
| Campaign / Local Programme / Occurrence / Work / Responsibility | **PASS** — existing collections; no duplicates |
| Karkun Registry / Rukn Master / Connection | **PASS** — unchanged SoTs |
| Phase 5 activity records | **PASS** — WI/BM dual-write / Excused/Exempt not reopened |
| Phase 6 Inbox / `ruknAdminMessages` / WhatsApp `wa.me` / derived notifications | **PASS** — no second inbox/chat/notification collection |
| Phase 7 journey / attention / organisational picture | **PASS** — derived; no journey database |
| Phase 8 no intelligence database | **PASS** — `FIRESTORE_COLLECTIONS` has no evaluation/NBA/monitor keys; `src/execution` has no `saveDurable` |
| No LLM | **PASS** |
| No autonomous operational action | **PASS** — recommend / present / observe |
| `evaluateCampaignObjective` / per-execution `deriveNextBestAction` | **PASS** — Phase 8 cert; KC-020 verify 6/6 this session |
| Frozen model | **PASS** — Admin configures; system prepares; Rukn acts; system records; Admin monitors |

### Source-of-truth audit (no Phase 8 duplicates)

| Authoritative entity | Still SoT? | Duplicate introduced by Phase 8? |
|----------------------|------------|----------------------------------|
| Planning Objectives | Yes | No |
| Campaign | Yes | No |
| Local Programme | Yes | No |
| Occurrence | Yes | No |
| Work | Yes | No |
| Responsibility | Yes | No |
| Karkun Registry | Yes | No |
| Rukn Master | Yes | No |
| Connection | Yes | No |
| Phase 5 WI / BM / orientation signals | Yes | No |
| Phase 6 communication / notification structures | Yes | No |

Phases 6 and 7 do **not** need reopening for production readiness. No genuine defect was found in Admin Inbox, Rukn → Admin messaging, WhatsApp `wa.me`, derived notifications, Continuous Karkun Journey, Attention Required, Rukn Action Dashboard, Organisational Picture, or Exceptions.

---

## 1. Code / build health (evidence)

| Command | Result | Classification |
|---------|--------|----------------|
| `npm run typecheck` | **PASS** (exit 0) | — |
| `npm run build` | **PASS** (exit 0); chunk-size / ineffective-dynamic-import warnings only | Non-blocking, pre-existing bundler warnings |
| `npm run verify:kc-phase8-*` (six scripts) | **PASS** | — |
| `npm run verify:kc-phase3-occurrence-operations` | **PASS** | — |
| `npm run verify:kc-phase4-rukn-action-dashboard` | **PASS** | — |
| `npm run verify:kc-phase5-activity-tracking` | **PASS** | — |
| `npm run verify:kc-phase5-mansooba-activity-reporting` | **PASS** | — |
| `npm run verify:kc-phase6-communication-surfaces` | **PASS** | — |
| `npm run verify:kc-phase6-notifications` | **PASS** | — |
| `npm run verify:kc-phase7-journey-dashboards` | **PASS** | — |
| `npm run verify:execution-automation` | **PASS** (KC-020 6/6) | — |
| `npm run verify:rafeeq-voice` | **PASS** (20 checks) | — |
| `npm run verify:voice-conversation` | **PASS** (KC-027 5/5) | — |
| `npm run verify:settings` | **PASS** (6/6, autoplay=off) | — |
| `npm run verify:reliability` | **PASS** | — |
| `npm run verify:firestore` | **PASS** | — |
| `npm run verify:production` | **PASS** | Static ops/docs/rules/index checks |
| `npm run verify:kc-phase2-local-programme-persistence` | **FAIL** — string assert `localProgramme: new LocalProgrammeLocalRepository(campaign)` | Pre-existing; non-blocking; not a Phase 8 regression |
| `npm run verify:tts` | **Not run** | No local TTS credentials |

Repository consistency: HEAD matches the stated Phase 8 certification commit. Working tree has **no modified tracked files**. Untracked paths are historical evidence/scripts (exports, screenshots, admin probes) — not uncommitted architectural product changes.

---

## I. Recommended next implementation work

Do **not** invent TASK-071 or TASK-072. Do **not** start this work from the audit session.

Only if a later explicit decision authorises it:

1. **Rules product decision (recommended before enabling Rukn Work in Firestore):** allow Rukn **read** of `units` so `WorkFirestoreRepository.saveDurable` parent validation can succeed. Today `units` is Admin-only; Rukn Work **update** is allowed by rules but application validation looks up Unit cache (soft-skip empty). Latent until Work rows exist.
2. **Optional rules decision:** Rukn read of `occurrences` and `localProgrammes` if Rukn calendar notifications must populate. Today they soft-skip empty; WI/BM compliance paths do not depend on those collections.
3. **Optional product UI:** Admin trigger for the existing callable Occurrence generator; Admin Work / Responsibility create UI (Phase 4 known gaps). These are product decisions, not Phase 8 defects.

No intelligence-layer extension. No second notification engine. No LLM.

---

## J. Explicit conclusion

The completed Phase 0–8 architecture remains **coherent**. Production-readiness execution is recorded in **§K**.

**Final state: PRODUCTION READY** — [kc-production-signoff.md](./kc-production-signoff.md)

- Firestore rules/indexes published to `karkun-connect-75c68`
- Production deploy Ready (`dpl_FriLCjMDogZhkhnyAqqZr1R3ARNt`)
- Admin authenticated smoke **PASS**
- Rukn authenticated smoke **PASS** (live production; recorded 2026-08-14)
- Live Google TTS **PASS** (Urdu audio in production; recorded 2026-08-14)

It does **not** require:

- reopening Phases 6–8,
- a new numbered product phase,
- substitute TASK-071 / TASK-072,
- or speculative product-code changes from this execution.

**2. Specific remediation first** only if a later release must enable **Rukn Work mutation** or **Rukn Occurrence-calendar notifications** on Firestore. Those need an explicit authorization decision on Rukn read of `units` (required for Work save) and optionally `occurrences` / `localProgrammes` (calendar notices). That is a rules/product decision, not a Phase 8 rewrite.

**3. A new product decision** is required only for Admin Work/Responsibility UI and Occurrence generation UX. Those were already known limitations. They are not blockers for the deployed Planning, Inbox, messaging, derived notifications, journey/attention panels, or optional Rafeeq.

**STOP.** Do not start a new product task. Do not define TASK-071/072. Do not begin Phase 9. Do not remediate the optional Rukn `units` / occurrence-read gaps unless a later explicit task authorises it.

---

## K. Production-readiness execution (2026-08-13 / 2026-08-14)

Ordered sequence executed. No product-code changes. No architecture reopen.

### 1. Code verification

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (chunk-size / ineffective-dynamic-import warnings only) |
| Phase 8 six verifies | **PASS** |
| Phase 3 occurrence operations | **PASS** |
| Phase 4 Rukn action dashboard | **PASS** |
| Phase 5 activity + Mansooba reporting | **PASS** |
| Phase 6 communication + notifications | **PASS** |
| Phase 7 journey dashboards | **PASS** |
| Phase 2 `verify:kc-phase2-local-programme-persistence` | **Not “fixed”** — documented provider-string failure remains; not a production blocker for this release |

### 2. Firestore

| Item | Result |
|------|--------|
| Target project | `karkun-connect-75c68` (`.firebaserc` + `firebase use`; not assumed) |
| Rules | **Deployed** — `npx firebase deploy --only firestore:rules,firestore:indexes --project karkun-connect-75c68` |
| Indexes | **Deployed** for `(default)` database from existing `firestore.indexes.json` (no new Phase 1–8 composites required) |
| Rule semantics | Unchanged |
| Migrations | **Not required** |
| New collections | May start empty (`meqatiMansoobas`, `objectives`, `units`, `localProgrammes`, `occurrences`, `responsibilities`, `work`, `settings/ruknAdminMessages`, `settings/notificationPreferences_{uid}`) |

Firebase CLI output: rules compiled and released; indexes deployed successfully.

### 3. Environment

| Area | Result |
|------|--------|
| Firebase | Production app uses project `karkun-connect-75c68` |
| Vercel | Project `jihbk/karkun-connect` (`prj_16kA2l3oa9MHEd5FFEwItsqLmWZz`); production env includes `VITE_FIREBASE_*`, `VITE_REPOSITORY_PROVIDER`, `VITE_ADMIN_EMAILS`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` |
| TTS | `GOOGLE_TTS_CREDENTIALS_JSON` present on Vercel (server-only). No `VITE_GOOGLE_*`. Live Google TTS later **PASS** (2026-08-14 sign-off) |
| Voice | Remains optional; application is functional without speak |

Direct equality of pulled secret values against the Firebase project id could not be echoed (CLI redaction). Identity is established from `.firebaserc`, Firebase CLI targeting, Vercel project link, and live production history.

### 4. Deployment

CLI `vercel deploy --prod` from a clean worktree **failed twice** (status UNKNOWN, no usable build logs). Git-integration preview of this branch **did** build.

Promoted the Ready preview to production:

```text
npx vercel promote karkun-connect-2lvgfklc5-jihbk.vercel.app --yes
```

| Field | Value |
|-------|--------|
| Deployed commit | `4f85101` (product code = Phase 8 `3f54e44`; preview created 2026-08-13 14:32 IST, immediately after the audit commit) |
| Deployment ID | `dpl_FriLCjMDogZhkhnyAqqZr1R3ARNt` |
| Deployment URL | `https://karkun-connect-nzr82guwd-jihbk.vercel.app` |
| Environment | production |
| Status | **Ready** |
| Aliases | `https://karkun-connect.vercel.app`, `https://jihbasavakalyan.org`, `https://karkun-connect-jihbk.vercel.app` |
| Functions | `api/karkun-mobile-lookup`, `api/rukn-claims-provision`, `api/stt`, `api/tts` |
| Source preview | `https://karkun-connect-2lvgfklc5-jihbk.vercel.app` (`dpl_4GFNF4HoB4VxnhMmnUHtmmmexdAE`) |

A leftover CLI production attempt `karkun-connect-oxjb407if-jihbk.vercel.app` (`dpl_2oPojnPtiToYG7ExFdA2oYs8sTLM`) remained **UNKNOWN** and is **not** the live alias target. The hung CLI process was stopped.

Unrelated local untracked evidence/scripts were **not** deployed.

### 5. Admin smoke

Existing authenticated Admin session (credentials not recovered). After promote, a PWA/Workbox cache mismatch served stale HTML (`index-Diq-cUBQ.js` 404) until the service worker/cache was unregistered. Fresh load used `index-Ctx3yhv5.js` 200. This is an operational PWA refresh issue, not a product-code blocker.

| # | Surface | Result |
|---|---------|--------|
| A1 | Login / session | **PASS** — existing Admin session restored after cache clear |
| A2 | Home / Command Center | **PASS** — `/admin`; campaign فعال کارکن، فعال جماعت; 584 connected Karkuns; COMPLETED |
| A3 | Attention Required | **PASS** — Not Connected, duplicate mobiles, journey-gap rows |
| A4 | Organisational Picture | **PASS** — Connection → Development → … counts loaded |
| A5 | Actionable notifications | **PASS** — panel loaded (“No actionable notifications from calendar or work.”); bell shows 3 operational alerts |
| A6 | Planning | **PASS** — `/admin/planning`; Mansooba/Objectives empty (valid); campaigns listed |
| A7 | Occurrence calendar / history | **PASS** — empty is valid |
| A8 | Campaign / Local Programme | **PASS** — existing campaigns visible; Local Programmes empty (valid) |
| A9 | Work (read) | **PASS** — Follow-up / Work Queue `/admin/operations?tab=queue` loaded; Planning work feed empty (no Admin Work-create UI) |
| A10 | Admin Inbox | **PASS** — `/admin/inbox` pending New Karkun requests; Rukn messages folder empty. No Approve/Reject |
| A11 | Notifications prefs | **PASS** — Settings → Notifications read; Work reminders in-app toggled off then restored on; UI showed Saved |
| A12 | Rafeeq | **PASS** — drawer opened; Urdu visual “ڈیجیٹل رفیق / آپ کا خصوصی معاون”. Speak not exercised |
| A13 | Hard refresh / logout-login | **Partial** — cache-clear reload restored Admin session. Logout/login cycle not performed (would drop the only available session) |
| A14 | Existing campaign data | **PASS** — 584 connected Karkuns; campaign library intact |
| — | Unexpected permission-denied | **None observed** on visited surfaces. Firestore Listen channels returned 200 |

Rukn → Admin message **write** was not exercised (empty folder; no test production data created).

### 6. Rukn smoke

**PASS** (2026-08-14 live production) — see [kc-production-signoff.md](./kc-production-signoff.md).

During the 2026-08-13/14 execution session, Rukn OTP credentials were not recovered and this row was **UNVERIFIED**. A real authenticated Rukn session was later inspected in production. Rukn Work mutation was not enabled. Planning/occurrence reads were not changed.

### 7. Post-deploy verification

| Check | Result |
|-------|--------|
| Application loads | **PASS** — `/login` HTTP 200; Admin app hydrates after PWA cache refresh |
| Authentication | **PASS** — existing Admin session |
| Firestore reads | **PASS** — Command Center, campaign, inbox, planning, settings |
| Firestore writes (supported) | **PASS** — notification preference toggle Saved, then restored |
| New rules vs existing data | **PASS** — existing campaign / Karkun counts remained intact |
| Admin Inbox | **PASS** |
| Notification preferences | **PASS** |
| Rafeeq visual | **PASS** |
| Voice | Optional; live Google TTS **PASS** (Urdu audio, 2026-08-14) |
| Permission-denied | None observed on Admin surfaces |

### 8. Known limitations (unchanged)

- Monitoring is not wired into Phase 6 notifications
- Monitoring history is caller-supplied
- No Admin Work-create UI
- Occurrence generator has no Admin button/scheduler
- Rukn cannot read planning/occurrence collections; calendar notices remain empty
- Phase 2 provider-string verification failure
- PWA/Workbox may serve stale hashed assets until the in-app “new version” refresh (or SW unregister)

### 9. Final readiness state

**PRODUCTION READY**

See [kc-production-signoff.md](./kc-production-signoff.md). Known limitations remain; they are not production blockers.
