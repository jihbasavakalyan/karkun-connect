# M6 Phase 3 — Unified Product Experience

Presentation-only milestone. No business logic, store, engine, route, or data changes.

## Mission

One carefully designed product — every page shares the same visual language.

## Design principles

- Consistency over decoration
- Clarity over density
- Calm over complexity
- People over statistics
- Action over information

---

## Design system (`ds-*`)

Global tokens and utilities in `src/index.css`:

| Category | Classes |
|----------|---------|
| **Typography** | `ds-page-title`, `ds-page-description`, `ds-section-title`, `ds-section-subtitle` |
| **Layout** | `ds-page`, `ds-page-narrow`, `ds-page-wide`, `ds-page-header` |
| **Sections** | `ds-section`, `ds-section-muted`, `ds-section-group` |
| **Tabs** | `ds-tab-nav`, `ds-tab`, `ds-tab-pill-nav`, `ds-tab-pill` |
| **Forms** | `ds-label`, `ds-input`, `ds-select`, `ds-helper`, `ds-field-error`, `ds-form-section` |
| **Badges** | `ds-badge` + variants (`healthy`, `attention`, `urgent`, `pending`, `connected`, etc.) |
| **Tables** | `ds-table-wrap`, `ds-table`, `ds-table-row`, `ds-table-cell` |
| **Empty / loading** | `ds-empty`, `ds-skeleton`, `HomePageSkeleton` |
| **Banners** | `ds-banner-success`, `ds-banner-error` |

Home pages intentionally remain on Concept D (`cd-*`) — refined in Phase 1A Revision 1.

---

## Shared UI components

`src/components/ui/`:

| Component | Purpose |
|-----------|---------|
| `PageShell` | Consistent page wrapper + fade-in (`default` / `narrow` / `wide`) |
| `PageHeader` | Title, description, optional actions |
| `PrimaryButton` / `SecondaryButton` / `GhostButton` / `DangerButton` | Unified button system with loading states |
| `StatusBadge` | Single badge system (10 semantic variants) |
| `EmptyState` | Friendly empty states with primary/secondary CTAs |
| `Skeleton` / `HomePageSkeleton` | Loading placeholders |
| `formStyles.ts` | Exported `ds-*` form class constants |
| `buttonBase.ts` | Shared sizing, focus, disabled, loading spinner |

---

## Page coverage

### Administrator walkthrough

| Screen | Route | `PageShell` | `PageHeader` |
|--------|-------|-------------|--------------|
| Login | `/login` | — | — |
| Home | `/admin` | Concept D | Concept D |
| Campaign | `/admin/campaign` | ✓ | ✓ |
| Rukn | `/admin/rukn` | ✓ | ✓ |
| Karkun | `/admin/karkun` | ✓ | ✓ |
| Connections | `/admin/assignments` | ✓ | ✓ |
| Communication | `/admin/communication` | ✓ | ✓ |
| Compliance | `/admin/compliance` | ✓ | ✓ |
| Execution | `/admin/execution` | ✓ | ✓ |
| Follow-up | `/admin/follow-up` | ✓ | ✓ |
| Campaign Lists | `/admin/lists` | ✓ | ✓ |
| Settings | `/admin/settings` | ✓ | ✓ |
| Help | `/admin/help` | ✓ | ✓ |

### Rukn walkthrough

| Screen | Route | `PageShell` | `PageHeader` |
|--------|-------|-------------|--------------|
| Home | `/rukn` | Concept D + skeleton | Concept D |
| Connect Karkun | `/rukn/available-karkun` | ✓ | ✓ |
| Connected Karkuns | `/rukn/my-karkun` | ✓ | ✓ |
| Campaign Record | `/rukn/campaign-record` | ✓ | ✓ |
| Connection Journey | `/admin/annexure-1/:id` | ✓ | custom header |

---

## Unification completed

- **Badges:** `RelationshipHealthBadge`, `JourneyStageBadge`, `ExecutionStatusBadge`, `ComplianceStatusBadge`, `CommunicationStatusBadge`, `CampaignStatusBadge`, people table status → all use `StatusBadge`
- **Empty states:** `ExecutionEmptyState` delegates to `EmptyState`; module pages use `ds-empty` styling
- **Tables:** People tables use `ds-table-*` via `peopleTableDisplay.ts`
- **Forms:** `InputField` uses `formStyles.ts`
- **Buttons:** `DangerZone` uses `DangerButton`
- **Layout:** `AdminLayout` / `RuknLayout` consistent padding (`p-4 lg:p-6`)

---

## Screenshots

Captured via `npm run capture:phase3` (requires `npm run preview` running).

All files in `docs/m6-phase3-evidence/`:

| Screen | Desktop (1280×800) | Mobile (390×844) |
|--------|-------------------|------------------|
| Login | `login-desktop.png` | `login-mobile.png` |
| Admin Home | `admin-home-desktop.png` | `admin-home-mobile.png` |
| Campaign | `admin-campaign-desktop.png` | `admin-campaign-mobile.png` |
| Rukn module | `admin-rukn-desktop.png` | `admin-rukn-mobile.png` |
| Karkun module | `admin-karkun-desktop.png` | `admin-karkun-mobile.png` |
| Connections | `admin-connections-desktop.png` | `admin-connections-mobile.png` |
| Communication | `admin-communication-desktop.png` | `admin-communication-mobile.png` |
| Compliance | `admin-compliance-desktop.png` | `admin-compliance-mobile.png` |
| Execution | `admin-execution-desktop.png` | `admin-execution-mobile.png` |
| Follow-up | `admin-follow-up-desktop.png` | `admin-follow-up-mobile.png` |
| Lists | `admin-lists-desktop.png` | `admin-lists-mobile.png` |
| Settings | `admin-settings-desktop.png` | `admin-settings-mobile.png` |
| Help | `admin-help-desktop.png` | `admin-help-mobile.png` |
| Rukn Home | `rukn-home-desktop.png` | `rukn-home-mobile.png` |
| Connect | `rukn-connect-desktop.png` | `rukn-connect-mobile.png` |
| Connected | `rukn-connected-desktop.png` | `rukn-connected-mobile.png` |
| Campaign Record | `rukn-campaign-record-desktop.png` | `rukn-campaign-record-mobile.png` |

---

## Verification

```bash
npm run lint
npm run build
npm run verify:rc1
```

---

## Files modified

- `src/index.css` — `ds-*` design system
- `src/components/ui/` — shared primitives
- `src/layouts/AdminLayout.tsx`, `RuknLayout.tsx` — spacing
- `src/pages/admin/*`, `src/pages/rukn/*` — PageShell + PageHeader adoption
- Badge, table, form, empty-state components — unified styling
- `scripts/capture-phase3-screenshots.ts` — visual evidence automation
