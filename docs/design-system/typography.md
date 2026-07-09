# Typography

**Font family:** `system-ui, 'Segoe UI', Roboto, sans-serif` (`--font-sans`)

No custom web fonts — ensures fast load and native feel on all platforms.

## Type scale

| Role | Class / usage | Size | Weight | Line height | Letter spacing |
|------|---------------|------|--------|-------------|----------------|
| Hero | `ds-text-hero`, `cd-hero` titles | 1.5–1.875rem | 700 | 1.25 | tight |
| Page title | `ds-page-title` | 1.75rem | 600 | 1.3 | tight |
| Section title | `ds-section-title`, `enterprise-section-title` | 1.125rem | 600 | 1.35 | tight |
| Card title | `ds-text-card-title` | 1rem | 600 | 1.4 | normal |
| Body | `ds-text-body`, default prose | 0.9375rem (15px) | 400 | 1.6 | normal |
| Secondary | `ds-page-description`, metadata | 0.875rem | 400 | 1.5 | normal |
| Caption | `ds-text-caption`, table headers | 0.75rem | 500 | 1.4 | normal |
| Label | `ds-label`, `ds-text-label` | 0.875rem | 500 | 1.4 | normal |
| Button | `BUTTON_SIZE_CLASS` | 0.875–1rem | 600 | 1 | normal |
| Monospace | — | — | — | — | Use only for IDs/codes if needed |

## Heading hierarchy

- One `h1` per page (`PageHeader` → `ds-page-title`).
- Section headings use `h2` with `ds-section-title`.
- Card headings use `h3` with card title styles.
- Do not skip levels for visual sizing — adjust class, not tag.

## RTL content

Campaign values and Urdu copy use `dir="rtl"` on specific elements. UI chrome remains LTR.

## Do / Don't

| Do | Don't |
|----|-------|
| Use `ds-page-title` on module pages | Invent `text-3xl font-bold` per page |
| Use `text-secondary` for descriptions | Use opacity hacks for muted text |
| Keep button text sentence case | Use ALL CAPS except table column headers |
