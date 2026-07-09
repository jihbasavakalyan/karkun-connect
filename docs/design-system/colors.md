# Color System

Semantic colors are defined in `src/index.css` `@theme` and mirrored in `src/design-system/tokens.ts`.

## Semantic palette

| Token | CSS variable | Hex | Usage |
|-------|--------------|-----|-------|
| Primary | `--color-primary` | `#1b4332` | Primary actions, active nav, key links |
| Primary hover | `--color-primary-hover` | `#2d6a4f` | Button hover |
| Primary light | `--color-primary-light` | `#40916c` | Focus rings, accents |
| Primary muted | `--color-primary-muted` | `#d8f3dc` | Soft highlights, connected badges |
| Secondary | `--color-secondary` | `#64748b` | Descriptions, metadata |
| Secondary light | `--color-secondary-light` | `#94a3b8` | Placeholders |
| Success | — | `#15803d` | Healthy status, success banners |
| Success soft | — | `#f0fdf4` | Success backgrounds |
| Warning | `--color-warning` | `#b45309` | Attention states |
| Warning soft | `--color-warning-soft` | `#fffbeb` | Warning backgrounds |
| Danger / Error | `--color-error` | `#b91c1c` | Errors, destructive actions |
| Danger soft | `--color-error-bg` | `#fef2f2` | Error banners |
| Info | `--color-info` | `#1d4ed8` | Informational badges |
| Info soft | `--color-info-soft` | `#eff6ff` | Info backgrounds |
| Surface | `--color-surface` | `#ffffff` | Cards, inputs |
| Surface muted | `--color-surface-muted` | `#f7f7f2` | Page sections, table headers |
| Background | — | `#f6f8f5` | App background (`gradient-warm-bg` on home) |
| Border | `--color-border` | `#e5e7de` | Dividers, input borders |
| Text primary | `--color-text-heading` | `#0f172a` | Headings, body emphasis |
| Text secondary | `--color-secondary` | `#64748b` | Captions, helper text |

## Sidebar (admin)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-sidebar` | `#0f172a` | Sidebar background |
| `--color-sidebar-active` | `#14532d` | Active nav item |
| `--color-sidebar-text` | `#cbd5e1` | Nav labels |

## Usage rules

### Do

- Use Tailwind tokens: `text-primary`, `bg-surface-muted`, `border-border`.
- Use `StatusBadge` variants for semantic status colors.
- Use `ds-banner-success` / `ds-banner-error` for inline alerts.

### Don't

- Hard-code hex values in TSX/CSS modules.
- Use raw `green-500` / `red-600` for product status — use `ds-badge-*` variants.
- Use color alone to convey meaning — always pair with text or icons.

## Gradients

| Token | Usage |
|-------|-------|
| `--gradient-hero` | Admin/Rukn home hero (`cd-hero`) |
| `--gradient-warm-bg` | Home page background |
| `--gradient-card` | Subtle card elevation |
