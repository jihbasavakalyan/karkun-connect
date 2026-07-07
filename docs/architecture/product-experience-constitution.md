# Karkun Connect — Product Experience Constitution (PX Constitution)

**Version:** 1.0  
**Status:** Official — Mandatory reading before any future feature, screen, or workflow implementation  
**Scope:** RC1 through Version 2 and beyond  
**Code impact:** Documentation only; no runtime behaviour by itself  

---

## Purpose

This document is the **Product Experience Constitution (PX Constitution)** for Karkun Connect.

It is **not** a sprint specification, UI mockup pack, or component library implementation. It is the master reference governing every future screen, workflow, component, dashboard, automation surface, and interaction in the product.

It sits alongside and must be read together with:

- The **Project Constitution** (Version 1 scope, roles, and campaign mission)
- The **[Workflow Automation Constitution](./workflow-automation-constitution.md)** (event-driven workflow and automation philosophy)
- The **[Architecture Index](./index.md)** (technical structure and data flow)

Whenever a screen, dashboard, workflow, or component is designed or modified, it **must comply with this constitution**.

---

## Governance Rules

1. **Documentation authority** — If product experience guidance conflicts with an ad-hoc design decision, this document wins unless formally amended.
2. **No CRUD drift** — Screens that merely list, edit, or export data without operational purpose violate this constitution.
3. **Action before analytics** — Metrics exist to drive work, not to replace work.
4. **Progressive implementation** — RC1 may not implement every future capability described here; all future work must align with these standards.
5. **Amendment process** — Changes to this constitution require an architecture documentation update and explicit version increment.

---

# 1. Product Vision

## Why Karkun Connect Exists

Karkun Connect exists to **digitally execute, monitor, automate, and review the Karkun Campaign** with minimum manual effort and maximum operational visibility.

The product serves a single local Jamaat running one active campaign. Two login roles operate the system:

| Role | Responsibility |
|------|----------------|
| **Administrator** | Campaign oversight, people masters, assignment control, compliance review, reporting |
| **Rukn** | Field execution on behalf of assigned Karkuns — visits, Annexure-1, follow-up, compliance capture |

**Karkun is a business entity, not a login.** All field work is performed by the Rukn on behalf of assigned Karkuns.

## Management Software vs Campaign Operating System

| Traditional Management Software | Karkun Connect — Campaign Operating System |
|--------------------------------|--------------------------------------------|
| Displays records and forms | Drives the next operational action |
| User decides what to do next | System recommends and routes the next step |
| Status fields edited manually | Status derived from completed actions |
| Dashboards show statistics | Command Centers show today's work |
| Modules are siloed | Workflows chain across modules automatically |
| Success = data entered | Success = campaign execution advanced |

Karkun Connect must **never behave like conventional management software**. It must behave like an operating system for campaign execution — continuously answering:

> **What should this user do next?**

## Foundational Principles

### Execution First

The platform exists to **execute the campaign**, not merely store data. Every screen must advance execution or remove friction from execution. If a screen does not help someone assign, visit, follow up, comply, or review — it does not belong in Version 1.

### Automation First

Each completed action should automatically generate the next logical task whenever applicable. Manual repetition, duplicate entry, and redundant navigation are defects — not acceptable workflow patterns.

### Minimal Cognitive Load

Users should think about the **campaign**, not the **software**. Reduce decisions, fields, clicks, duplicate navigation, and repeated information. Progressive disclosure replaces long forms.

### Single Source of Truth

Every major entity has one authoritative source. UI surfaces **derive** state; they do not invent parallel state. See the Workflow Automation Constitution for entity ownership.

### Action before Analytics

Analytics and KPIs serve operational priority. A metric that cannot lead to an action or a routed screen is incomplete. Dashboards are command centers, not statistic pages.

---

# 2. Design Language

The visual language of Karkun Connect communicates **calm operational authority** — trustworthy, readable, field-ready, and respectful of bilingual (Urdu / English) content.

## Typography

### Font Stack

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `system-ui, 'Segoe UI', Roboto, sans-serif` | All UI text |
| `--font-urdu` | `'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif` *(future formal token)* | Urdu headings, campaign slogans, motivational copy |
| `--font-mono` | `ui-monospace, 'Cascadia Code', monospace` | Assignment numbers, IDs, export references |

System fonts are preferred in RC1 for performance. Urdu display faces may be loaded selectively on screens that require campaign identity emphasis.

### Heading Hierarchy

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| **H1 — Page Title** | `text-2xl` (1.5rem) | `font-semibold` | One per screen; names the operational context |
| **H2 — Section Title** | `text-lg` (1.125rem) | `font-semibold` | Major sections within a page |
| **H3 — Subsection** | `text-base` (1rem) | `font-medium` | Card titles, panel headers |
| **H4 — Label Group** | `text-sm` (0.875rem) | `font-medium` | Form section labels, table group headers |

Page titles must describe **work context**, not database entities alone.

- ✅ *Assignment Management*
- ✅ *Today's Assigned Karkuns*
- ❌ *KarkunRegistryTableView*

### Body Typography

| Style | Size | Color Token | Usage |
|-------|------|-------------|-------|
| **Body** | `text-base` | `--color-text` | Primary readable content |
| **Secondary** | `text-sm` | `--color-secondary` | Supporting descriptions, metadata |
| **Caption** | `text-xs` | `--color-secondary` | Timestamps, badges, helper text |
| **Emphasis** | inherit | `--color-text-heading` | Names, key values within secondary copy |

Line length should not exceed **72 characters** for long-form guidance. Tables and dashboards may exceed this within structured layouts.

### Urdu Typography

Urdu content appears in campaign identity, dashboard hero copy, and motivational messaging.

| Rule | Standard |
|------|----------|
| Direction | `dir="rtl"` on Urdu blocks; mixed pages use isolated RTL containers |
| Alignment | Right-aligned within RTL containers; centered only for hero campaign slogans |
| Size | Urdu hero lines may be one step larger than equivalent English headings |
| Pairing | When bilingual, Urdu primary for campaign voice; English for operational labels |
| Font size floor | Never below `text-sm` for Urdu body; Nastaliq faces need generous line-height (`leading-loose`) |
| Numerals | Operational numbers (dates, counts, mobiles) remain Western Arabic digits |

### English Typography

English is the **operational lingua franca** — navigation, form labels, validation, compliance statuses, and admin tooling. Sentence case for labels; title case only for product name and campaign names.

## Spacing System

Spacing follows a **4px base grid** aligned with Tailwind defaults.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline gaps |
| `space-2` | 8px | Icon-text gaps, compact lists |
| `space-3` | 12px | Form field internal groups |
| `space-4` | 16px | Standard padding, card inner spacing |
| `space-6` | 24px | Section separation within pages |
| `space-8` | 32px | Major layout regions |

### Page Spacing

| Context | Standard |
|---------|----------|
| Page horizontal padding | `px-4` mobile, `px-6` desktop |
| Page vertical rhythm | `space-y-6` between major sections |
| Card padding | `p-4` compact, `p-6` standard |
| Form field gap | `space-y-4` between fields |

## Grid System

| Breakpoint | Min width | Layout |
|------------|-----------|--------|
| **Mobile** | 0 | Single column; bottom-aligned primary actions |
| **Tablet** | 768px (`md`) | Two-column splits for list + detail |
| **Desktop** | 1024px (`lg`) | Sidebar + main; multi-column command centers |
| **Wide** | 1280px (`xl`) | Maximum content width `max-w-7xl` centered |

Command Center grids use **priority-first ordering** — most urgent column or row appears top-left (LTR) or top-right (RTL hero blocks).

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-card` | `0.75rem` (12px) | Cards, modals, panels |
| `rounded-lg` | 8px | Inputs, buttons, dropdowns |
| `rounded-full` | 9999px | Status pills, mobile nav chips |

Avoid sharp corners on interactive surfaces. Avoid excessive rounding that reduces information density on data-heavy admin screens.

## Elevation

Elevation communicates **interactivity and layering**, not decoration.

| Level | Treatment | Usage |
|-------|-----------|-------|
| **Base** | Flat on `--color-surface-muted` background | Page background |
| **Raised** | `--shadow-card` on `--color-surface` | Cards, tables, list items |
| **Hover** | `--shadow-card-hover` | Clickable cards, list rows |
| **Overlay** | Modal backdrop + elevated panel | Dialogs, drawers |
| **Sticky** | Border + subtle shadow | Sticky headers, action bars |

Never stack more than two shadow levels on one screen.

## Shadow System

```css
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
--shadow-card-hover: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
```

Future tokens may add `--shadow-modal` and `--shadow-popover`. Shadows must remain subtle; campaign software must feel calm, not flashy.

## Color Tokens

### Brand and Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#1b4332` | Primary actions, active nav, brand |
| `--color-primary-hover` | `#2d6a4f` | Hover on primary |
| `--color-primary-light` | `#40916c` | Progress, positive accents |
| `--color-primary-muted` | `#d8f3dc` | Active nav background, soft highlights |
| `--color-secondary` | `#64748b` | Secondary text, icons |
| `--color-secondary-light` | `#94a3b8` | Placeholder, disabled copy |
| `--color-surface` | `#ffffff` | Cards, panels, inputs |
| `--color-surface-muted` | `#f8fafc` | Page background |
| `--color-border` | `#e2e8f0` | Dividers, input borders |
| `--color-text` | `#334155` | Body text |
| `--color-text-heading` | `#0f172a` | Headings, emphasis |

### Status Colors

| Status | Background | Text | Usage |
|--------|------------|------|-------|
| **Success / Active / Complete** | `#dcfce7` (green-100) | `#166534` (green-800) | Assigned, paid, present, submitted |
| **Warning / Pending / Due** | `#fef3c7` (amber-100) | `#92400e` (amber-800) | Pending visit, due follow-up |
| **Danger / Error / Absent** | `#fef2f2` (red-50) | `#b91c1c` (red-700) | Validation errors, absent, failed |
| **Neutral / Inactive** | `#f1f5f9` (gray-100) | `#475569` (gray-600) | Unassigned, inactive, not recorded |
| **Info / In Progress** | `#dbeafe` (blue-100) | `#1e40af` (blue-800) | In progress, open visit |

Status must never rely on color alone — always pair with text labels or icons.

### Chart Palette

Charts use a **sequential green palette** aligned with brand, avoiding rainbow defaults.

| Index | Color | Usage |
|-------|-------|-------|
| 1 | `#1b4332` | Primary series |
| 2 | `#40916c` | Secondary series |
| 3 | `#74c69d` | Tertiary |
| 4 | `#b7e4c7` | Quaternary |
| Alert | `#b91c1c` | Risk / decline |
| Neutral | `#94a3b8` | Baseline / comparison |

## Illustration Style

RC1 uses **no decorative illustration**. Visual identity comes from:

- Campaign hero typography (Urdu slogans)
- Operational iconography (Unicode icons in navigation — future: consistent icon set)
- Progress rings and KPI cards

Future illustrations must be **flat, minimal, culturally respectful**, and subservient to data. No cartoon mascots. No stock photography in operational flows.

## Icon System

| Rule | Standard |
|------|----------|
| Style | Outline / simple filled; single stroke weight |
| Size | 16px inline; 20px navigation; 24px hero actions |
| Source | Future: unified icon library; RC1: semantic Unicode with `aria-hidden` |
| Meaning | Icons always paired with text labels except repeated toolbar actions |
| Touch | Minimum 44×44px tap target including padding |

## Responsive Spacing

| Breakpoint | Adjustment |
|------------|------------|
| Mobile | Reduce outer padding; collapse side panels; sticky bottom actions |
| Tablet | Two-column command layouts |
| Desktop | Full sidebar; multi-column KPI grids |

Content never requires horizontal scroll except data tables with deliberate overflow containers.

## Dark Mode Readiness

Dark mode is **not required in RC1** but tokens must be authored for future migration.

| Light Token | Future Dark Equivalent |
|-------------|------------------------|
| `--color-surface` | `#0f172a` |
| `--color-surface-muted` | `#020617` |
| `--color-text` | `#e2e8f0` |
| `--color-text-heading` | `#f8fafc` |
| `--color-border` | `#334155` |

Components must consume tokens — never hard-code `#ffffff` or `#000000` in feature code.

---

# 3. Component Library

Every future component must conform to these standards. Deviations require constitution amendment.

## Buttons

| Variant | Usage | Visual |
|---------|-------|--------|
| **Primary** | Single most important action per context | `--color-primary` fill |
| **Secondary** | Alternative or cancel-safe actions | Outlined / muted |
| **Destructive** | Remove, release, archive | Red outline or fill |
| **Ghost** | Tertiary, inline table actions | Text only |

Rules:

- One primary button per modal or action panel
- Labels are verbs: *Assign*, *Open Annexure-1*, *Submit Visit*
- Full-width primary on mobile for main actions
- Disabled state must explain why (tooltip or inline message), not silently disable

## Cards

Cards are the **atomic unit of operational information**.

| Type | Contents |
|------|----------|
| **KPI Card** | Metric, label, trend optional, deep link |
| **Person Card** | Name, status, next action |
| **Queue Item Card** | Priority, due indicator, single primary action |
| **History Card** | Timeline entry with status transition |

All cards use `--radius-card`, `--shadow-card`, border `border-border`.

## Forms

- Labels above fields; never placeholder-only labels
- Required fields marked; optional fields explicitly say *(optional)*
- Progressive disclosure — show fields only when the current step requires them
- Smart defaults pre-filled from Single Source of Truth
- Inline validation on blur; form-level summary on submit
- Mobile: use native input types (`tel`, `date`, `search`)

## Tables

- Primary admin data surface for People, Assignments, Compliance
- Sticky header on scroll
- Sortable columns where meaningful
- Row actions: one primary inline action; overflow for secondary
- Empty state with next-step guidance, not "No data"
- Bulk actions only when they reduce repetitive work
- Responsive: card list fallback on mobile

## Filters

- Filters must **narrow operational queues**, not recreate SQL query builders
- Preset filters preferred: *Pending*, *Due Today*, *Unassigned*, *Male*, *Female*
- Active filter count visible; one-click clear all
- Deep links from dashboard cards must pre-apply filters (constitution requirement)

## Search

- Global search on list screens; placeholder describes searchable fields
- Assignment search includes ASN numbers
- Debounced input; results count shown
- No search without results guidance

## Dialogs (Modals)

- Title = action + entity name: *Assign Karkun to {Rukn}*
- Primary action right/bottom; cancel always available
- Error displayed inside modal, not alert boxes
- Close on success; navigate if next step exists (see Automation Constitution)
- Focus trapped; ESC closes non-destructive dialogs

## Drawers

Reserved for **secondary detail panels** — profile preview, history timeline, filter panels on mobile. Primary workflows use full pages or modals, not drawers.

## Badges

- Pill shape (`rounded-full`)
- Status text always visible
- Colors from Status Colors table
- Never more than one badge per status dimension per row

## Alerts

| Type | Usage |
|------|-------|
| **Inline alert** | Validation, form errors |
| **Banner alert** | Page-level operational notices |
| **Success banner** | Post-execution confirmation with next action link |

Alerts auto-dismiss only for success; errors persist until resolved.

## Notifications

Future push/email/SMS notifications must follow the Notification Framework (Chapter 12). In-app notifications use a consistent toast pattern: title, body, action link, dismiss.

## Calendars

Future scheduling surfaces use **week-first campaign view** — highlight today, campaign day number, and due visits. Not a generic calendar app.

## Timeline

Assignment history, audit trails, and campaign events use vertical timeline with:

- Timestamp
- Actor
- Status transition
- Reason (replace/remove)

## Charts

- Used sparingly on admin analytics surfaces
- Always titled with operational meaning
- Accessible table fallback required
- No chart without a linked action or filter

## KPIs

- Maximum 8 visible on admin command center without scroll
- Each KPI links to a pre-filtered operational screen
- Label = noun phrase; subtext = why it matters
- KPIs update on store subscription — no manual refresh

## Progress Bars

- Campaign progress = derived execution health, not manual entry
- Show percentage + absolute counts
- Green gradient aligned with brand

## Quick Actions

- Appear in Command Center hero and section headers
- Maximum 4 visible; most common actions only
- Labels describe outcomes: *Assign Karkun*, *Review Pending Compliance*

## Floating Buttons

Reserved for **mobile Rukn primary action** — e.g., *Open Next Visit*. Maximum one FAB per screen. Not used on admin desktop.

---

# 4. Layout Standards

## Administrator Layout

```
┌──────────────────────────────────────────────────────────┐
│ Campaign Status Bar                                       │
├────────────┬─────────────────────────────────────────────┤
│ Sidebar    │ Main Content                                 │
│ Navigation │ ┌─────────────────────────────────────────┐ │
│ (desktop)  │ │ Page Header + Actions                   │ │
│            │ ├─────────────────────────────────────────┤ │
│            │ │ Operational Content                     │ │
│            │ └─────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────┘
```

- Sidebar: fixed `w-64`, scrollable nav, active state `--color-primary-muted`
- Mobile: horizontal scroll nav chips + condensed header
- Main: `max-w-7xl mx-auto` for data pages; full width for command center

## Rukn Layout

- Mobile-first; simplified navigation
- Emphasis on **My Karkuns** and **Available Karkun**
- Campaign status always visible
- Bottom-weighted primary actions on phone

## Mobile / Tablet / Desktop

| Concern | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Top chips / hamburger | Side or top | Fixed sidebar |
| Tables | Card lists | Hybrid | Full tables |
| Modals | Full-screen | Centered | Centered max-w-lg |
| Command Center | Single column stack | 2-column | 3–4 column grid |

## Command Center Layout

Mandatory vertical priority order:

1. Campaign hero (name, day, progress, theme)
2. Next Action panel
3. Today's Schedule / Call Queue
4. Alerts and reminders
5. KPI grid
6. Secondary analytics

## Forms Layout

- Single column on mobile
- Two columns only for short related fields (date + reason)
- Submit bar sticky on mobile

## Review Screens

Administrator review surfaces (execution reports, compliance review) use **summary left, detail right** on desktop; stacked on mobile. Approve/reject or acknowledge actions fixed visible.

## Reports

- Filter bar top
- Export secondary
- Results table primary
- Pre-filtered from KPI deep links

## Analytics

Future-dedicated analytics pages must still route to operational queues. Analytics is never the end destination.

## Empty States

Every empty state answers:

> What should I do to populate this?

Include a primary action linking to the correct creation or assignment flow. Never show a bare "No records found."

## Loading States

- Skeleton loaders matching final layout shape
- No full-page spinners except initial app boot
- Optimistic updates where safe (see Performance Standards)

## Error States

- Plain language; no error codes exposed to users
- Recovery action always offered
- Preserve user input on form errors

## Success States

- Confirm what changed
- Show next action link
- Auto-navigate when the next step is unambiguous (Automation Constitution)

---

# 5. Dashboard Standards

Dashboards are **operational command centers**, not statistic pages.

## Mandatory Information Stack

Every dashboard MUST follow this order:

```text
Campaign Context
        ↓
Today's Work
        ↓
Highest Priority
        ↓
Pending Actions
        ↓
Automation
        ↓
KPIs
        ↓
Performance
        ↓
Analytics
```

## Campaign Context

Always show:

- Active campaign name
- Campaign day (e.g., Day 14 of 40)
- Progress indicator
- Campaign theme / objectives summary

### Today's Work

Schedules, queues, and assigned Karkuns for the current calendar day.

### Highest Priority

The single most urgent item — overdue visit, missed follow-up, blocking compliance gap.

### Pending Actions

Count + deep link for each pending queue: visits, follow-ups, compliance, assignments.

### Automation

Next Action engine output, reminders, call queue — anything the system prepared automatically.

### KPIs

Derived metrics with links. KPIs without actions are incomplete.

### Performance

Trends and comparisons — secondary placement, never above pending work.

### Analytics

Historical views for administrators; never the default landing experience for Rukns.

## Anti-Patterns (Forbidden)

- Dashboard that shows only counts with no links
- Generic charts as the first screen element
- Manual refresh buttons
- Duplicate navigation to the same module
- Static demo data in production surfaces

---

# 6. Information Hierarchy

Every screen must answer these five questions in visual priority order:

| # | Question | UI Expression |
|---|----------|-----------------|
| 1 | **Where am I?** | Page title, breadcrumb, campaign bar, role indicator |
| 2 | **What needs attention?** | Alerts, badges, pending counts, queue highlights |
| 3 | **What should I do next?** | Next Action panel, primary button, guided copy |
| 4 | **What can wait?** | Collapsed sections, secondary tabs, lower KPIs |
| 5 | **What has already been completed?** | History timeline, completed sections, success summaries |

If a screen cannot answer question 3, it is not ready for release.

---

# 7. Workflow Standards

All major workflows must be **progressive** — no dead ends, no manual jumping between unrelated modules.

## Master Campaign Workflow

```text
Campaign
    ↓
Assignment
    ↓
Visit
    ↓
Annexure-1
    ↓
Commitment
    ↓
Follow-up (conditional)
    ↓
Compliance (parallel track)
    ↓
Review (Administrator)
    ↓
Archive / History
```

## Workflow Rules

| Rule | Description |
|------|-------------|
| **Progressive** | Each step reveals only the fields required now |
| **No dead ends** | Completion always routes forward or to today's queue |
| **No manual status** | Status derived from actions (see Workflow Automation Constitution) |
| **Conditional branches** | Follow-up, commitment, and compliance paths appear only when triggered |
| **History preserved** | Replace, release, and revisit never delete prior records |
| **Gender invariant** | Male Rukn ↔ Male Karkun; Female ↔ Female |

## Module-Specific Workflow Expectations

| Module | Entry | Exit |
|--------|-------|------|
| **Assignment** | Select Rukn + available Karkun | Active assignment → pending first visit |
| **Execution** | Open Annexure-1 from My Karkuns | Submitted Annexure → follow-up or complete |
| **Follow-up** | Auto-created from Annexure | Completed follow-up → compliance check |
| **Compliance** | Derived from visit outcomes + periodic requirements | Dashboard reflects pending counts |
| **Review** | Administrator monitors execution/compliance queues | Acknowledge or intervene |

---

# 8. Automation Standards

Automation in Karkun Connect is implemented through the **CampaignAutomationEngine** and related services. UI and business logic automation is Version 1; scheduled server jobs are Version 2+.

## Engine Components

| Engine | Behaviour |
|--------|-----------|
| **Scheduler Engine** | Builds today's schedule from assignments, visits, follow-ups, and compliance due dates |
| **Reminder Engine** | Surfaces time-sensitive items that approach or pass due thresholds |
| **Call Queue** | Karkuns awaiting first contact / initial visit — priority ordered |
| **Visit Queue** | Pending Annexure-1 executions for assigned Karkuns |
| **Compliance Queue** | Pending Ijtema, JIH registration, monthly report, Bait-ul-Maal items |
| **Follow-up Queue** | Open follow-ups grouped by Rukn or date |
| **Priority Engine** | Ranks queue items by overdue severity, campaign day, and blocking impact |
| **Escalation Engine** | Elevates items neglected beyond configured thresholds (future notification-linked) |
| **Auto Navigation** | Routes user to next logical screen after action completion |
| **Auto Dashboard Refresh** | Store subscriptions rebuilid snapshots — no manual refresh |
| **Event Engine** | Activity log records assign, visit, follow-up, compliance events |
| **Derived Status** | All workflow statuses computed from events, never manually toggled |
| **Next Action Engine** | Selects the single highest-value action for the current user and role |

## Automation Behaviour Rules

1. **Stateless derivation** — Automation reads stores; it does not duplicate business data.
2. **Subscribe on mount** — Hooks subscribe to all relevant stores; any mutation rebuilds the snapshot.
3. **Role-scoped** — Rukn sees their Karkuns; Administrator sees Jamaat-wide queues.
4. **Deterministic** — Same store state → same automation output.
5. **Explainable** — Every recommendation includes a reason string for UI display.

---

# 9. Auto Execution Engine

Every completed action automatically generates the next operational task.

## Execution Chain

```text
Assignment created
        ↓
Pending first visit (Call Queue / Visit Queue)
        ↓
Annexure-1 opened → In Progress
        ↓
Annexure-1 submitted
        ↓
Commitment captured
        ↓
Follow-up required? ──Yes──→ Follow-up task created
        │ No
        ↓
Compliance checks updated
        ↓
Execution marked complete
        ↓
Dashboard + Command Center refresh
        ↓
Next Karkun promoted in queue
```

## Implementation Expectations

| Completed Action | Automatic Consequences |
|------------------|------------------------|
| Assign Karkun | Karkun leaves available pool; Rukn My Karkuns updated; call queue entry; activity log |
| Open Annexure-1 | Execution status → In Progress |
| Submit Annexure | Evaluate commitment/follow-up; update compliance; refresh automation |
| Complete follow-up | Close follow-up item; refresh queues |
| Replace assignment | History preserved; old → Replaced; new → Active; automation recalculated |
| Release assignment | Karkun → Available; Rukn workload updated; history preserved |

The system **continuously drives execution** — users should not hunt for the next task.

---

# 10. Smart Recommendation Engine

No AI implementation is required for Version 1. This chapter defines the **architecture for future recommendations**.

## Recommendation Types

| Type | Audience | Example |
|------|----------|---------|
| **Daily priorities** | Rukn | "Visit Ahmed Khan first — overdue 2 days" |
| **Suggested work** | Rukn | "3 Karkuns need first contact" |
| **Administrator recommendations** | Admin | "12 Rukns unassigned — assign before Day 5" |
| **Rukn recommendations** | Admin | "Rukn Fatima has 3 overdue follow-ups" |
| **Workload balancing** | Admin | "Rukn A has 1 Karkun; Rukn B has 0 — consider assignment" |
| **Risk prediction** | Admin | "Compliance completion trending below 60% this week" |
| **Campaign health recommendations** | Admin | "Visit velocity behind campaign day target" |

## Recommendation Rules

- Recommendations are **actionable** — each includes a deep link
- Recommendations are **ranked** — never show an unprioritized list
- Recommendations **never block** manual operation
- Recommendations cite **derived evidence** (counts, dates, thresholds)
- Future AI may enhance ranking but must not replace deterministic automation

---

# 11. Campaign Intelligence

Future dashboards must derive intelligence from existing stores — not from manually entered analytics.

## Intelligence Dimensions

| Dimension | Definition | Primary Sources |
|-----------|------------|-----------------|
| **Campaign Health** | Composite execution + compliance score | Annexure outcomes, compliance services |
| **Coverage** | % assigned Karkuns with recent visit activity | Assignment store, execution store |
| **Velocity** | Visits completed vs campaign day expectation | Execution timestamps, campaign calendar |
| **Completion** | % Karkuns reaching completed execution state | Execution status service |
| **Engagement** | Follow-up rate, commitment capture rate | Follow-up store, Annexure records |
| **Risk** | Overdue visits, missing compliance, inactive assignments | Automation engines |
| **Inactive Workers** | Assigned Karkuns with no visit in N days | Execution + assignment stores |
| **Compliance** | Ijtema, JIH, Bait-ul-Maal aggregate | Compliance services |
| **Prediction** | Projected completion at current velocity | Derived trend (Version 2+) |
| **Trend Analysis** | Week-over-week directional change | Activity log + historical snapshots |

## Display Standards

- Show **health score** as progress ring in campaign hero
- Risk items appear in **Alerts** before analytics charts
- Intelligence labels use plain language, not statistical jargon

---

# 12. Notification Framework

Future notifications (push, SMS, email) must follow these standards. RC1 implements in-app alerts only.

## Notification Types

| Type | Trigger | Audience |
|------|---------|----------|
| **Morning Brief** | Campaign day start | Rukn |
| **Today's Schedule** | Daily schedule computed | Rukn |
| **Missed Visit** | Visit not completed by due threshold | Rukn + Admin |
| **Reminder** | Approaching due item | Rukn |
| **Late Report** | Monthly report overdue | Admin |
| **Pending Compliance** | Compliance gap detected | Rukn / Admin by domain |
| **Follow-up Due** | Follow-up date reached | Rukn |
| **Escalation** | Item overdue beyond escalation threshold | Admin |
| **Weekly Summary** | Week end | Admin |
| **Campaign Completion** | Milestone reached | All |

## Notification Rules

- Every notification includes a **deep link action**
- Notifications are **role-appropriate** — Rukns never receive admin-only compliance batches
- Frequency limits prevent alert fatigue
- Urdu campaign messaging may appear in motivational headers; operational text in English
- In-app notifications sync with Command Center — never duplicate conflicting counts

---

# 13. AI Assistant Philosophy

Future AI must **never become a chatbot** for its own sake.

AI is an **operational assistant** embedded in workflow — not a separate conversation surface.

## Permitted AI Behaviours

| Behaviour | Example |
|-----------|---------|
| Open next visit | "Continue with your next assigned Karkun" |
| Show next follow-up | "Fatima's follow-up is due today" |
| Schedule reminder | "Remind me tomorrow if not visited" |
| Prioritize work | "These 3 Karkuns are highest priority" |
| Generate summary | "Weekly execution summary for Administrator" |
| Prepare review | "5 Annexures awaiting review" |

## Forbidden AI Behaviours

- Open-ended chat with no operational outcome
- AI-generated status changes without user action
- AI bypassing Single Source of Truth
- AI recommendations without evidence or deep links
- AI replacing deterministic automation rules

AI assists **decision and navigation**; the user still performs authoritative actions.

---

# 14. Mobile Experience Standards

The Rukn portal is **mobile-primary**. Administrators may use desktop; Rukns often work from phones in the field.

| Standard | Requirement |
|----------|-------------|
| **One-thumb operation** | Primary actions reachable in lower half of screen |
| **Large touch targets** | Minimum 44×44px |
| **Minimal typing** | Smart defaults, selects, toggles over free text |
| **Offline readiness** | Future: queue actions locally; RC1: design for resilience |
| **Fast navigation** | ≤3 taps from home to Annexure-1 |
| **Bottom actions** | Primary submit fixed bottom on mobile forms |
| **Progressive disclosure** | One question per screen where possible (Annexure flow) |

## Mobile Anti-Patterns

- Hover-only interactions
- Wide tables without card fallback
- Modal on modal stacks
- Tiny inline dropdowns for primary actions

---

# 15. Accessibility Standards

Karkun Connect serves a diverse user base including Urdu readers and field users on mid-range devices.

| Standard | Requirement |
|----------|-------------|
| **Typography** | Minimum `text-sm` (14px) for body; Urdu faces need larger line-height |
| **Contrast** | WCAG AA minimum for text on backgrounds |
| **Keyboard navigation** | All interactive elements focusable; logical tab order |
| **Focus states** | Visible focus ring on inputs and buttons (`focus:ring-2 focus:ring-primary/20`) |
| **Screen reader readiness** | Semantic HTML; `aria-label` on icon-only controls; live regions for success/error |
| **Touch targets** | 44×44px minimum |
| **Readable layouts** | No ALL CAPS body text; adequate spacing between interactive rows |

Forms must associate `<label>` with every input. Tables must include header cells with scope.

---

# 16. Performance Standards

Operational software must feel instant during campaign use.

| Standard | Requirement |
|----------|-------------|
| **Fast loading** | Route transitions < 200ms perceived; skeleton if > 100ms |
| **Skeleton loading** | Layout-shaped placeholders, not spinners |
| **Optimistic updates** | Safe mutations update UI before confirmation where rollback is possible |
| **Minimal rerendering** | Store subscriptions scoped; avoid full-tree refresh |
| **Lazy loading** | Code-split routes and heavy report views |
| **Minimal API calls** | RC1: in-memory; future: batch requests, no N+1 fetches |
| **No blocking workflows** | Never freeze UI during assign, submit, or export |

Performance regressions on assign → visit → submit chain are **release blockers**.

---

# 17. Design Tokens

Design tokens are the contract between design and implementation. RC1 tokens live in `src/index.css` under `@theme`. All future components must consume tokens — not raw values.

## Typography Tokens

| Token | Value |
|-------|-------|
| `--font-sans` | system-ui, Segoe UI, Roboto, sans-serif |
| `--font-urdu` | *(future)* Noto Nastaliq Urdu stack |

## Spacing Tokens

Use Tailwind spacing scale (4px base). Future: `--space-page`, `--space-section`, `--space-card`.

## Color Tokens

Documented in Chapter 2. Future: semantic aliases `--color-success`, `--color-warning`, `--color-danger`.

## Radius Tokens

| Token | Value |
|-------|-------|
| `--radius-card` | 0.75rem |
| `--radius-input` | 0.5rem (rounded-lg) |
| `--radius-pill` | 9999px |

## Shadow Tokens

| Token | Usage |
|-------|-------|
| `--shadow-card` | Default elevation |
| `--shadow-card-hover` | Interactive elevation |

## Icon Tokens

Future: `--icon-size-sm`, `--icon-size-md`, `--icon-size-lg`.

## Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 150ms ease | Hover, focus |
| `--transition-normal` | 250ms ease | Modal enter/exit |
| `--transition-none` | 0 | Respect `prefers-reduced-motion` |

Animations must be subtle. No decorative motion on data tables.

## Status Tokens

Future: `--status-assigned`, `--status-pending`, `--status-overdue` mapping to background/text pairs.

---

# 18. Product Roadmap

This constitution governs experience across the product evolution path.

```text
RC1 (Current)
    ↓
Pilot — Basavakalyan
    ↓
Version 1.1 — Persistence + notification foundation
    ↓
Version 2 — Multi-Jamaat, backend, scheduled automation
    ↓
Automation — Server-side scheduler, escalation, push notifications
    ↓
AI — Operational assistant, smart prioritization
    ↓
Predictive Intelligence — Risk forecasting, campaign trajectory
    ↓
Regional Expansion — Multi-campaign, federation views
```

## Phase Experience Expectations

| Phase | Experience Focus |
|-------|------------------|
| **RC1** | In-memory Campaign OS; Command Center; workflow automation via UI engines |
| **Pilot** | Real production masters; field validation; UX friction removal |
| **Version 1.1** | Data persistence; session-safe reload; notification scaffolding |
| **Version 2** | Firebase/backend; true scheduled reminders; multi-Jamaat |
| **Automation** | Push notifications; morning brief; escalation |
| **AI** | Recommendation ranking; natural language summaries — not chatbot |
| **Predictive Intelligence** | Trend projection; risk heatmaps |
| **Regional Expansion** | Federation dashboard; cross-Jamaat analytics |

Features at each phase must **extend** this constitution, not contradict it.

---

# Development Checklist

Before implementing any future feature, verify:

- [ ] Screen answers "What should I do next?"
- [ ] Status is derived, not manually edited
- [ ] Progressive disclosure applied
- [ ] Smart defaults populated from SSOT
- [ ] Dashboard follows Command Center stack order
- [ ] KPIs deep-link to pre-filtered operational views
- [ ] Components use design tokens
- [ ] Mobile experience meets touch and thumb rules
- [ ] Accessibility: labels, focus, contrast
- [ ] Store subscription enables auto-refresh
- [ ] Empty states guide to next action
- [ ] Complies with Workflow Automation Constitution

---

# Relationship to Other Documents

| Document | Relationship |
|----------|--------------|
| **Workflow Automation Constitution** | Defines *how workflows behave*; PX Constitution defines *how they look, feel, and prioritize* |
| **Architecture Index** | Technical realisation of stores, services, and routes |
| **Sprint documentation** | Historical record; must not override constitution |
| **UI/UX folder** | Wireframes and artifacts that implement this constitution |

When conflict arises between a sprint spec and this constitution, **escalate and amend the sprint spec** — not the constitution — unless a deliberate constitution revision is approved.

---

# Status

| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Created | July 2026 |
| Scope | RC1 through Version 2+ experience governance |
| Code impact | Documentation only |
| Location | `docs/architecture/product-experience-constitution.md` |
| Mandatory for | All future screens, workflows, components, dashboards, automation surfaces |

---

*This Product Experience Constitution establishes Karkun Connect as a Campaign Operating System — not management software. Every future interaction must reduce manual work, drive execution, and answer: **What should this user do next?***
