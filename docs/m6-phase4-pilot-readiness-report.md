# M6.4 — Pilot Readiness Review & Product Acceptance Report

**Date:** July 2026  
**Reviewer role:** Product Owner walkthrough (Administrator + Rukn)  
**Scope:** Presentation and UX friction only — no feature, engine, or architecture changes  
**Verdict:** **Accepted for pilot** with documented follow-ups

---

## Executive summary

Karkun Connect is ready for a controlled Basavakalyan pilot. A first-time Administrator can manage campaign operations without formal training if they follow the Help page workflow. A first-time Rukn can understand daily work within five seconds when connections exist.

Six small UX refinements were applied during this review to remove discovered friction. No business logic was changed.

---

## Part 1 — Administrator walkthrough

| Step | Why am I here? | Main task | Primary action obvious? | Without instructions? | Unnecessary? |
|------|----------------|-----------|---------------------------|----------------------|--------------|
| **Login** | Enter the app | Sign in | Yes — Login button | Needs pilot credentials (now in Help) | Demo panel DEV-only is fine |
| **Home** | Start the day | See priority + work | Yes — priority strip + Today's Work | Yes | Campaign context is supporting, not competing |
| **Campaign** | Confirm campaign | Review / create | Yes — Create Campaign | Yes | — |
| **Rukn** | Manage Rukn people | Add/edit Rukn | Yes — Add Rukn | Yes | "Connections" tab name overlaps sidebar |
| **Karkun** | Manage Karkun people | Search, connect, edit | Yes — filters + table | Yes (global search now wired) | Filter bar is dense but purposeful |
| **Connections** | Link Rukn ↔ Karkun | Connect | Yes — Connect per row | Yes | Two view names similar |
| **Execution** | Act on visits | Open journey / continue | Yes — row CTAs | Yes | Reports live here, not Lists |
| **Follow-up** | Close loops | Mark complete | Yes | Yes | — |
| **Compliance** | Attendance / portals | Mark status | Yes | Yes | — |
| **Communication** | Message people | Templates / send | Moderate | Needs Help path for broadcast | Broadcast tab empty until recipients chosen — now explained |
| **Reports** | Review submissions | Execution → Reports | Yes (with Help) | Maybe without Help | — |
| **Settings** | Pilot info / danger zone | Read / reset data | Yes | Yes | Mock auth disclosure appropriate |

---

## Part 2 — Rukn walkthrough

| Step | Why am I here? | Main task | Primary action obvious? | Without instructions? | Unnecessary? |
|------|----------------|-----------|---------------------------|----------------------|--------------|
| **Login** | Enter portal | Sign in | Yes | Needs pilot credentials | — |
| **Home** | Daily work | See who needs you | Yes — people rows | Yes when connected | Urdu headline is identity, English focus below |
| **Who needs you** | Prioritize people | Call / visit | Yes — row actions | Yes | — |
| **Connected** | Manage relationships | Guide each Karkun | Yes | Yes | — |
| **Open Karkun** | Deep work | Visit + journey | Yes — name link | Yes | Long page on mobile |
| **Call / WhatsApp** | Contact | OS handlers | Yes | Yes | WhatsApp: direct on home, composer on journey |
| **Visit** | Record meeting | Save Visit | Yes (helper text added) | Yes with Record vs Save note | — |
| **Journey** | Track progress | View stages | Yes | Yes | Stage "Connected" vs nav "Connected" — glossary in Help |
| **Finish** | Confirm | Return to Connected | Yes | Yes | — |
| **Record tab** | History | View visits / follow-ups | Moderate | Yes after copy fix | Renamed "Your Progress" |

---

## Part 3 — Five-second test

### Administrator Home — **Pass**

| Question | Answer location |
|----------|-----------------|
| Campaign status? | Hero meta + Campaign Pulse |
| Today's priority? | Priority strip ("What should I do first?") |
| Where to begin? | Priority CTA + Today's Work (above fold) |
| What needs attention? | Recommended actions + critical follow-ups |

### Rukn Home — **Pass** (with connections)

| Question | Answer location |
|----------|-----------------|
| Who needs attention? | "Who needs you today" + first featured row |
| Why? | Health dot + humanized message |
| What to do? | One-line guidance per person |
| How to start? | Call / WhatsApp / Record Visit on same row |

**Note:** Empty-state Rukn sees connect CTA immediately — also passes.

---

## Part 4 — Click analysis

| Workflow | Clicks | Assessment |
|----------|--------|------------|
| Login → Home | 2 | Optimal |
| Home → priority task | 2 | Optimal |
| Connect Karkun (admin) | 4 | Acceptable |
| Connect Karkun (Rukn) | 4 | Acceptable |
| Record visit (Rukn) | 3–4 | Acceptable |
| Mark follow-up complete | 2 | Optimal |
| Global search → Karkun | 2 | **Fixed** (was broken) |
| Broadcast message | 4+ | Acceptable — requires Lists or bulk select |
| Campaign setup launch | 8+ | Acceptable for infrequent task |

**Recommendation applied:** Wire admin top-bar search to Karkun page filter.

---

## Part 5 — Terminology review

| Term | Status | Notes |
|------|--------|-------|
| Rukn | Consistent | — |
| Karkun | Consistent | "Karkunan" only in setup wizard |
| Connection | Consistent | Canonical term in `connectionLabels.ts` |
| Connected | Consistent | Nav + status + journey stage — glossary added to Help |
| Replace | Consistent | Rukn relationship actions |
| Release | Consistent | Distinct from admin "Disconnect" — documented in Help |
| Journey | Consistent | Connection Journey in error states |
| Visit | Consistent | Record Visit vs Save Visit — helper on journey page |
| Campaign Pulse | Consistent | Admin home only — appropriate |

**Remaining drift (deferred):** Admin uses "Disconnect"; Rukn uses "Release" — intentional role split, documented.

---

## Part 6 — Information hierarchy

Module pages follow **PageHeader → primary content → supporting sections**. Home pages use Concept D hierarchy (identity compact, work dominant). No page has competing primary focal points after Phase 1A Revision 1.

---

## Part 7 — Mobile review (390×844)

| Area | Status |
|------|--------|
| Touch targets | Pass — min-h-9/11 on actions |
| Scroll length | Acceptable — journey page is longest |
| Button placement | Pass — bottom nav + FAB clear |
| FAB | Pass — positioned above nav |
| Tables | Pass — mobile card fallbacks on people tables |
| Forms | Pass — full-width inputs |
| Spacing | Pass — Phase 3 ds-* rhythm |

---

## Part 8 — Accessibility review

| Area | Status |
|------|--------|
| Contrast | Pass — ds-* tokens |
| Focus indicators | Pass — buttonBase focus rings |
| Heading order | Pass — PageHeader h1, section h2 |
| Icon clarity | Acceptable — emoji icons used consistently |
| Button labels | Pass — text labels on all CTAs |
| Empty states | Pass — ds-empty with copy |
| Loading states | Partial — Rukn Home skeleton only; acceptable for pilot |

---

## Part 9 — Pilot data review

| Check | Status |
|-------|--------|
| Realistic names | Pass — production seed data |
| Realistic journeys | Pass — guidance engine driven |
| Realistic follow-ups | Pass |
| Balanced dashboards | Pass |
| No lorem ipsum | Pass |
| No placeholder dummy values | Pass |
| Mock auth disclosed | Pass — Settings + Help |

---

## Part 10 — Strengths

1. **Home experiences** — Admin and Rukn homes answer the five-second test
2. **Unified design system** — Module pages feel like one product (Phase 3)
3. **Connection vocabulary** — Largely standardized via `connectionLabels.ts`
4. **Empty states** — Human, calm copy throughout
5. **Mobile-native contact** — Call and WhatsApp use OS handlers
6. **Honest pilot disclosure** — Mock auth and RC version visible
7. **Help page** — Now covers full admin + Rukn workflows

---

## Weaknesses

1. **Campaign setup wizard** — Add/Import removed (were non-functional); selection-only flow
2. **Communication broadcast** — Requires navigating to Lists or bulk actions first
3. **Journey page density** — Many sections on mobile
4. **WhatsApp inconsistency** — Direct link vs in-app composer by context
5. **Loading skeletons** — Only on Rukn Home

---

## Prioritized action list

### Critical — none

No blockers for pilot.

### High — fixed in this milestone

| Issue | Fix |
|-------|-----|
| Global search not applying on Karkun page | Wire `location.state.searchQuery` to filter |
| Help incomplete | Expanded workflow + terminology glossary |
| Campaign setup dead buttons | Removed; added guidance to use Rukn/Karkun modules |
| Broadcast tab appears broken | Added links and instructions |
| Record vs Save Visit confusion | Helper text on journey page |
| Campaign Record terminology | "Connected Karkuns" back link; "Your Progress" |

### Medium — deferred post-pilot

| Issue | Recommendation |
|-------|----------------|
| Admin Disconnect vs Rukn Release wording | Unify in M6.5 brand/voice guide |
| WhatsApp composer consistency | Single behavior policy |
| Rukn journey page scroll length | Collapsible sections in M6.5 |
| More loading skeletons | Add per-module as needed |

### Low — deferred

| Issue | Recommendation |
|-------|----------------|
| Emoji in list broadcast buttons | Brand icon set in M6.5 |
| Bulk Connect (V2) disabled | Feature milestone |
| User preferences (V2) | Feature milestone |
| Production login credential helper on login page | Security review first |

---

## Fixes implemented (this milestone)

1. `KarkunanPage.tsx` — global search wiring
2. `HelpPage.tsx` — complete workflows + terminology
3. `CampaignRecordPage.tsx` — copy alignment
4. `StepRukn.tsx` / `StepKarkunan.tsx` — remove dead buttons, add guidance
5. `BroadcastComposerPanel.tsx` — recipient selection instructions
6. `ConnectionJourneyPage.tsx` — Record vs Save Visit helper

---

## Intentionally deferred until after pilot

- M6.5 — Design System & Brand Identity
- M6.8 — Production Data Migration
- M7 — Firebase Authentication
- M8 — Firestore Backend
- Bulk Connect, user preferences, campaign setup inline add/import

---

## Product Owner acceptance

| Criterion | Met? |
|-----------|------|
| First-time Admin can manage campaign without guidance | **Yes** (with Help) |
| First-time Rukn understands daily work in 5 seconds | **Yes** |
| Ready for live pilot deployment | **Yes** |
| No business logic changes | **Yes** |

**Signed off for pilot deployment** — proceed to M6.5 / M6.8 / M7 / M8 per roadmap.

---

## Verification

```bash
npm run lint
npm run build
npm run verify:rc1
```

## Evidence

- Screenshots: `docs/m6-phase3-evidence/` (34 captures, desktop + mobile)
- This report: `docs/m6-phase4-pilot-readiness-report.md`
