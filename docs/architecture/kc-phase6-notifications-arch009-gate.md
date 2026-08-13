# KC Phase 6 Notifications — KC-ARCH-009 Gate

**Ticket:** BATCH-06B / TASK-050 + TASK-051 + TASK-052  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 3 Occurrence](./kc-phase3-occurrence-foundation-arch009-gate.md) · [Phase 4 Work](./kc-phase4-work-product-data-design.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for actionable notifications, preferences, and Calendar → notification integration

Phase 0–5 of prior post-campaign work are already certified and are **not** re-analysed here.  
Communication surfaces (TASK-046–049) remain frozen and are **not** re-numbered.

TASK-053 (Phase 6 certification) is recorded in [kc-phase6-certification.md](./kc-phase6-certification.md). No Vercel deploy. Do not deploy Firestore rules.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Actionable in-app notifications derived from Occurrence/Calendar/Work; minimum preference control via existing SettingsRepository + per-user preferences; Calendar projection feeds evaluation |
| Not | Rukn/Karkun Inbox, chat/threads, second calendar/event model, generic notification collection, push/WhatsApp dispatch, participation/approval engines, WI/BM dual-write, Vercel deploy |

**STOP checks (this batch):**

| Check | Result |
|-------|--------|
| Frozen model requires a notification inbox collection? | **NO** — derived read model only |
| Admin Inbox used as a generic notification dump? | **NO** — `admin_notification` stays unpopulated |
| Second calendar / event entity required? | **NO** — `buildOccurrenceCalendar` over existing Occurrence |
| New preferences database required? | **NO** — existing `NotificationPreferences` + SettingsRepository per-user docs |
| Rukn / Karkun Inbox required? | **NO** — forbidden |

**Persistence decision (reuse, not a new system):** Notification **evaluation** is derived from Occurrence + Work. Preference **control** reuses `NotificationPreferences` (existing per-user settings model) and persists the notifications slice through SettingsRepository as `settings/notificationPreferences_{userId}` (per-entity, not a shared LWW blob). Appearance / Rafeeq remain in the existing `userPreferencesStore` local cache.

---

## Phase 0 — Root cause & impact

Existing TASK-026 evaluates Occurrence candidates but does not produce actionable deep links, does not consume the Calendar projection, defers Work categories, and does not apply user preference toggles (Settings UI is unused by evaluation). Work SoT now exists (Phase 4). Calendar is a derived Occurrence read (TASK-025).

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Small actionable list on existing Admin Command Center + Rukn Home |
| Pages | Y | `AdminCommandCenter`, `RuknHomePage` — insert only |
| Components | Y | `ActionableNotificationsPanel`, Settings notification row |
| Hooks | Y | `useUserPreferences` persist await for notification toggles |
| Services | Y | Export evaluator; `notificationService` rule registry untouched |
| Repositories | Y | SettingsRepository load/save/resolve per-user notification prefs |
| Firestore | Y | Per-user `settings/notificationPreferences_{uid}` + rules file (not deployed) |
| Authentication | N | |
| Authorization | Y | Own-doc settings rules for signed-in uid |
| Session | N | |
| Bootstrap | Y | On-demand resolve only — no full-collection hydrate |
| Dashboard | Y | Derived list on existing homes; no new dashboard engine |
| Metrics | N | |
| Campaign / automation | N | Existing AutomationTrigger mapping reused, not dispatched |
| Notifications | Y | Derived actionable read model |
| Voice | N | |
| API | N | |
| Caching | Y | Per-user prefs cache; latest flushed at queue execute |
| Persistence | Y | SettingsRepository + existing userPreferences overlay |
| Routing | N | Deep links to existing routes only |
| State | Y | userPreferencesStore notifications slice |
| Background | N | No scheduler invented |
| Performance | N | Bounded derived list |
| Monitoring / logging | Y | Structured persist label for prefs writes |
| Security | Y | Own-doc rules |
| Dependencies | N | |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Admin Inbox | **HIGH** if notifications dumped as `admin_notification` | Do not map into `InboxEngine` |
| Occurrence SoT | **HIGH** if evaluator creates events | Calendar/Occurrence are read-only; no `saveDurable` in notification path |
| Shared settings blob | **HIGH** if all users share one prefs doc | Per-user `notificationPreferences_{uid}` |
| WI/BM dual-write | **HIGH** if touched | Untouched |
| Chat / Inbox routes | **HIGH** if new inbox | No `/rukn/inbox` or `/karkun/inbox` |
| Bootstrap | MEDIUM | On-demand resolve; soft-empty cache |
| Preference UI unused | MEDIUM | Evaluator filters on `inApp` |

---

## Phase 2 — Implementation plan

1. Pure evaluator: Calendar entries (from Occurrence) + Work → actionable items with existing-route deep links.  
2. Preference filter using existing `NotificationPreferences` (+ minimum `workReminders` key).  
3. SettingsRepository per-user persist; userPreferencesStore overlays durable prefs.  
4. Existing-home panels only.  
5. Focused `verify:kc-phase6-notifications` script.

**Rollback:** revert the single commit. No production deploy in this batch.

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit | Evaluator: upcoming/open Occurrence via calendar; pending/overdue Work; preference off suppresses |
| Integration | SettingsRepository local save/load per user; overlay on bind |
| Regression | Phase 3 occurrence-operations still defers Work inside TASK-026 module; InboxEngine unchanged; no new collections |
| Persistence | Per-user settings key/doc; no shared LWW blob |
| Calendar | `buildOccurrenceCalendar` is the evaluation input |
| Browser smoke | UNVERIFIED if credentials unavailable |
| Production | Not deployed |

---

## Go / No-Go

| # | Question | Answer | Impact / Mitigation / Tests |
|---|----------|--------|------------------------------|
| 1 | Root cause proven? | YES | TASK-026 hook + unused prefs + Work now exists — evidence in code |
| 2 | Objective evidence? | YES | Existing modules/types/repos |
| 3 | Software problem? | YES | Missing evaluation/preference wiring |
| 4 | Configuration? | NO | |
| 5 | Operational? | NO | |
| 6 | Bootstrap? | YES | On-demand prefs resolve only; no critical hydrate change |
| 7 | Authentication? | NO | |
| 8 | Authorization? | YES | Own-doc settings rules (file only; not deployed) |
| 9 | Repositories? | YES | SettingsRepository methods; verify script |
| 10 | Firestore? | YES | Per-user settings docs; no new collection |
| 11 | Dashboard? | YES | Insert-only panels; existing widgets unchanged |
| 12 | Persistence? | YES | SettingsRepository + local overlay |
| 13 | Routing? | NO | Existing routes only |
| 14 | Caching? | YES | Per-user map; flush latest at queue execute |
| 15 | Async dependencies? | YES | Prefs resolve + queued write await |
| 16 | Races? | YES | Per-user write labels; latest cache at execute |
| 17 | Production startup? | NO | No deploy |
| 18 | Existing workflows? | YES | Inbox/WhatsApp/WI/BM/Work action panel preserved |

**May implementation start?** YES
