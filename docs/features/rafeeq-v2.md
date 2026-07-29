# Digital Rafeeq v2.0 — Complete Operational Companion

**Status:** Implemented (product layer on certified KC-0131)  
**Gate:** [`../architecture/kc-rafeeq-v2-arch009-gate.md`](../architecture/kc-rafeeq-v2-arch009-gate.md)  
**Module:** `src/conversation/mvp/v2/`  
**Bridge:** `src/conversation/mvp/runRafeeqTurn.ts`  
**UI:** `src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx`

---

## Architecture

KC-0131 architecture is reused without redesign:

```text
Conversation
  → Intent Engine (classifyMvp + Intent foundation)
  → Secretary
  → Execution Orchestrator
  → Confirmation Orchestrator
  → Execution Pipeline
  → Execution Adapter / Service Contracts
  → Existing KC Services (metrics, Priority Intelligence, follow-ups, ROUTES, activity log, …)
  → Voice Drawer presentation
```

v2 modules are **product composition** under `mvp/v2/` — they never invent metrics, never rewrite Campaign/Assignment engines, and never write Firestore.

---

## Capabilities (Modules 1–20)

| # | Module | Entry utterances (examples) | Primary reuse |
|---|--------|----------------------------|---------------|
| 1 | Proactive Rafeeq | Good morning, What's urgent | Metrics + Priority Intelligence |
| 2 | Daily Briefing | Daily briefing | DashboardMetrics + campaign + follow-ups |
| 3 | Explainability | Why?, Explain more | Work-queue / recommendation reasons with source fields |
| 4 | Smart Work Queue | Show work queue | `runPriorityEngine` + `buildWorkQueue` |
| 5 | Personal Dashboard | Personal dashboard | Visit/assignment/campaign metrics |
| 6 | Advanced Conversation | Call him, What about attendance? | Session memory + pronouns + clarify |
| 7 | Recommendations | Recommend who to visit first | Deterministic rules + Priority Intelligence |
| 8 | Smart Notifications | Notifications | Session dismiss/remind later (ephemeral) |
| 9 | Timeline | Timeline, Recent activity | `activityLogStore` + visit period counts |
| 10 | Conversation History | Conversation history | Ephemeral session (DRDS: not SoR) |
| 11 | Smart Quick Actions | (attached to responses) | Last person + ROUTES |
| 12 | Entity Cards | Show campaign card | Universal search + metrics cards |
| 13 | Operational Insights | Operational insights | `deriveCampaignInsights` |
| 14 | Guided Workflow | Guided workflow | Find → Profile → Assignment → Call → WA → Reminder |
| 15 | Contextual Suggestions | (auto after turns) | Intent + memory aware chips |
| 16 | Better Search | Find … | Alias expand + recent/frequent boost on `searchUniversal` |
| 17 | Voice Ready | Voice ready | Interfaces only; TTS reuse; no new STT |
| 18 | Accessibility | (drawer labels/live regions) | `RAFEEQ_A11Y` |
| 19 | Performance | (memo/cache) | Turn metrics cache, search cache, compose memo |
| 20 | UX Polish | (transitions/empty/error) | `RAFEEQ_UX` |

---

## Conversation examples

```text
Rukn: Daily briefing
Rafeeq: صبح بخیر + Today’s Priorities / Visits / Follow-ups / Attendance / Campaign / …
        [روابط] [ہفتہ وار اجتماع] …

Rukn: Show work queue
Rafeeq: [P1] Overdue visits — وجہ: N pending …
        [کھولیں] [فوری عمل]

Rukn: Why?
Rafeeq: کیوں؟
        • Assigned visits still pending (source: getDashboardVisitMetrics.pending)

Rukn: Find Ahmed → Call him → Why? → Open Assignment
Rafeeq: Continuous session memory + safe-action confirmation for Call
```

---

## Decision rules

1. **Never invent numbers** — only existing service fields.  
2. **Explain with sources** — every recommendation/work-queue item carries `ExplainReason.sourceField`.  
3. **No hidden scoring** for “why” UX (`noHiddenScoring: true`); search ranking remains the existing `rankMatch` score and is disclosed when shown on entity cards.  
4. **Priority order (work queue fallback):** visits → follow-ups → Weekly Ijtema → registration → Baitul Maal → remaining campaign. When Priority Intelligence is available, its contexts map into that order.  
5. **Writes:** none from v2 modules. Safe actions stay confirmation-gated and open existing UI / `tel:` / WhatsApp.  
6. **History:** session-ephemeral only.

---

## Supported entities

Karkun · Muttafiq · Rukn · Campaign · Assignment · Attendance · Weekly Ijtema · Modules/Dashboards (via search & navigation)

## Supported actions

Read-only compose (briefing, queue, timeline, insights, cards) · Navigation via ROUTES · Safe Call / WhatsApp / Reminder (existing) · Dismiss / Remind later (session notifications) · Contextual suggestion chips

---

## Limitations

- Keyword NLU (no AI / ML).  
- Proactive is on-demand / utterance-driven (no separate push scheduler).  
- Conversation history is not durable SoR.  
- Voice module exposes interfaces; STT/TTS remain in existing voice feature code.  
- Priority Intelligence / stores must be warm for richest queue items; metrics fallback always available.

---

## Future roadmap

- Optional durable history with explicit product + privacy decision.  
- Deeper personResolution binding for unique-person binds.  
- Richer guided multi-step Secretary sequences.  
- Role-policy fine-tuning for Admin vs Rukn proactive caps (DRDS OQ-003).

---

## Verify

```bash
npm run verify:rafeeq-v2
npm run verify:kc-rafeeq-mvp-bridge
npm run verify:rafeeq-search
npm run verify:rafeeq-campaign-intelligence
npm run verify:rafeeq-safe-actions
```
