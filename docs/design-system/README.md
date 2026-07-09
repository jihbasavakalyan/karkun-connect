# Karkun Connect Design System

**Milestone M6.5 — Foundation Freeze**

The Karkun Connect Design System is the single source of truth for product visuals. After this milestone, all new UI must reuse documented tokens and components rather than inventing one-off styles.

## Status

| Layer | Location | Status |
|-------|----------|--------|
| CSS tokens | `src/index.css` (`@theme`, `ds-*`, `cd-*`) | Frozen |
| JS tokens | `src/design-system/tokens.ts` | Frozen |
| Icon set | `src/components/ui/Icon.tsx` | Frozen |
| UI primitives | `src/components/ui/` | Frozen |
| Home experience | `cd-*` classes (Concept D) | Frozen (M6 Phase 1A) |

## Two presentation layers

1. **`ds-*`** — Application-wide layout, forms, tables, badges, and module pages.
2. **`cd-*`** — Campaign home experience (Admin & Rukn home). Intentionally distinct hero, priority strip, and flowing panels. Do not replace with generic `ds-page` on home routes.

## Documentation index

| Document | Contents |
|----------|----------|
| [Brand](./brand.md) | Logo, personality, tone, visual principles |
| [Colors](./colors.md) | Semantic palette and usage rules |
| [Typography](./typography.md) | Type scale, weights, line heights |
| [Spacing](./spacing.md) | Spacing tokens and when to use each |
| [Components](./components.md) | Component library reference |
| [Component inventory](./component-inventory.md) | Full file-level inventory |
| [Patterns](./patterns.md) | Buttons, forms, tables standards |
| [Iconography](./iconography.md) | Icon family, sizes, semantics |
| [Motion](./motion.md) | Animation principles |
| [Accessibility](./accessibility.md) | Contrast, focus, ARIA, touch targets |
| [Tokens](./tokens.md) | Design token reference |
| [Contribution guide](./contribution-guide.md) | How to extend the system safely |

## Quick start

```tsx
import { PageShell, PageHeader, PrimaryButton, StatusBadge, Icon } from '@/components/ui'
import { colors, spacing } from '@/design-system'
```

Use `ds-*` CSS classes or Tailwind utilities mapped to `@theme` variables. **Never hard-code hex colors** in components.

## Verification

```bash
npm run lint
npm run build
npm run verify:rc1
```
