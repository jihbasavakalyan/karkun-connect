# Contribution Guide

How to extend Karkun Connect UI without breaking the frozen design system.

## Before you build

1. Check [Components](./components.md) and [Component inventory](./component-inventory.md).
2. Use existing tokens — [Tokens](./tokens.md).
3. Confirm your page belongs on `ds-*` or `cd-*` (home only).

## Adding a new component

### UI primitive (goes in `src/components/ui/`)

Required when the pattern will be reused across 2+ modules.

1. Use `ds-*` classes or compose existing primitives.
2. Export from `src/components/ui/index.ts`.
3. Document props in `docs/design-system/components.md`.
4. Add to component inventory.

### Feature component

Lives in feature folder (e.g. `src/components/compliance/`).

- Must consume `PageShell`, buttons, badges from `ui/`.
- Domain-specific badges should wrap `StatusBadge`, not duplicate styles.

## Adding a new icon

1. Add to `IconName` in `src/design-system/iconNames.ts`.
2. Add SVG path in `src/components/ui/Icon.tsx`.
3. Update `docs/design-system/iconography.md`.

## Adding a new color or spacing value

1. Add to `@theme` in `src/index.css`.
2. Mirror in `src/design-system/tokens.ts`.
3. Document semantic usage in `docs/design-system/colors.md` or `spacing.md`.
4. **Do not** use one-off hex in components.

## Styling rules

| ✅ Allowed | ❌ Not allowed |
|-----------|----------------|
| `className="ds-section"` | `style={{ color: '#1b4332' }}` |
| `text-primary`, `bg-surface-muted` | Random Tailwind palette (`bg-emerald-400`) for status |
| Extending via `className` prop | Copy-pasting button CSS |
| `cd-*` on home routes only | `cd-*` on module pages |

## Pull request checklist

- [ ] Uses design tokens and documented components
- [ ] No emoji icons
- [ ] No hard-coded colors
- [ ] Touch targets ≥ 44px
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run verify:rc1` passes
- [ ] Documentation updated if adding tokens, icons, or primitives

## What requires design review

- New page layouts outside `PageShell` / `cd-page`
- New badge variants or color semantics
- New typography scale levels
- Changes to home hero or priority strip

Pilot feedback may justify targeted UX changes; otherwise the visual language is frozen until post-pilot.
