# Digital Rafeeq — Safe Actions

**Status:** Production-ready MVP v1.3  
**Module:** `src/conversation/mvp/safeActions/`  
**Gate:** [`../architecture/kc-rafeeq-safe-actions-arch009-gate.md`](../architecture/kc-rafeeq-safe-actions-arch009-gate.md)  
**Verify:** `npm run verify:rafeeq-safe-actions`

---

## Purpose

Execute **existing** Karkun Connect actions from conversation — WhatsApp / Call links, navigation, and reminder placeholder UI — through the KC-0131 pipeline with confirmation where required.

## Architecture flow

```text
Utterance → Intent → Secretary → Confirmation Orchestrator
  → Execution Pipeline → Adapter metadata → Existing KC helpers/routes
  → VoiceDrawer Confirm/Cancel + result cards
```

No Firestore writes. No assignment / attendance / campaign mutations.

## Supported actions

| Action | Mechanism | Confirmation |
|--------|-----------|--------------|
| Send WhatsApp | `buildWhatsAppLink` | Required |
| Call Karkun | `buildTelLink` | Required |
| Reminder | Existing communication / companion UI | Required |
| Open profile / contact | Profile path | Auto |
| Open assignment | Assignments route (+ profile) | Auto |
| Open attendance / weekly ijtema / campaign / reports | `resolveNavigationTarget` | Auto |

## Confirmation rules

- **Read-only opens** → auto-approved  
- **WhatsApp / Call / Reminder** → pending session + Confirm / Cancel  
- Confirm opens launch route (or reminder workspace)  
- Cancel clears pending action  

## Conversation examples

- Send WhatsApp to Aslam  
- Call Imran  
- Remind me to visit Ahmed tomorrow  
- Open Aslam's assignment  
- Show Ahmed and call him  
- Open campaign and reports  
- Call him / WhatsApp him / Open it (session context)  

## Security model

Never delete records, modify campaign data, update attendance, or change assignments. Reminder opens **existing** UI only — no parallel reminder engine.

## Limitations

- Reminder persistence depends on existing communication module (placeholder route)  
- Confirm with `tel:` / `wa.me` relies on device handlers  
- Keyword classify only (no AI)  

## Out of scope

Firestore writes · Destructive ops · New business calculators
