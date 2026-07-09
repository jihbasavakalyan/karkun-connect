# Accessibility

## Contrast

- Primary green `#1b4332` on white exceeds WCAG AA for large text; use for buttons and headings.
- Body text uses `#0f172a` on `#ffffff` — AAA for normal text.
- Secondary text `#64748b` on white — AA for captions only; don't use for critical instructions.
- Status badges pair colored background + dark text (e.g. `ds-badge-healthy`).

## Keyboard focus

- All interactive elements are focusable.
- Focus ring: `focus-visible:outline-2 outline-primary outline-offset-2` on buttons.
- Inputs: `focus:ring-2 focus:ring-primary/20`.
- Modals trap focus implicitly via overlay; Escape closes (`Modal.tsx`).

## Heading hierarchy

- One `h1` per route via `PageHeader`.
- Sections use `h2`/`h3` in document order.
- Don't use heading tags for styling non-headings.

## Button labeling

- Icon-only controls require `aria-label` (e.g. menu, bell, close).
- Loading buttons remain disabled with visible spinner.
- Link-styled buttons use `<button type="button">` or `<Link>` appropriately.

## ARIA expectations

| Component | ARIA |
|-----------|------|
| `EmptyState` | `role="status"` |
| `Modal` | `role="dialog"`, `aria-modal`, `aria-labelledby` |
| `CampaignStatusBar` | `role="status"` |
| `StatusBadge` | Text content provides meaning; icons `aria-hidden` |
| Sort buttons | Visible label + sort direction indicator |

## Touch targets

- Minimum **44×44px** for buttons and inputs (`min-h-11`).
- Mobile nav pills and quick actions meet or exceed this.
- FAB: 56px diameter.

## Responsive breakpoints

| Token | Width | Behavior |
|-------|-------|----------|
| `sm` | 640px | Stacked → row headers |
| `md` | 768px | Sidebar visible |
| `lg` | 1024px | Full admin top bar |
| `xl` | 1280px | Wide page variant |

## Screen reader notes

- Table headers use `<th>` with scope.
- Form labels associated via `htmlFor` / `id`.
- Decorative icons: `aria-hidden` on wrapper when label text is present.
