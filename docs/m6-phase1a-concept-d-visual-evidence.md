# M6 Phase 1A — Concept D Visual Evidence

## Design direction

**Concept D** — Editorial Hero + Workspace split (Admin) + People-first rows (Rukn).

Inspired by Notion (editorial calm), Stripe (priority strip), Slack (people rows), Vercel (hero identity).

---

## Before → After (summary)

| Issue (PO feedback) | Concept D response |
|---------------------|-------------------|
| Campaign banner in middle of page | Full-width **Hero** at top — always first |
| Generic admin template | Campaign gradient, Urdu headline, motivational line, pulse heartbeat |
| Equal cards everywhere | Sections, dividers, lists, timeline — minimal card use |
| No focal point | **Priority strip** — one message, one CTA |
| Statistics compete with work | Admin: 60/40 workspace — work left, context right (muted) |
| Rukn unclear in 5 seconds | People rows dominate; first person featured; inline actions |

---

## Administrator Home

### Desktop layout

```
[ HERO — gradient, Urdu, pulse, motivation ]
[ PRIORITY STRIP — single action ]
[ TODAY'S WORK (wide)  |  CAMPAIGN INFO (narrow, muted) ]
```

### Mobile layout

```
[ HERO ]
[ PRIORITY STRIP ]
[ TODAY'S WORK — full width ]
[ CAMPAIGN INFO — full width, lighter ]
```

### Routes

- `/admin` (Home)

### Key components

- `AdminHomeHero` — identity, not a card
- `CampaignPulseHeartbeat` — trends, no percentages
- `AdminPriorityStrip` — focal CTA
- `AdminTodaysWorkPanel` — lists + timeline
- `AdminCampaignContextPanel` — compact secondary context

---

## Rukn Home

### Desktop / mobile layout

```
[ HERO — greeting, campaign, pulse, today's focus ]
[ WHO NEEDS YOU — elegant rows, featured first person ]
[ SCHEDULE — vertical timeline ]
[ JOURNEY — compact chips ]
[ ACTIVITY — minimal feed ]
[ FAB ]
```

### Routes

- `/rukn` (Home)

### 5-second test

1. **Who?** — First featured person row under hero
2. **Why?** — Health dot + humanized message
3. **What?** — Next action in plain language
4. **Start?** — Call / WhatsApp / Visit / Schedule on same row

---

## Screenshot checklist

Capture at `npm run dev`:

| # | Viewport | Route | What to show |
|---|----------|-------|--------------|
| 1 | 1280×800 | `/admin` | Hero + priority + workspace |
| 2 | 390×844 | `/admin` | Stacked mobile admin home |
| 3 | 1280×800 | `/rukn` | Hero + people rows |
| 4 | 390×844 | `/rukn` | Mobile + FAB |

---

## Files modified (Concept D)

- `src/pages/admin/AdminHomePage.tsx`
- `src/pages/rukn/RuknHomePage.tsx`
- `src/components/home/` — new Concept D components
- `src/lib/homeHeroPresentation.ts`
- `src/index.css` — `cd-*` design system

Legacy `home-*` card components remain in repo but are no longer used on Home pages.
