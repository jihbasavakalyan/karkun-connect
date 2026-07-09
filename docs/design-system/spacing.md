# Spacing System

Spacing tokens are defined in `src/design-system/tokens.ts` and applied via Tailwind's default scale (4px base).

## Token reference

| Token | Value | Typical usage |
|-------|-------|---------------|
| `1` | 4px | Icon-text gap, tight badge padding |
| `2` | 8px | Inline button gaps, compact list spacing |
| `3` | 12px | Small card padding (mobile) |
| `4` | 16px | Standard card padding, form field gaps |
| `5` | 20px | Section internal padding |
| `6` | 24px | Page section spacing (`ds-page` `space-y-6`) |
| `8` | 32px | Large section breaks |
| `10` | 40px | Empty state vertical padding |
| `12` | 48px | Hero vertical padding |
| `16` | 64px | Page bottom padding (Rukn home FAB clearance) |

## Layout spacing

| Pattern | Classes |
|---------|---------|
| Page vertical rhythm | `ds-page` → `space-y-6` |
| Section card | `ds-section` → `p-5 sm:p-6` |
| Form fields | `ds-form-field` → `gap-2` |
| Button groups | `gap-2` or `gap-3` |
| Table cells | `ds-table-cell` → `px-4 py-4` |
| Page header | `ds-page-header` → `gap-4` |

## Touch targets

- Minimum interactive height: **44px** (`min-h-11` on buttons and inputs).
- FAB and primary mobile actions: **48px+**.

## Do / Don't

| Do | Don't |
|----|-------|
| Use `gap-2` / `gap-4` from the scale | Use arbitrary `gap-[13px]` |
| Use `ds-section-group` for stacked sections | Nest cards without spacing |
| Match home (`cd-*`) spacing within home only | Mix `cd-` and random margins on module pages |
