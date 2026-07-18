# KC-026 — Settings Experience

Role-aware Settings for personalization and administration. The application works by default; Settings is rarely needed.

## Routes

| Role | Path | Entry |
|------|------|--------|
| Administrator | `/admin/settings` | Sidebar + header gear |
| Rukn | `/rukn/settings` | Header gear (not bottom nav — rarely visited) |

## Sections

| Section | Rukn | Admin |
|---------|------|-------|
| Profile | ✓ | ✓ |
| Digital Rafeeq | ✓ | ✓ |
| Notifications | ✓ | ✓ |
| Appearance | ✓ | ✓ |
| Privacy & Security | ✓ | ✓ |
| Campaign Settings | — | ✓ (read-only identity + policies) |
| Data Management | — | ✓ (exports, migration, danger zone) |
| About | ✓ | ✓ |
| Integrations | ✓ | ✓ (placeholders only) |

## Persistence

User preferences are stored locally per signed-in user:

`localStorage` key `karkun-connect.user-preferences.<uid>`

Includes:

- Appearance (`light` | `dark` | `system`)
- Digital Rafeeq voice / greeting / suggestions
- Notification channel preferences

Never stores secrets, Firebase config, or API keys.

## Design principles

- Minimal, grouped cards with section navigation (avoids long scroll)
- Role-aware visibility
- Future placeholders disabled / marked Coming soon
- No developer/debug settings in production UI

## Verify

```bash
npm run verify:settings
```
