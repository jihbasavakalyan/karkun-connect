# Milestone M5 — Campaign Guidance Engine

## Architecture Overview

The Campaign Guidance Engine is a **derived + persisted** layer that sits above existing stores (assignments, visits, follow-ups, compliance) without changing business rules.

```
Canonical Stores (unchanged)
  assignments · annexure1 · followups · jih-portal · ijtema · people
        ↓ read
Guidance Engines (derive)
  journeyEngine → nextActionEngine → reminderEngine
                 → relationshipHealthEngine → suggestionEngine
                 → timelineEngine
        ↓ read/write
guidanceStore (persist)
  commitments · timeline events
        ↓
UI: Morning Brief · Connection Journey · Admin Coaching
```

---

## Engine 1 — Journey Engine

**Module:** `src/lib/guidance/journeyEngine.ts`

**Stages (ordered):** Connected → First Meeting → JIH Registration → Orientation → Participation → Regular Contact → Development

**Rule:** Current stage = first incomplete stage. All complete → `development`.

**Completion signals:**
| Stage | Complete when |
|-------|----------------|
| Connected | Active assignment exists |
| First Meeting | Visit recorded (annexure1 / visitStatus) |
| JIH Registration | Registry or portal status Registered |
| Orientation | 2+ visits OR any commitment recorded |
| Participation | Ijtema Present OR programme commitment completed |
| Regular Contact | Visit within 30 days + active rhythm (follow-up/commitment) |
| Development | Active campaign + JIH + regular contact + participation |

---

## Engine 2 — Next Action Engine

**Module:** `src/lib/guidance/nextActionEngine.ts`

**Priority order:**
1. Overdue commitment → honor commitment
2. Visit draft in progress → complete visit notes
3. 21+ days no contact → reconnect
4. 14+ days → call today
5. Pending follow-up → arrange meeting
6. Upcoming commitment → honor commitment
7. Stage-specific default (visit, JIH registration, ijtema invite, etc.)

**Guarantee:** Every connected Karkun always returns exactly one `KarkunNextAction`.

---

## Engine 3 — Commitment Engine

**Module:** `src/services/guidanceService.ts` + `src/stores/guidanceStore.ts`

**Storage key:** `karkun-connect.guidance`

**Lifecycle:**
```
Create (visit submit / manual)
  → pending
  → feeds Next Action + Reminders
Complete / Cancel
  → Next Action recalculates
```

**Fields:** text, targetDate, reminderEnabled, status, source (visit | manual | follow-up)

Visit submit auto-creates commitment when `commitmentMade` is true on the visit form.

---

## Engine 4 — Reminder Engine

**Module:** `src/lib/guidance/reminderEngine.ts`

**Rules (max 2 per Karkun — no spam):**
| Condition | Type | Priority |
|-----------|------|----------|
| 15+ days no contact | Call | 2 (1 if 21+) |
| Commitment due tomorrow | Meeting | 2 |
| Commitment due today | General | 1 |
| Visit done, JIH pending 7+ days | Registration | 2 |

---

## Engine 5 — Relationship Health

**Module:** `src/lib/guidance/relationshipHealthEngine.ts`

| Level | Icon | Triggers |
|-------|------|----------|
| Dormant | ⚫ | 30+ days no contact |
| Urgent | 🔴 | Overdue commitment, 21+ days no contact, JIH stalled 14+ days post-visit |
| Needs Attention | 🟡 | 14+ days no contact, commitment due today, JIH registration pending |
| Healthy | 🟢 | On track |

Always includes human-readable `reasons[]`.

---

## Engine 6 — Morning Brief

**Module:** `src/lib/guidance/morningBriefEngine.ts`  
**UI:** `src/components/guidance/MorningBriefPanel.tsx`  
**Screen:** Rukn Home (`/rukn`)

Replaces statistics-heavy home with: greeting, mission, daily goal, next actions, commitments, recommended calls/visits, recent progress.

---

## Engine 7 — Administrator Coaching

**Module:** `src/lib/guidance/adminCoachingEngine.ts`  
**UI:** `src/components/guidance/AdminCoachingPanel.tsx`  
**Screen:** Admin Dashboard (`/admin`)

Coaching language only — bottlenecks, Rukns needing assistance, overdue commitments. No surveillance wording.

---

## Engine 8 — Journey Timeline

**Module:** `src/lib/guidance/timelineEngine.ts`  
**UI:** `src/components/guidance/JourneyTimeline.tsx`

Derived from: connection date, visit submissions, JIH registration, persisted timeline events (commitments).

---

## Engine 9 — Smart Suggestions

**Module:** `src/lib/guidance/suggestionEngine.ts`  
**UI:** `src/components/guidance/SmartSuggestions.tsx`

Rule-based by stage: home visit, phone call, registration camp, programme invite, family meeting, literature.

---

## Verification

```bash
npm run verify:guidance   # M5 acceptance
npm run verify:rc1        # includes guidance suite
```
