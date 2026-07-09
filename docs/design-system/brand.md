# Brand Identity

## Product name

**Karkun Connect** — a mission-driven SaaS platform for reconnecting Karkuns and integrating them into Jamaat work.

## Logo usage

- Component: `src/components/common/Logo.tsx`
- Sizes: `sm` (mobile top bar), default (sidebar), inline contexts
- **Do:** Place on light or dark sidebar backgrounds with adequate padding.
- **Don't:** Stretch, rotate, add drop shadows, or place on busy photographic backgrounds.

## Brand personality

| Attribute | Expression in UI |
|-----------|------------------|
| Calm | Muted backgrounds, generous whitespace, no aggressive reds except true errors |
| Professional | Consistent typography, stroke icons, restrained motion |
| Trustworthy | Clear status labels, visible campaign context, audit-friendly tables |
| People-first | Names and relationships prominent; data secondary |
| Mission-driven | Campaign headline and values visible on home/command center |
| Execution-focused | Today's work, next actions, and visit recording surfaced early |
| Modern SaaS | Card-based layout, sticky headers, responsive grids |

## Tone (copy)

- Direct and respectful — avoid jargon where field users are involved.
- Action-oriented labels: "Connect Karkun", "Record Visit", "View Members".
- Bilingual campaign copy (Urdu headline) is intentional; UI chrome remains English.

## Visual principles

1. **Hierarchy before decoration** — one primary action per section.
2. **Semantic color** — green for healthy/success, amber for attention, red for urgent/danger.
3. **Density by context** — home is flowing; data tables are compact but scannable.
4. **Consistency over novelty** — reuse `PageShell`, `StatusBadge`, `EmptyState`.

## Illustration style

- No custom illustrations in M6.5.
- Use `EmptyState` with `Icon` (`sparkles`, `clipboard`, `users`) for vacant views.
- Campaign values use tinted icon tiles (`CommandCenterValues`).

## Icon philosophy

- Single stroke-based SVG family (`Icon` component).
- 24×24 viewBox, 2px stroke, `currentColor`.
- Pulse health uses colored dots (`pulse-healthy`, `pulse-attention`, `pulse-critical`).
- **No emoji** in product UI — replaced in M6.5.
