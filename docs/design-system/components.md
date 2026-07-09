# Components

Reusable UI building blocks live in `src/components/ui/`. Domain-specific compositions live in feature folders but must consume these primitives.

## Layout

### PageShell

**Purpose:** Consistent page width, vertical rhythm, and entry animation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'narrow' \| 'wide'` | `'default'` | Max width constraint |
| `className` | `string` | — | Additional classes |

**Usage:** Wrap every admin module page. Home pages use `cd-page` instead.

### PageHeader

**Purpose:** Page title, optional description, and action slot.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Page `h1` |
| `description` | `string?` | Subtitle |
| `actions` | `ReactNode?` | Right-aligned buttons |

## Buttons

See [Patterns — Buttons](./patterns.md#buttons).

| Component | Variant |
|-----------|---------|
| `PrimaryButton` | Filled primary |
| `SecondaryButton` | Outlined surface |
| `GhostButton` | Text-only |
| `DangerButton` | Destructive |

Shared props: `size` (`sm`/`md`/`lg`), `fullWidth`, `loading`, `disabled`.

## StatusBadge

**Purpose:** Semantic status chips across compliance, communication, execution, guidance.

| Prop | Type | Default |
|------|------|---------|
| `variant` | `StatusBadgeVariant` | `'neutral'` |
| `icon` | `IconName?` | — |
| `children` | `ReactNode` | label text |

Variants: `healthy`, `attention`, `urgent`, `dormant`, `neutral`, `info`, `success`, `warning`, `pending`, `connected`.

## EmptyState

**Purpose:** Zero-data and error-empty views.

| Prop | Type | Default |
|------|------|---------|
| `icon` | `IconName` | `'sparkles'` |
| `title` | `string` | — |
| `description` | `string` | — |
| `primaryAction` | `{ label, onClick?, href? }` | — |
| `secondaryAction` | `{ label, onClick?, href? }` | — |

## Skeleton

**Purpose:** Loading placeholders.

- `Skeleton` — generic block
- `HomePageSkeleton` — home layout placeholder

## Icon

**Purpose:** Single icon family. See [Iconography](./iconography.md).

## Forms

Use `formStyles.ts` exports: `FORM_LABEL_CLASS`, `FORM_INPUT_CLASS`, `FORM_SELECT_CLASS`, `FORM_HELPER_CLASS`, `FORM_ERROR_CLASS`.

`InputField` wraps label + input + error for simple fields.

## Tables

Use `ds-table-wrap`, `ds-table`, `ds-table-row`, `ds-table-cell`. See [Patterns — Tables](./patterns.md#tables).

## Home-specific (frozen `cd-*`)

| Component | Purpose |
|-----------|---------|
| `AdminHomeHero` / `RuknHomeHero` | Compact campaign hero |
| `AdminPriorityStrip` | Priority KPI strip |
| `AdminTodaysWorkPanel` | Flowing today's work |
| `AdminCampaignContextPanel` | Light campaign context |
| `CampaignPulseHeartbeat` | Live pulse indicator |
| `RuknFloatingActionButton` | Primary Rukn FAB |
| `RuknPeopleRows` | People row pattern |

## Do / Don't

| Do | Don't |
|----|-------|
| Import from `@/components/ui` | Duplicate button styles inline |
| Use `EmptyState` for empty tables | Show blank white space |
| Use domain badges wrapping `StatusBadge` | Create new badge color schemes |
