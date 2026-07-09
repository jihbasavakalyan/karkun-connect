# Iconography

## Icon family

- **Component:** `src/components/ui/Icon.tsx`
- **Type:** `IconName` in `src/design-system/iconNames.ts`
- **Style:** 24×24 stroke SVG, 2px stroke, round caps/joins
- **Color:** `currentColor` — inherits from parent text color

## Sizes

| Size | Class | Dimensions |
|------|-------|------------|
| `sm` | `ds-icon-sm` | 16×16 |
| `md` | `ds-icon-md` | 20×20 (default) |
| `lg` | `ds-icon-lg` | 24×24 |
| `xl` | `ds-icon-xl` | 28×28 |

## Pulse dots (health)

| Name | Visual | Usage |
|------|--------|-------|
| `pulse-healthy` | Green dot | Active campaign, healthy relationship |
| `pulse-attention` | Amber dot | Needs follow-up |
| `pulse-critical` | Red dot | Urgent attention |

## Semantic usage

| Icon | Use for |
|------|---------|
| `home` | Dashboard |
| `search` | Search actions |
| `users` / `user` | Karkun / Rukn |
| `link` | Connections |
| `check` | Complete, delivered |
| `clipboard` | Records, lists |
| `phone` | Call actions |
| `message` | WhatsApp, chat |
| `mail` | Email |
| `smartphone` | SMS, mobile number |
| `calendar` / `clock` | Schedule, pending |
| `eye` | View details, read |
| `megaphone` | Broadcast |
| `warning` | Failed, alert |
| `plus` | Add, connect |
| `x` | Close, dismiss |
| `menu` | Mobile nav toggle |
| `bell` | Notifications |
| `settings` / `help` | Settings, help |

## Spacing with text

- Inline with label: `inline-flex items-center gap-1.5`
- Icon-only button: center in 40×40+ touch target with `aria-label`

## Adding icons

1. Add name to `iconNames.ts`
2. Add SVG path to `STROKE_ICONS` in `Icon.tsx`
3. Document in this file
4. Do not import third-party icon packs in product UI

## Don't

- Use emoji as UI indicators
- Mix icon families (Font Awesome, etc.)
- Use icons without labels on icon-only buttons (always `aria-label`)
