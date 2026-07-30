# KC-028C — KC-ARCH-009 Gate (Automatic Weekly Ijtema Attendance Window)

**Classification:** New Feature (automation on existing Weekly Ijtema)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-0107 canonical track  
**Scope:** Configurable gender-scoped attendance windows (Women Sat / Men Sun), client-side ensure open/close, Rukn dashboard open card, Digital Rafeeq guidance, in-app notifications + AutomationTrigger hooks, Admin reopen with audit. Legacy `ijtemaAttendance*` track untouched. No push/WhatsApp dispatch. No Cloud Functions.

## Phase 0 — Root cause & impact

**Request type:** New Feature  

**Problem (proven):**  
Canonical Weekly Ijtema requires Administrator to create and open each meeting. There is no schedule config, no gender audience on events, no same-day auto close, no reopen reason/duration audit, and no window-open dashboard / Rafeeq / notify path.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Types / lifecycle | Y | `audienceGender`, auto flags, reopen audit on event |
| Services | Y | Ensure engine; gender-aware current event; reopen API |
| Stores / repos / Firestore | Y | New fields on existing `weeklyIjtemaEvent_*` docs |
| Bootstrap | Y (deferred) | Ensure after hydrate — not critical path |
| Dashboard / Rukn home | Y | Attendance is Open card + progress |
| Digital Rafeeq | Y | Proactive Urdu when window open / incomplete |
| Notifications | Y | In-app records + AutomationTrigger hooks (stub dispatch) |
| Admin WI page | Y | Reopen modal; audience; schedule note |
| Auth | N | — |
| Campaign Health math | N | Still Present÷Assigned (gender-scoped current) |
| Legacy ijtemaAttendance | N | Out of scope |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Event uniqueness (KC-0113.3) | HIGH | Key becomes `meetingDate + audienceGender` |
| Concurrent ensure creates | HIGH | Get-or-create before create |
| Dashboard / Health current event | MEDIUM | Gender-aware `getCurrentWeeklyIjtemaEvent` |
| Deadline semantics | MEDIUM | Auto window same-day 23:59; manual keep +24h |
| Bootstrap | LOW | Deferred only |
| Persistence / rules | LOW | Same Admin event docs |

### HIGH mitigations

1. Uniqueness by `meetingDate + audienceGender`; update presentation dedupe.
2. Ensure looks up by key before create; open existing on conflict.
3. Rollback: revert feature files; legacy events without `audienceGender` remain readable.

## Phase 2 — Implementation plan

1. Configurable schedule (`attendanceWindowSchedule.ts`) — Sat Female / Sun Male, Asia/Karachi, localStorage override.
2. Window engine (`attendanceWindowEngine.ts`) — idempotent ensure open/close + progress helpers.
3. Extend event types + service uniqueness / reopen audit / gender-aware current + KPI.
4. Rukn open card + Rafeeq Urdu + in-app notify + AutomationTrigger.
5. Admin reopen modal (reason + duration).
6. Deferred ensure after hydrate + page mount.
7. `verify:kc-028c` + commit.

**Rollback:** Revert KC-028C files; legacy Open/Closed behaviour restored.

## Phase 3 — Verification

- Unit: Sat→Female open, Sun→Male open, wrong gender not current, auto close, read-only, reopen audit
- UI strings: dashboard card, Rafeeq incomplete lines
- Regression: manual create/close/KPI paths remain valid
- Evidence: `npm run verify:kc-028c` exit 0

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES |
| Software problem? | YES |
| Config/ops only? | NO |
| Bootstrap (deferred)? | YES |
| Auth? | NO |
| Repos/Firestore? | YES — same docs, new fields |
| Dashboard? | YES |
| Race mitigated? | YES |
| Proceed? | **GO** |

---

## Phase 4–6

### Phase 4 — Regression audit

- `npm run verify:kc-028c` exit 0 (Sat Female open, Sun Male open, gender isolation, auto-close, read-only, reopen audit, dashboard/Rafeeq/bootstrap strings)
- Manual create/close paths retained on Admin Weekly Ijtema page
- Legacy `ijtemaAttendance*` track untouched
- Deferred ensure only (not on critical hydrate path)

### Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

- Notifications are in-app + AutomationTrigger hooks; channel push/WhatsApp dispatch remains stubbed (existing Sprint 17 reservation)
- Auto open/close runs on client ensure after hydrate / page mount (no Cloud Scheduler)

### Phase 6 — Post-deploy

Pending production deploy + verification.
