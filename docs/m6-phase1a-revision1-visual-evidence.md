# M6 Phase 1A Revision 1 — Concept D.1 Home Experience Refinement

## Design direction

**Presentation layer only** — tighter hierarchy, compact hero (~50% height reduction), workspace above the fold, flowing sections instead of cards.

Target first viewport: **30% identity / 70% workspace**.

---

## Before → After (summary)

| Issue | Revision 1 response |
|-------|---------------------|
| Hero too tall, branding dominates | Compact editorial hero (~160–180px desktop); meta + pulse side-by-side on admin |
| Today's Work below the fold | Reduced gaps: hero→priority→workspace; priority strip mt-3, workspace mt-4 |
| Priority strip decorative | High-contrast strip with "What should I do first?" label + single CTA |
| Too many boxed sections | Campaign context: divider-only panel; people rows: left-accent not card |
| Card-heavy Today's Work | Flowing sections with dividers; reordered per spec |
| Rukn people list too far down | People section mt-4; compact rows; featured = border accent |
| Excessive whitespace | Tighter block, timeline, and list spacing throughout `cd-*` system |

---

## Administrator Home

### Layout (unchanged structure, refined density)

```
[ COMPACT HERO — identity + pulse inline ]
[ PRIORITY STRIP — "What should I do first?" ]
[ TODAY'S WORK (flowing)  |  CAMPAIGN INFO (muted dividers) ]
```

### Today's Work section order

1. Recommended actions
2. Critical follow-ups
3. Pending connections
4. Today's schedule
5. Quick access

### 5-second test

- Which campaign? → Hero headline + name
- Campaign status? → Meta + Campaign Pulse
- What first? → Priority strip
- Where to start? → Today's Work visible without scroll (1280×800)

---

## Rukn Home

### Layout

```
[ COMPACT HERO — focus inline ]
[ WHO NEEDS YOU TODAY — compact rows, featured accent ]
[ SCHEDULE | JOURNEY | ACTIVITY ]
```

### 5-second test

- Who? → First person row immediately below hero
- Why? → Health dot + label
- What? → One-line guidance
- Act? → Call / WhatsApp / Visit / Schedule on row

---

## Screenshot checklist

Capture at `npm run preview` (or `npm run dev`):

| # | Viewport | Route | Before | After |
|---|----------|-------|--------|-------|
| 1 | 1280×800 | `/admin` | `admin-desktop-before.png` | `admin-desktop-after.png` |
| 2 | 390×844 | `/admin` | `admin-mobile-before.png` | `admin-mobile-after.png` |
| 3 | 1280×800 | `/rukn` | `rukn-desktop-before.png` | `rukn-desktop-after.png` |
| 4 | 390×844 | `/rukn` | `rukn-mobile-before.png` | `rukn-mobile-after.png` |

All files in `docs/m6-phase1a-revision1-evidence/`. Before baseline: Concept D commit `9bd586f`.

---

## Files modified (Revision 1)

- `src/components/home/AdminHomeHero.tsx` — compact grid layout
- `src/components/home/RuknHomeHero.tsx` — compact meta + pulse row
- `src/components/home/AdminPriorityStrip.tsx` — priority label
- `src/components/home/AdminTodaysWorkPanel.tsx` — section reorder, flowing layout
- `src/components/home/AdminCampaignContextPanel.tsx` — lighter context panel
- `src/components/home/RuknPeopleRows.tsx` — denser people list
- `src/index.css` — `cd-*` spacing, typography, panel refinements
