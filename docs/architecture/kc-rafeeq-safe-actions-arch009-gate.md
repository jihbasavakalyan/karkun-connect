# Digital Rafeeq — Safe Actions — KC-ARCH-009 Gate

**Ticket:** Rafeeq Safe Actions MVP v1.3  
**Type:** Enhancement (first conversational execution capability)  
**Standards:** DRDS v1.0 · KC-0131.1–.11 · KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-30  

---

## Phase 0 — Impact

Enable Rukn/Admin to invoke **existing** KC actions from Rafeeq (tel / WhatsApp links, navigation, reminder placeholder UI). No Firestore writes. No assignment/attendance/campaign mutations.

| Area | Impact? | Notes |
|------|---------|-------|
| mvp safe handlers + classify | Y | Confirm/Cancel, reminder, compound open |
| VoiceDrawer | Y | Confirm/Cancel + success cards |
| Contact link helpers | Invoke only | |
| Firestore / repos | N | |

---

## Phase 1 — Risk

| Risk | Level | Mitigation |
|------|-------|------------|
| Accidental communication | HIGH | Confirmation Orchestrator + Confirm/Cancel UI before launch |
| Reminder invents new system | HIGH | Route to existing communication / my-karkun placeholder only |
| Destructive ops | STOP | Never wire delete/assignment/attendance writes |

---

## Phase 2 — Plan

1. Safe-actions module (classify, pending session, handlers)  
2. Confirm/Cancel in drawer  
3. Result cards + error alternatives  
4. `verify:rafeeq-safe-actions` + feature doc  

---

## Phase 3 — Verification

`npm run verify:rafeeq-safe-actions` · prior rafeeq verifies · typecheck  

---

## Go / No-Go

Architecture complete. Existing launch helpers + routes sufficient. **GO**
