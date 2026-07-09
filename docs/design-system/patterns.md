# Patterns

Consolidated standards for buttons, forms, and tables.

## Buttons

### Variants

| Variant | Component | Visual |
|---------|-----------|--------|
| Primary | `PrimaryButton` | `bg-primary text-white` |
| Secondary | `SecondaryButton` | `border border-border bg-surface` |
| Ghost | `GhostButton` | Transparent, text only |
| Danger | `DangerButton` | `bg-error text-white` |
| FAB | `RuknFloatingActionButton` | Fixed circular primary |

### States

| State | Behavior |
|-------|----------|
| Default | Base styles from `BUTTON_BASE_CLASS` |
| Hover | Darker fill / border highlight (`hover:bg-primary-hover`) |
| Pressed | `active:scale-[0.98]` |
| Disabled | `opacity-50`, `cursor-not-allowed` |
| Loading | Spinner + disabled (`loading` prop) |
| Focus | `focus-visible:outline-2 outline-primary outline-offset-2` |

### Sizes

| Size | Min height | Padding |
|------|------------|---------|
| `sm` | 36px | `px-3 py-1.5` |
| `md` | 44px | `px-5 py-2.5` |
| `lg` | 48px | `px-6 py-3` |

### Guidelines

- One primary button per view section.
- Destructive actions use `DangerButton` with confirmation modal.
- Icon + label: `<Icon name="..." size="sm" />` with `gap-1.5` or `gap-2`.

## Forms

### Inputs

- Class: `ds-input` / `FORM_INPUT_CLASS`
- Min height 44px, full width in field context
- Focus: `ring-2 ring-primary/20`

### Textarea

- Same border/focus as input; min 3 rows for visit notes

### Select

- Class: `ds-select`
- Native `<select>` for accessibility

### Checkbox / Radio

- Minimum 44px tap target (label wraps control)
- Use `ds-label` on associated labels

### Validation

| Element | Class |
|---------|-------|
| Helper text | `ds-helper` |
| Field error | `ds-field-error` |
| Required | Asterisk in label + `aria-required` |

### Errors

- Show below field, `text-error`
- Banner-level errors: `ds-banner-error`

## Tables

### Structure

```html
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead>...</thead>
    <tbody>
      <tr class="ds-table-row">
        <td class="ds-table-cell">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Headers

- `ds-table th` — uppercase, `text-xs`, sticky on scroll

### Rows

- Fixed row height ~64px (`ds-table-row`)
- Hover: `bg-surface-muted/60`

### Actions

- Right-align action buttons; use `GhostButton` or `SecondaryButton` size `sm`

### Status cells

- Use `StatusBadge` or domain wrapper (`ComplianceStatusBadge`, etc.)

### Empty state

- Replace table body with `EmptyState` when no rows

### Responsive

- `ds-table-wrap` enables horizontal scroll on narrow viewports
- Prefer card layout on mobile for complex tables (people lists)

### Sorting / Filtering

- Sort indicators: `↑` / `↓` text (not emoji)
- Filters: `PeopleFiltersBar` pattern with `ds-section`

## Banners

| Class | Usage |
|-------|-------|
| `ds-banner-success` | Confirmations |
| `ds-banner-error` | Form/page errors |
