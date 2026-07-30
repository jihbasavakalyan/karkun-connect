# KC-032 — Product Capability Audit & Roadmap Refresh

**Type:** Product audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete — single source of truth for product capability status  
**Date:** 2026-07-31  
**Authority baselines:** [KC-0104 COS Product Architecture](./campaign-operating-system-product-architecture.md) · [KC-0103A–E domain audits](./index.md) · [KC-0109 Ops consolidation](./operations-model-consolidation.md)

**Nature of this document**

This audit determines the **actual implementation status** of every planned capability in Karkun Connect.  
It does **not** authorize feature work, refactors, schema changes, or production code changes.

Evidence classes: **FACT** (source/docs/verify) · **OBSERVATION** (cross-surface pattern) · **RECOMMENDATION** (product/engineering priority only).

---

## Phase 0–3 (KC-ARCH-009) — Audit gate

| Field | Value |
|-------|-------|
| Request type | **Audit / Investigation** (documentation) |
| Change surface | `docs/architecture/kc-032-product-capability-audit.md` (+ index link; optional canvas) |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **GO** for documentation audit only |

---

## Executive summary

Karkun Connect is a **live Campaign Operating System** for Basavakalyan pilot scale: People → Connections → Operations → Engagement (WhatsApp-assisted) → Executive Dashboard, with Digital Rafeeq / Secretary and KC-ARCH-001 write reliability.

| Verdict | Count (matrix rows) |
|---------|---------------------|
| ✅ Implemented & Verified | 18 |
| 🟡 Implemented (needs verification) | 12 |
| 🟠 Partially Implemented | 10 |
| ❌ Not Implemented | 8 |
| ⚠ Deprecated / Replaced (compat retained) | 2 |

**Highest-signal truths**

1. **Foundation is certified** — Auth (KC-0100), roles, Firestore, repositories, reliability write lifecycle (KC-028B).
2. **Campaign execution is live** — Connections, visits, dual-track Ijtema/BM (event/cycle canonical for Health), Inbox, Communication compose/lists.
3. **Largest integrity debt** — Dual Ijtema/BM tracks + legacy Health/progress calculators still feed Cos/automation/Rafeeq readers (KC-0110/0111/0112 TODOs).
4. **Largest product gaps (genuine)** — Meta Cloud delivery, scheduled weekly jobs, historical comparison / forecasting product, Recovery Center, Dastoor, durable assignment-review persist, Engagement delivery webhooks.
5. **Do not reopen** — RC1 “no Firebase” roadmap language; Sprint 16 “backend rewrite”; Cos IA placeholders as if core messaging were missing (compose/lists already ship).

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Implemented & Verified** — shipped + contract/cert verify and/or release certification |
| 🟡 | **Implemented (needs verification)** — live code/UI; missing dedicated npm verify, live smoke, or env-dependent cert |
| 🟠 | **Partially Implemented** — useful subset live; stubs, dual-source, unmounted UI, or local-only persistence |
| ❌ | **Not Implemented** — no product capability (or only placeholder/spec) |
| ⚠ | **Deprecated / Replaced** — superseded by canonical path; retained for compatibility |

---

## 1. Product Capability Matrix

### 1.1 Foundation

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Authentication | Admin email/password + session | ✅ | `verify:auth`, `verify:login-render`; [AUTHENTICATION-CERTIFICATION](../release/AUTHENTICATION-CERTIFICATION.md) | M7; KC-0100 family | Firebase Auth; Remember Me |
| Authentication | Rukn OTP + JWT claims provision | ✅ | `verify:rukn-identity`, `verify:kc0100.2/.3/.5`, `verify:kc0061.phase2` | KC-0100, KC-0100.3–.5 | Fail-closed claims; MFA ❌ future |
| Roles | Administrator / Rukn route + claims authz | ✅ | `verify:auth`, `verify:kc0061.phase2` | M7 / KC-0100 | No fine-grained RBAC beyond two roles |
| Firestore | Collections, rules, offline cache | ✅ | `verify:firestore` (structural); rules in repo | M8; KC-0058 | Live rules deploy = ops; not exercised by structural verify |
| Repositories | Local + Firestore provider pattern | ✅ | `verify:repositories`, `verify:persistence` | M6.9 / M8 | Docs still contain stale “M8 future” wording |
| Settings | Admin/Rukn settings experience | ✅ | `verify:settings` | KC-026 | Prefs = localStorage; Integrations ❌ placeholders |
| Voice | Digital Rafeeq STT/TTS conversation | 🟡 | `verify:voice-conversation`, `verify:rafeeq-voice`; live `verify:tts` needs creds | KC-027 | Contracts verified; live Google STT/TTS = env smoke |

### 1.2 Campaign Execution

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Connections | Connect / transfer / remove / restore / mapping | ✅ | `verify:assignments`, `verify:kc002`, `verify:kc003`, `verify:kc0055`, `verify:kc0100` | KC-0103A P-12–P-18 | Firestore `connections` + ledger |
| Connections | Assignment review queue (Rukn→Admin) | 🟠 | Partial — UI exists; **in-memory store** | KC-0103A P-19–P-20 | Not durable across sessions (**genuine gap**) |
| Visits | Annexure-1 / Connection Journey | 🟡 | `verify:guidance`; smoke B5/C2 manual | KC-0103C O-01–O-04 | No dedicated `verify:annexure`; development assessment = localStorage |
| Weekly Ijtema | Event track (canonical Ops/Health) | 🟡 | `scripts/verify-kc0107-weekly-ijtema.ts`; `verify:kc-028c` | KC-0107, KC-0110, KC-028C | **Not wired** as `verify:kc0107` in package.json |
| Weekly Ijtema | Legacy per-Karkun attendance | ⚠ | Dual-write / Excused / historical fallback | KC-0110 | Cos/automation/Rafeeq still legacy readers (TODO) |
| Baitul Maal | Monthly cycle track (canonical) | 🟡 | `scripts/verify-kc0108-monthly-baitul-maal.ts` | KC-0108, KC-0112 | Script present; **not** in package.json |
| Baitul Maal | Legacy per-Karkun compliance | ⚠ | Dual-write retained | KC-0112 | Same deferred reader debt as Ijtema |
| Communication | Compose, bulk mail-merge, lists, templates, history | 🟠 | `verify:kc0060`, `verify:kc0119`, `verify:kc0125`, `verify:kc-bug-0130a` | KC-0103D; KC-0119; KC-0125 | WhatsApp Web `wa.me`; not Meta Cloud |
| Communication | Delivery webhooks / retry / Meta Cloud | ❌ | Stubs (`deliveryService`, Sprint 16 reserved) | KC-0103D E-20 | Client contracts only |
| Communication | Campaign notification dispatch | ❌ | `dispatchCampaignEvent` empty (Sprint 17) | KC-0103D | — |
| Inbox | Unified Admin Inbox (intake + messages) | 🟡 | `verify:kc-028b`, `verify:kc0102.0` | KC-0123, KC-028B | No `verify:kc0123`; replaces Dashboard-only intake host |
| Assignments desk | Campaign Execution / Operations tabs | 🟡 | `verify:execution-automation`, `verify:kc009-plan` | KC-0113.1 / KC-0115 | `/admin/operations` shell; legacy redirects |

### 1.3 Executive

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Dashboard | Admin Command Center + Hero | ✅ | `verify:kc0101b`, dashboard IA / command-center verifies | KC-0102A–E | Live `/admin` |
| Reports | Module reports (Execution / WI / BM) | ✅ | Module UIs + `verify:kc0059`, `verify:kc-bug-0126` | KC-0103E R-13–R-15 | No dedicated `/admin/reports` hub (by design today) |
| Reports | Executive campaign PDF / ranking | 🟡 | Recent KC-029 / KC-029.1 commits | `d9e2a1a`, `7eeeb84` | Needs sustained prod smoke beyond ticket verify |
| Campaign Health | Four-slice canonical Health | ✅ | `verify:kc0058.1`, `verify:kc0101b`; [KC-0111](./kc-0111-campaign-health-inventory.md) | KC-0102E, KC-0111 | Visits · WI · BM · App Registration |
| Insights | Rafeeq campaign / operational insights | 🟡 | `verify:rafeeq-campaign-intelligence`, `verify:rafeeq-v2` | Rafeeq modules 13+ | Admin Relationship Insights panel largely unmounted |
| Outstanding Performance | Top Priority / Collective / performers | 🟡 | Command Center builders; report model | KC-0103E R-02/R-08 | Product noun “Outstanding Performance” absent; surfaces exist under other names |
| Operational Dashboard | Today’s Mission / Action Center | ✅ | Mission builders; experiment flag = true path | KC-0103E R-05–R-06 | Legacy ops three-column retained / unmounted variants |

### 1.4 Automation

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Weekly Automation | Scheduled weekly job runner | ❌ | — | Constitution / framework docs | **No cron**; derived engine ≠ scheduler |
| Weekly Automation | Derived Campaign Automation Engine | 🟡 | `verify:automation` | Sprint 12; KC-020 adjacent | Live snapshot/queues; still legacy Health/IJ/BM inputs |
| Secretary | Urdu-first secretary intelligence | ✅ | `verify:rafeeq-secretary`, `verify:kc-0131.4` | `dc65f3d` / KC-0131.4 | Conversation architecture layer |
| Rafeeq | Digital Rafeeq v2 companion | ✅ | `verify:rafeeq-v2`, search, safe-actions, campaign-intel | KC-Rafeeq family | Voice = 🟡 (above) |
| Follow-up | Create/complete follow-ups | ✅ | Ops module + guidance verifies | KC-0103C O-05–O-06 | SoR `followUps` |
| Recommendations | Priority / NBA / Rafeeq recommendations | 🟡 | `verify:rafeeq-v2`, `verify:execution-automation` | KC-0120; KC-020 | Derived; not a separate product module |
| Reminder Engine | Guidance reminders + WI window reminders | 🟠 | `verify:guidance`, `verify:kc-028c` | KC-028C; `reminderEngine.ts` | Engine live; Command Center reminders UI weakly mounted; no push channel |

### 1.5 Analytics

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Trend Analysis | Progress Trends panel (visits/connections) | 🟡 | Mounted on Command Center | KC-0103E R-09; KC-0111 | List/detail trends — not multi-series warehouse BI |
| Historical Comparison | Period-over-period campaign snapshots | ❌ | — | — | Proxies only (“this week”, “most improved” without snapshots) |
| Forecasting | Completion pace forecast | 🟠 | Intelligence helpers; CC Intelligence often unmounted | `commandCenterPresentation` | Thin annexure-rate forecast |
| Executive Digest | Scheduled digest product | ❌ | — | — | Rafeeq Daily Briefing = on-demand **≠** digest product (`verify:kc-0130`) |
| Data Quality | Registry health / integrity scanner | ✅ | `verify:kc0058`, data-integrity verifies | KC-0058 | Settings / admin tooling — not executive KPI |
| Exception Reports | Dedicated exception report export | ❌ | — | — | Exception **queues** live (Mission, Priority, Inbox) — different capability |

### 1.6 Reliability

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| Write Lifecycle | idle → writing → ACK → refresh → done | ✅ | `verify:reliability`, `verify:kc-028b` | KC-028B `a3b623f` | KC-ARCH-001 |
| Retry | Retryable write errors + hydration retry | ✅ | `verify:reliability`, `verify:kc0058.8` | KC-028B; KC-0058.8 | — |
| ACK | Success only after durable commit | ✅ | `awaitQueuedWrite`; reliability verify | KC-ARCH-001 | — |
| Repository Refresh | Post-write refresh phases | ✅ | Write lifecycle + hydration | KC-028B | — |
| Backup | Migration/local dataset backup | 🟠 | Migration tooling | DATA_PRESERVATION; KL-D04 | **No** scheduled cross-region Firestore export in-app |
| Restore | Soft-unarchive / migration restore / assignment restore | 🟠 | Archive + assignment restore | KC-0058 | Partial — not full DR |
| Recovery | Recovery Center / disaster restore wizard | ❌ | Roadmap in DATA_PRESERVATION | KC-0058 Phase 1 foundation only | Soft-delete + ledger + integrity exist |

### 1.7 Adjacent capabilities (matrix completeness)

| Module | Feature | Status | Verification | Commit / ticket | Notes |
|--------|---------|--------|--------------|-----------------|-------|
| People | Rukn / Karkun / Muttafiq registries | ✅ | People/hydration verifies; RC1 | KC-0103A | Shared `karkuns` collection + category |
| People | New Karkun request → approve | ✅ | `verify:kc0102.0`, Inbox lifecycle | KC-0102.0 / KC-0123 | Approval hosted Inbox |
| JIH | App registration + monthly reporting track | 🟡 | Compliance / Health App slice | KC-0103C O-11–O-12 | Rules: jihPortal Admin-leaning |
| Guidance | Journey progression | ✅ | `verify:guidance`, contextual guidance | Guidance engine | Shared `executions/guidance` |
| Development assessment | Study checklist | 🟠 | — | KC-0103C O-14 | **localStorage only** |
| Dastoor | Named Dastoor study tracking | ❌ | Zero repo matches | KC-0103C O-20 | Explicit absence (KC-0104) |
| Notifications | In-app / derived reminders | 🟠 | Settings prefs; Rafeeq smart notifications | KL deferred push | Push notifications ❌ |
| Security | Firestore rules + claims fail-closed | ✅ | Auth cert + rules in repo | KC-0100; KL-S01–S03 | Known scope broadenings documented |
| Conversation arch | Intent / secretary / execution pipeline | ✅ | `verify:kc-0131.1`–`.11` (selected) | KC-0131 series | Foundation for Rafeeq/Secretary |

---

## 2. Gap Analysis

Only **genuine** missing or incomplete capabilities — not renames of live work.

### 2.1 Genuine product gaps (❌ or material 🟠)

| Gap | Why genuine | Not the same as |
|-----|-------------|-----------------|
| Durable assignment review persistence | Reviews are in-memory | Connections CRUD (already ✅) |
| Meta Cloud / delivery receipts / retry queue | Stubs only | WhatsApp `wa.me` compose + history (live) |
| Scheduled weekly automation / push dispatch | No cron; `dispatchCampaignEvent` empty | Derived Campaign Automation Engine + WI event module |
| Historical comparison snapshots | No period SoR | Progress Trends list / activity “this week” |
| Forecasting product | Thin unmounted/legacy-input string | Campaign Health four slices |
| Executive Digest (scheduled) | No digest job | Rafeeq Daily Briefing (on-demand) |
| Exception Report export | No report product | Today’s Mission / Top Priority / Inbox queues |
| Recovery Center + scheduled backups | Foundation only | Soft-delete, integrity scanner, migration backup |
| Dastoor tracking | Absent by inventory | Guidance / development checklist |
| Settings Integrations | Placeholders | Settings prefs UX (KC-026) |
| Development assessment durability | localStorage | Visit Annexure SoR |
| MFA / multi-jamaat | Documented future | Two-role auth (live) |

### 2.2 Integrity debt (implemented but not single-truth)

| Debt | Impact | Existing plan |
|------|--------|---------------|
| Dual Weekly Ijtema tracks | Cos/automation/Rafeeq still read legacy | KC-0110 — finish deferred readers; then dual-write off |
| Dual Monthly Baitul Maal tracks | Same | KC-0112 |
| Multiple Health/progress calculators | Conflicting executive numbers | KC-0111 quarantine |
| Assignment vs Connections terminology | Route `/assignments`, UI “Connections” | KC-0108 terminology debt |
| Unmounted Command Center panels | Dead/duplicate UX surface | KC-0103E / KC-0111 |

### 2.3 Verification gaps (🟡 → ✅ blockers)

| Area | Gap |
|------|-----|
| Weekly Ijtema | Wire `verify:kc0107` in package.json; production smoke |
| Baitul Maal | Wire `verify:kc0108` in package.json; production smoke |
| Visits | Dedicated annexure verify + pilot smoke evidence |
| Inbox | Dedicated `verify:kc0123` or expand `verify:kc-028b` coverage claim |
| Voice | Live STT/TTS smoke per environment |
| Executive PDF (KC-029) | Sustained post-deploy Phase 6 evidence |

---

## 3. Updated Architecture Status

| Layer | Status | Canonical doc |
|-------|--------|---------------|
| Product domains (People / Ops / Engagement / Dashboard / Settings) | **Canonical** | [KC-0104](./campaign-operating-system-product-architecture.md) |
| Domain capability evidence | **Complete (prior audits)** | KC-0103A–E |
| Operations dual-track model | **Canonical chosen; migration mid-flight** | [KC-0109](./operations-model-consolidation.md), [KC-0110](./kc-0110-weekly-ijtema-inventory.md), [KC-0112](./kc-0112-monthly-baitul-maal-inventory.md) |
| Campaign Health | **Canonical four-slice facade live; legacy calculators debt** | [KC-0111](./kc-0111-campaign-health-inventory.md) |
| Reliability & persistence | **Standard live (KC-028B write lifecycle)** | [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) |
| Feature impact gate | **Mandatory** | [KC-ARCH-009](./kc-arch-009-feature-impact.md) |
| Auth | **CERTIFIED** | [AUTHENTICATION-CERTIFICATION](../release/AUTHENTICATION-CERTIFICATION.md) |
| Firestore / repositories | **Production provider live** | [firestore.md](./firestore.md), [repository-layer.md](./repository-layer.md) *(docs partially stale)* |
| Digital Rafeeq / Secretary / Conversation | **v2 + secretary live; pipeline foundations certified** | `docs/features/rafeeq-*.md`, KC-0131 gates |
| Communication COS (KC-0090) | **Spec complete; delivery engine future** | [docs/communication](../communication/README.md) |
| Data preservation | **Phase 1 foundation; Recovery Center future** | [DATA_PRESERVATION.md](./DATA_PRESERVATION.md) |
| Pilot known limitations | **Still authoritative for deferred items** | [known-limitations.md](../operations/known-limitations.md) |

**Architecture index note:** `docs/architecture/index.md` still contains RC1-era “all data in-memory / no Firebase” wording that is **obsolete** relative to production Firestore. Prefer KC-0104 + this audit for current truth until index is rewritten.

---

## 4. Roadmap Refresh

### 4.1 Completed

| Workstream | Evidence |
|------------|----------|
| RC1 people / assignments / execution / compliance foundations | Sprint 11–13 |
| Firebase Auth + Rukn OTP claims (fail-closed) | AUTHENTICATION-CERTIFICATION; KC-0100 |
| Firestore repositories + data preservation foundation | M8; KC-0058 |
| Dashboard readiness / coalescing / metrics restoration | KC-0102A–E |
| COS product architecture + domain audits | KC-0103A–E; KC-0104 |
| Weekly Ijtema / Monthly BM event-cycle modules + adapter migration (partial) | KC-0107/0108; KC-0110.2–.6 / KC-0112.x |
| Write lifecycle ACK/retry/refresh | KC-028B |
| Digital Rafeeq v2 + Secretary + voice foundation | Rafeeq commits; KC-027 |
| Conversation architecture foundations | KC-0131.1–.11 verifies |
| Admin Inbox + approval lifecycle hardening | KC-0123; KC-028B |
| WI attendance window automation | KC-028C |
| Executive report redesign (code complete) | KC-029 / KC-029.1 |
| Pilot certification documentation | KC-030 |

### 4.2 In Progress

| Workstream | Notes |
|------------|-------|
| Unified person resolution + live communication merge (KC-0128) | Working tree / gate present; finish verify + Phase 6 |
| Rukn workspace simplification / Review-first Muttafiq (KC-0129) | Same |
| Dual-track reader rewiring (Cos / automation / Rafeeq) | Explicit TODOs in KC-0110 / KC-0112 — **not finished** |
| Legacy Health calculator quarantine | KC-0111 migration tickets outstanding |

### 4.3 Backlog (near-term, evidence-backed)

| Priority | Milestone | Why |
|----------|-----------|-----|
| P0 | **Operations Truth Convergence** — finish WI/BM deferred readers; dual-write off; quarantine legacy Health inputs | Stops conflicting campaign truth |
| P0 | Wire `verify:kc0107` / `verify:kc0108` + visit/Inbox verify coverage | Turns 🟡 → ✅ with objective evidence |
| P1 | Durable assignment review persistence | Closes KC-0103A durability gap (KC-ARCH-001) |
| P1 | Persist development assessment (or document permanent local-only) | Ops honesty |
| P1 | Mount or delete unmounted CC intelligence/insights panels | Reduce dead surface |
| P2 | Settings Integrations decision (build vs remove placeholders) | UX honesty |
| P2 | Voice live STT/TTS per-env certification | KC-027 residual |

### 4.4 Future

| Item | Rationale |
|------|-----------|
| Meta Cloud WhatsApp / SMS / Email delivery engine | Explicitly out of current COS live scope (KC-0104) |
| Scheduled weekly jobs + push notifications | Deferred post-pilot (KL) |
| Historical comparison warehouse + forecasting product | Analytics domain expansion |
| Executive Digest scheduler | Beyond on-demand briefing |
| Exception Report export pack | Beyond queues |
| Recovery Center + scheduled backups | DATA_PRESERVATION Phase 2+ |
| Dastoor named tracking | Product decision required |
| MFA; multi-jamaat tenancy | Auth roadmap |
| Companion Ledger / full KC-0090 COS IA | Spec-only until ADR |
| Continuous voice / barge-in / wake phrase | KC-027 roadmap remainder |

### 4.5 Recommended next milestone

**KC-033 — Operations Truth Convergence (recommended)**

**Goal:** One executive/ops truth for Weekly Ijtema, Monthly Baitul Maal, and Campaign Health — no silent dual numbers.

**In scope**

1. Rewire Cos / automation / Rafeeq / mission strips off legacy IJ/BM readers (KC-0110.7 / KC-0112.7).
2. Quarantine or delete dead/duplicate Health calculators per KC-0111.
3. Turn off dual-write after reader migration + rollback plan.
4. Add package.json verify scripts for WI/BM; record Phase 5/6 evidence.
5. Finish or explicitly shelve in-flight KC-0128 / KC-0129 before starting net-new UX.

**Out of scope:** Meta Cloud, Recovery Center, Dastoor, digest scheduler, COS IA redesign.

**Success criteria:** Campaign Health, Mission, automation intelligence, and Rukn matrix/journey completion vocabulary cite the same event/cycle SoRs; legacy tracks documented as historical-only or removed; verifies green.

---

## 5. Technical Debt Register

| ID | Debt | Severity | Mitigation |
|----|------|----------|------------|
| TD-01 | Dual WI tracks + deferred legacy readers | **High** | KC-0110 finish |
| TD-02 | Dual BM tracks + deferred legacy readers | **High** | KC-0112 finish |
| TD-03 | Legacy annexure “overall health” / progress calculators vs four-slice Health | **High** | KC-0111 quarantine |
| TD-04 | Assignment review in-memory only | **High** | Persist under People/Connections |
| TD-05 | Communication delivery stubs presented as Delivery UI | **Medium** | Label as assisted-send; or implement Meta later |
| TD-06 | Architecture index RC1 “no Firebase” stale text | **Medium** | Rewrite index overview |
| TD-07 | `repository-layer.md` “M8 future / offline no-op” stale | **Medium** | Doc refresh |
| TD-08 | WI/BM verify scripts not in package.json | **Medium** | Wire npm scripts |
| TD-09 | Unmounted Command Center / Mission Control panels | **Medium** | Mount or delete |
| TD-10 | Development assessment localStorage | **Medium** | Persist or declare device-local forever |
| TD-11 | User preferences local-only (no cross-device) | **Low** | Firestore prefs if needed |
| TD-12 | Connections route path vs product noun | **Low** | Terminology debt ticket |
| TD-13 | Shared `executions/guidance` blob concurrency | **Medium** | Already noted in reliability/rules trade-offs |
| TD-14 | Compliance/execution rules broader than UI scope | **Low–Med** | KL-S01/S02 post-pilot tighten |
| TD-15 | Automation still calls legacy Health/IJ/BM helpers | **High** | Same as TD-01–03 |

---

## 6. Obsolete Roadmap Items

Remove or stop treating as open milestones:

| Obsolete item | Why obsolete | Replacement truth |
|---------------|--------------|-------------------|
| “RC1: no Firebase / in-memory only” as current architecture | Production Firestore + Auth live | KC-0104 + firestore.md + this audit |
| Sprint 16 “replace stores with backend rewrite” as near-term | Repositories + Firestore already ship | Keep channel delivery as **future Engagement** only |
| Sprint 16/17 as implied “missing messaging” | Compose, lists, history, bulk already live | Only **delivery engine** remains future |
| KC-0090 Phase C–F as if Communication core absent | Spec ahead of engine; core engagement exists | Treat as **future COS IA + delivery**, not rebuild |
| Standalone `/admin/reports` hub as missing critical feature | Module reports + Dashboard Health cover executive need | Optional later; not a gap blocking truth |
| “Outstanding Performance” as unimplemented module | Capability exists as Top Priority / Collective / PDF performers | Rename/clarify — do not rebuild |
| “Operational Dashboard” as missing | Today’s Mission / Action Center live | — |
| “Weekly Automation” equated to WI module absence | WI event module live; **scheduler** absent | Split nouns in roadmaps |
| “Executive Digest” equated to Rafeeq briefing absence | Briefing exists on-demand | Digest = scheduled product only |
| Dastoor as “regression / lost feature” | Never implemented | Product decision to add or permanently defer |
| Recovery Center as blocking pilot reliability | Soft-delete + integrity + write ACK live | DR UI is future; KL-D04 ops backup remains |
| Local-only repository as production path | Firestore provider production | Local = CI/dev |
| Pre-JWT phone-only role resolution | Superseded by KC-0100 | Historical only |

**Merge duplicate workstreams**

| Merge into | From |
|------------|------|
| **Operations Truth Convergence** | KC-0109 remainder + KC-0110.7 + KC-0111 migration + KC-0112.7 + automation legacy TODOs |
| **Engagement Delivery (Future)** | Sprint 16 delivery stubs + Sprint 17 dispatch + KC-0090 Phase E + Meta Cloud |
| **Reliability DR (Future)** | DATA_PRESERVATION Recovery Center + scheduled backup + KL-D04 automation |
| **Rafeeq Continuity** | Voice live cert + unmounted insights mount/delete + secretary polish (not a second assistant product) |

---

## 7. Deliverables checklist

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Product Capability Matrix | §1 |
| 2 | Gap Analysis | §2 |
| 3 | Updated Architecture Status | §3 |
| 4 | Recommended Next Milestone | §4.5 → **KC-033 Operations Truth Convergence** |
| 5 | Technical Debt Register | §5 |
| 6 | Obsolete Roadmap Items | §6 |

---

## 8. Related evidence index

| Source | Use |
|--------|-----|
| KC-0103A–E | Domain capability inventories |
| KC-0104 | Canonical ownership / terminology |
| KC-0109–0112 | Ops dual-track + Health inventory |
| AUTHENTICATION-CERTIFICATION | Auth ✅ |
| DATA_PRESERVATION | Backup/restore/recovery boundaries |
| known-limitations.md | Pilot deferred features |
| package.json `verify:*` | Contract verification map |
| Recent commits `a3b623f` (KC-028B), Rafeeq/Secretary series, `2b4601a` (KC-030) | Certification anchors |

---

## Phase 5 — Certification (this audit)

| Field | Value |
|-------|-------|
| Certification | **READY** (documentation deliverable) |
| Application change | None |
| Known limitations | Matrix 🟡/🟠/❌ rows are intentional honesty, not audit defects |
