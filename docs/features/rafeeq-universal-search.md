# Digital Rafeeq — Universal Search & Smart Navigation

**Status:** Production-ready MVP v1.0  
**Module:** `src/conversation/mvp/`  
**UI:** `src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx`  
**Gate:** [`../architecture/kc-rafeeq-universal-search-arch009-gate.md`](../architecture/kc-rafeeq-universal-search-arch009-gate.md)  
**Verify:** `npm run verify:rafeeq-search`

---

## Purpose

Let a Rukn (or Admin) use natural language in Digital Rafeeq to find people, campaigns, assignments, reports, and modules — and open them instantly — on the existing KC-0131 conversation stack.

## Architecture flow

```text
Utterance
  → Intent (keyword classify)
  → Secretary
  → Execution Orchestrator
  → Confirmation (read-only → AUTO_APPROVED)
  → Execution Pipeline
  → Execution Adapter (universal search / navigation)
  → Service Contract metadata
  → Existing services (peopleStore, campaignService, assignmentStore, ROUTES)
  → VoiceDrawer result cards
```

No layer is skipped. No Firestore writes. No duplicated business rules.

## Supported queries (examples)

| Query | Behaviour |
|-------|-----------|
| Find Aslam / Search Ahmed | Ranked people (+ modules if relevant) |
| Search by mobile number | Mobile exact / digit match |
| Search by Rukn ID / Karkun ID | ID field ranking |
| Open Dashboard / Go to Registry | Smart navigation |
| Open Weekly Ijtema / Open Attendance | Ijtema / attendance routes |
| Show Campaign / Open Reports / Open Settings | Module navigation |
| Find Assigned Karkuns / Show Muttafiq | Assignments / muttafiqeen routes |
| Partial names / light typos | startsWith / contains / fuzzy (≤1–2 edits) |

## Supported entities

| Entity | Source |
|--------|--------|
| Karkun | `getAllKarkuns` + `matchesKarkunRegistrySearch` |
| Muttafiq | `getAllMuttafiqeen` |
| Rukn | `getAllRukns` → `adminRuknDetailPath` |
| Campaign | `getCampaignLibrary` (name/theme rank) |
| Assignment | `searchAssignments` + name/id enrichment |
| Reports / Dashboard / Settings / Attendance / Weekly Ijtema / Modules | `resolveNavigationTarget` + ROUTES |

## Navigation

Targets map to existing `ROUTES` / path helpers only — no duplicate router.

## Ranking

1. Exact  
2. Starts with  
3. Contains  
4. Related (token)  
5. Light fuzzy (spelling)

## Results UI

Conversation panel shows:

- Entity type  
- Name  
- Short description  
- Primary **کھولیں** action  
- Multiple matches  
- No-results copy + dashboard recovery  
- Loading (“تلاش ہو رہی ہے…”)  
- Recent searches + suggested queries  

## Performance

- Short TTL query cache (`searchCache`)  
- Submit debounce in drawer  
- Turn abort token / optional `AbortSignal` on context  
- Avoid duplicate metrics via existing turn cache  

## Future extensions

- Bind `personResolution` when KC-0128 is merged  
- SMS / deeper assignment deep-links  
- Analytics on empty searches  

## Out of scope

AI models · Voice changes · Firestore schema · Write actions · Duplicate repositories
