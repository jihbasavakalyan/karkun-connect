# Motion

## Principles

1. **Subtle** — motion supports understanding, never decorates.
2. **Fast** — 150–300ms; users are doing field work.
3. **Purposeful** — animate state changes, not static content.
4. **Never distracting** — no looping animations except loading spinners.

## Token reference

| Token | Value | Usage |
|-------|-------|-------|
| `transition.fast` | `150ms ease` | Hover color, icon opacity |
| `transition.base` | `200ms ease` | Cards, buttons (`duration-200`) |
| `transition.slow` | `300ms ease` | Page-level fades |

## Patterns

| Pattern | Implementation |
|---------|----------------|
| Page entry | `campaign-fade-in` on `PageShell` |
| Card hover | `hover:-translate-y-0.5` + shadow (`enterprise-card-interactive`) |
| Button press | `active:scale-[0.98]` |
| Expansion | CSS height/opacity; no spring physics |
| Timeline | Static connectors; no scroll-linked animation |
| FAB | Fixed position; no bounce on mount |
| Loading | `animate-spin` on button spinner; `Skeleton` pulse |
| Count up | `campaign-count-up` on KPI numbers (command center) |

## Reduced motion

Respect `prefers-reduced-motion` in future enhancements. Current animations are minimal and non-essential.

## Don't

- Auto-play carousel or marquee text
- Animate every list item on mount
- Use parallax on scroll
