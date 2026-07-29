# Digital Rafeeq MVP

**Status:** Complete (MVP capabilities)  
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
- Fallback → `opsAnswers` when intent is `UNKNOWN`

## Backbone

```text
Utterance → classify → Intent → Secretary → Orchestrator → Confirmation
  → Pipeline → Adapter → Service Contract → Existing KC API → Drawer
```

## Capabilities

| Capability | Status |
|------------|--------|
| Bridge (UI → stack) | Done |
| Search & Discovery | Done |
| Navigation | Done |
| Campaign Insights | Done (MetricsService + assignment/ijtema KPIs) |
| Karkun Information | Done (read-only profile cards) |
| Task Assistant | Done |
| Smart Suggestions | Done (no auto-execute) |
| Safe Actions | Done (Call/WhatsApp links; Visit/Attendance open existing UI) |
| Communication | Done (tel / WhatsApp helpers) |
| Reports | Done (via REPORT insights path) |
| Help | Done |
| Conversation memory / obs / perf | Done (pronouns, session + localStorage, stage traces, turn metrics cache, submit debounce, turn abort) |
| Panel UX polish | Done (confirm note/actions, recent searches, error recovery) |
| Universal Search & Smart Navigation | Done — see [`../features/rafeeq-universal-search.md`](../features/rafeeq-universal-search.md) |
| Campaign Intelligence | Done — see [`../features/rafeeq-campaign-intelligence.md`](../features/rafeeq-campaign-intelligence.md) |
| Safe Actions | Done — see [`../features/rafeeq-safe-actions.md`](../features/rafeeq-safe-actions.md) |
| **Digital Rafeeq v2.0** | Done — see [`../features/rafeeq-v2.md`](../features/rafeeq-v2.md) · gate [`kc-rafeeq-v2-arch009-gate.md`](./kc-rafeeq-v2-arch009-gate.md) |

## Verify

- `npm run verify:kc-rafeeq-mvp-bridge`
- `npm run verify:rafeeq-search`
- `npm run verify:rafeeq-campaign-intelligence`
- `npm run verify:rafeeq-safe-actions`
- `npm run verify:rafeeq-v2`
