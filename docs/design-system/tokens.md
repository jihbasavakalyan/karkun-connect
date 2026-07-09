# Design Tokens

Tokens are the foundation for all visual decisions. Source of truth: **`src/index.css`** `@theme` block. Programmatic access: **`src/design-system/tokens.ts`**.

## Colors

```ts
import { colors } from '@/design-system'
// colors.primary, colors.success, colors.textPrimary, ...
```

See [Colors](./colors.md) for semantic mapping.

## Typography

```ts
import { typography } from '@/design-system'
// typography.hero, typography.body, ...
```

## Spacing

```ts
import { spacing } from '@/design-system'
// spacing[4] === '16px'
```

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 0.375rem | Small chips |
| `radius.md` | 0.5rem | Inputs |
| `radius.lg` | 0.75rem | Cards (`--radius-card`) |
| `radius.xl` | 1rem | Hero panels |
| `radius.full` | 9999px | Badges, avatars |

## Shadow

| Token | Usage |
|-------|-------|
| `shadow.card` | Default cards |
| `shadow.cardHover` | Interactive hover |
| `shadow.enterprise` | Command center panels |
| `shadow.glass` | Home hero |

## Border

- Default: `1px solid var(--color-border)` / `border-border`
- Emphasis: `border-primary/30`
- Dashed empty: `border-dashed border-border/80`

## Transition

```ts
import { transition } from '@/design-system'
// transition.fast, transition.base, transition.slow
```

## Opacity

- Disabled controls: `opacity-50`
- Modal overlay: `bg-text-heading/40`
- Glass panels: `bg-white/10`

## Z-index

| Token | Value | Layer |
|-------|-------|-------|
| `zIndex.dropdown` | 20 | Sticky table headers, top bar |
| `zIndex.sticky` | 20 | Sticky elements |
| `zIndex.overlay` | 30 | Drawers |
| `zIndex.modal` | 40 | Modals |
| `zIndex.fab` | 30 | Floating action button |

## CSS class prefixes

| Prefix | Scope |
|--------|-------|
| `ds-*` | Application-wide design system |
| `cd-*` | Campaign home (Concept D) |
| `enterprise-*` | Command center legacy utilities |
| `cc-*` | Command center compact layouts |

## Tailwind integration

`@theme` variables map to Tailwind utilities (`bg-primary`, `text-secondary`, `shadow-card`).
