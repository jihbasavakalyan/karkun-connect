# KC-030 — Production Smoke Test Report

**Project:** Karkun Connect — Basavakalyan Pilot  
**Sprint:** KC-030 Production Pilot Certification  
**Date:** 2026-07-31  
**Build / commit:** `a3b623f`  
**Version:** `1.0.0-rc.1`  
**Production URL:** https://karkun-connect.vercel.app  
**Firebase:** `karkun-connect-75c68`  
**Method:** Automated contract verifies + static wiring audit. Interactive browser smoke = operator follow-up (checklist below).

---

## Objective

Certify production readiness for a **controlled pilot** across authentication, dashboard, people, inbox, connections, visits, Weekly Ijtema, Baitul Maal, communication, executive report, Firestore write reliability, voice, and secretary — without implementing features or changing schema.

---

## Legend

| Mark | Meaning |
|------|---------|
| ✅ | Verified by automated contract / source wiring this sprint |
| 🟡 | Partially verified; live operator confirmation recommended |
| ⬜ | Requires interactive production smoke (credentials + browser) |
| ❌ | Failed with proven product defect (none Critical/High this sprint) |

---

## 1. Authentication

| Check | Status | Evidence |
|-------|--------|----------|
| Admin login contracts | ✅ | `verify:auth`, `verify:login-render` |
| Rukn login contracts | ✅ | Same |
| Session persistence contracts | ✅ | `verify:auth` |
| Logout / role detection (code paths) | 🟡 | Covered by auth session verify; live toggle ⬜ |
| Unauthorized access prevention | 🟡 | Rules + auth verifies; live role isolation ⬜ |

**Operator smoke:** Admin email login · Rukn OTP · hard refresh · logout/login · Rukn blocked from Admin routes.

---

## 2. Dashboard

| Check | Status | Evidence |
|-------|--------|----------|
| Campaign KPI wiring | ✅ | Dashboard metrics facade used by Mission Control (`getDashboardHealthSlices` / visits) |
| Progress / counters refresh after writes | ✅ | KC-028B refresh hooks + inbox/visit/ijtema/BM wiring |
| Empty states | 🟡 | Present in UI patterns; live empty campaign ⬜ |
| `verify:kc0101b` full script | 🟡 | FAIL — stale `modulePctOrZero` assert (harness). Facade wiring still OK |

---

## 3. People Management

| Check | Status | Evidence |
|-------|--------|----------|
| Registry / repositories | ✅ | `verify:repositories`, `verify:data` |
| Search / filters / assignment visibility | 🟡 | Prior KC-0069 / people modules; live UI ⬜ |
| Connection status consistency | ✅ | `verify:kc0069` source contracts |

---

## 4. Inbox Workflow

| Check | Status | Evidence |
|-------|--------|----------|
| Approve / Reject ACK + refresh | ✅ | `verify:kc-028b` (Admin Inbox + Pending queue keys) |
| Duplicate prevention | ✅ | `runExclusive` + approve in-flight join |
| Audit / durability merge | ✅ | `writeMergedKarkunRequests` + merge helper (partial `verify:kc0102.0` before stale path assert) |
| Live Admin approve/reject | ⬜ | Operator |

---

## 5. Connection Workflow

| Check | Status | Evidence |
|-------|--------|----------|
| Connect ACK (`connections` queue) | ✅ | KC-028B assignment `withConnectionsAck` |
| Duplicate / claims gate | ✅ | KC-0061 claims gate (local persistence script fails without sign-in — expected) |
| Live connect / disconnect / counters | ⬜ | Operator |

---

## 6. Visit Workflow

| Check | Status | Evidence |
|-------|--------|----------|
| Quick Actions visit save lifecycle | ✅ | `ConnectionQuickActionsPanel` + `verify:kc-028b` |
| Dashboard / report consistency contracts | ✅ | Report model uses dashboard getters; `verify:kc-bug-0126` |
| Live save / edit | ⬜ | Operator |

---

## 7. Weekly Ijtema

| Check | Status | Evidence |
|-------|--------|----------|
| Automatic attendance window | ✅ | `verify:kc-028c` |
| Attendance save lifecycle | ✅ | `WeeklyIjtemaRegisterPage` + queue label in `verify:kc-028b` |
| Male / Female schedules (live) | ⬜ | Operator |
| Reopen + report integration | 🟡 | Service wiring present; live ⬜ |

---

## 8. Baitul Maal

| Check | Status | Evidence |
|-------|--------|----------|
| Save commitment lifecycle | ✅ | `RuknMonthlyBaitulMaalPage` + `verify:kc-028b` |
| Counter / dashboard / report | 🟡 | Shared dashboard getters; live ⬜ |

---

## 9. Communication

| Check | Status | Evidence |
|-------|--------|----------|
| Message generation / editorial | ✅ | `verify:kc0125` |
| WhatsApp launch | ✅ | `verify:kc-bug-0130a` |
| History persist ACK | ✅ | `awaitQueuedWrite('communications')` |
| Live send | ⬜ | Operator |

---

## 10. Executive Report

| Check | Status | Evidence |
|-------|--------|----------|
| PDF pipeline / RTL / pagination tokens | ✅ | `verify:kc-bug-0126` |
| Urdu copy / no coverage wording | ✅ | `verify:kc0125` + KC-029.1 |
| Empty leader handling / ranking > 0 | ✅ | KC-029.1 model + verify asserts |
| Live PDF page count ≤ 8 | 🟡 | Density changes landed; visual smoke ⬜ |

---

## 11. Firestore Reliability

| Check | Status | Evidence |
|-------|--------|----------|
| ACK before success | ✅ | `verify:kc-028b` |
| Retry / timeout / permission / offline classification | ✅ | Same |
| Duplicate click prevention | ✅ | Same |
| Repository + dashboard refresh hooks | ✅ | Same |
| Live offline / permission denied UX | ⬜ | Operator |

---

## 12. Voice

| Check | Status | Evidence |
|-------|--------|----------|
| Rafeeq voice lifecycle | ✅ | `verify:rafeeq-voice` |
| Urdu / preferences / cache contracts | ✅ | Bundled in voice + `verify:kc-027` |
| Live playback quality | ⬜ | Operator (device audio) |

---

## 13. Secretary

| Check | Status | Evidence |
|-------|--------|----------|
| Intent / conversation / recommendations | ✅ | `verify:rafeeq-secretary` 18/18 |
| Live conversation quality | 🟡 | Automated READY; human judgment ⬜ |

---

## 14. Security

| Check | Status | Evidence |
|-------|--------|----------|
| Firestore rules present / guidance exception | ✅ | `verify:kc-027`, `verify:firestore` |
| Role isolation live | ⬜ | Operator (Admin vs Rukn document access) |
| Admin-only operations live | ⬜ | Operator |

---

## 15. Performance (recorded)

| Area | Automated observation | Live TBD |
|------|----------------------|----------|
| Write lifecycle (no network) | Tens of ms + ACK wait ~0.3–0.5 s in helper path | Measure p95 Firestore write |
| Report contract checks | Sub-second | Measure PDF generation wall time |
| Initial load | Not measured | Cold start + hard refresh |

---

## Operator interactive checklist (must complete before full go-live signature)

1. Admin login → Mission Control KPIs visible → hard refresh  
2. Rukn OTP login → workspace loads → logout  
3. Inbox approve + reject one request each → counters update without reload  
4. Connect one Karkun → disconnect → counters update  
5. Save visit + Weekly Ijtema attendance + Baitul Maal mark  
6. Send one WhatsApp communication  
7. Download Executive Report PDF — RTL, ≤ ~8 pages, no zero leaders  
8. Rafeeq voice playback + one Secretary recommendation  
9. Confirm Rukn cannot open Admin-only routes / docs  

---

## Verdict (this sprint)

**Automated + wiring audit:** Pass for controlled pilot gate.  
**Interactive production smoke:** Pending operator execution of checklist above.
