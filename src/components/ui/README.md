# UI Primitives

Lowest-level building blocks for Karkun Connect. Stateless, accessible, styled via the frozen design system.

## Location

- Components: `src/components/ui/`
- CSS tokens: `src/index.css` (`ds-*` classes, `@theme`)
- JS tokens: `src/design-system/tokens.ts`
- Documentation: `docs/design-system/`

## Exports

```tsx
import {
  Icon,
  PageShell,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  StatusBadge,
  EmptyState,
  Skeleton,
  FORM_INPUT_CLASS,
  FORM_LABEL_CLASS,
} from '@/components/ui'
```

## Guidelines

- Prefer `ds-*` classes over ad-hoc Tailwind for layout and forms.
- Use `Icon` with `IconName` — no emoji.
- See `docs/design-system/contribution-guide.md` before adding new primitives.
