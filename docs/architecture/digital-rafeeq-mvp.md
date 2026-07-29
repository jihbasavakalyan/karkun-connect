# Digital Rafeeq MVP

**Status:** In progress  
**Gate:** [`kc-rafeeq-mvp-arch009-gate.md`](./kc-rafeeq-mvp-arch009-gate.md)  
**Module:** `src/conversation/mvp/`  
**UI:** `src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx`

---

## Purpose

Deliver working Digital Rafeeq capabilities on the completed KC-0131 conversation architecture without redesigning it or duplicating business logic.

## Defaults

- Reads → existing services/libs via thin adapters
- Writes → confirmation → open existing routes / `tel:` / WhatsApp launch
- NLP → keyword classification + Intent registry (no AI)
- Fallback → `opsAnswers` when intent is UNKNOWN

## Backbone

```text
Utterance → classify → Intent → Secretary → Orchestrator → Confirmation
  → Pipeline → Adapter → Service Contract → Existing KC API → Drawer
```

## Capabilities

| Capability | Status |
|------------|--------|
| Bridge (UI → stack) | Done |
| Search & Discovery | Done (peopleStore + peopleSearch) |
| Navigation | Done (ROUTES map) |
| Campaign Insights | Partial (REPORT → MetricsService reference flow) |
| Karkun Information | Planned |
| Task Assistant | Planned |
| Smart Suggestions | Planned |
| Safe Actions | Planned |
| Communication | Planned |
| Reports | Planned |
| Help | Planned |
| Conversation memory / obs / perf | Session memory seed |
| Panel UX polish | Planned |

## Verify

- `npm run verify:kc-rafeeq-mvp-bridge`
