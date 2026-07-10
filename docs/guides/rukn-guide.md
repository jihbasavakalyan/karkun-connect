# Rukn Guide — Karkun Connect 1.0 RC1

This guide covers the Rukn (field supervisor) workflow for the Basavakalyan pilot.

> **Production pilot:** Use the [Rukn Quick Guide](../operations/rukn-quick-guide.md). Login is **registered mobile + OTP** (M7.1). Demo email accounts below are for local/dev only and are **not** used in production.

## Production Login

1. Enter your registered mobile number (Rukn Master Login ID)
2. Receive OTP only if the number exists in Rukn Master
3. Verify OTP → Rukn Home

Unregistered numbers never receive OTP — contact your administrator.

## Demo Accounts (local / dev only)

| Email | Rukn | Gender |
|-------|------|--------|
| `rukn1@demo.com` | First active male Rukn | Male |
| `rukn2@demo.com` | Second active male Rukn | Male |
| `rukn3@demo.com` | First active female Rukn | Female |
| `rukn4@demo.com` | Second active female Rukn | Female |

Password for all: `password`

## Daily Workflow

### 1. Login

**Production:** Registered mobile + OTP. **Local/dev:** Rukn demo email above. Enable **Remember Me** on personal devices you use in the field.

### 2. Dashboard (`/rukn`)

Review your mission queue, current visit, and today's completed work. The dashboard shows assigned Karkun count and pending Annexure-1 items.

### 3. My Karkun (`/rukn/my-karkun`)

View Karkuns assigned to you. Each card shows visit status and quick actions.

### 4. Open Annexure-1

Tap a Karkun to open the visit form (`/rukn/visit/:karkunId`). The form uses progressive disclosure:

- Smart defaults pre-fill known information
- Duplicate prevention blocks re-submission of completed visits
- Status updates sync to the administrator Execution view

### 5. Available Karkun (`/rukn/available-karkun`)

Browse compatible unassigned Karkuns if your administrator has enabled self-selection (view-only in RC1 unless assignments are made by admin).

### 6. Campaign Record (`/rukn/campaign-record`)

Review your campaign participation record and completion summary.

### 7. Follow-up & Completion

After submitting Annexure-1, complete any required follow-up steps shown on the dashboard. Mark work complete when all assigned Karkuns are visited.

## Mobile Navigation

Bottom navigation provides:

- **Home** — Dashboard
- **My Karkun** — Assigned list
- **Campaign Record** — Your record

Logout is available in the header on all screens.

## Tips

- Use a stable network connection when submitting Annexure-1
- If the page reloads, sign in again (session may restore with Remember Me)
- Contact your administrator for assignment changes — Rukns cannot self-assign in RC1

## Terminology Reminder

Always use **Rukn** and **Karkun** (not alternate spellings) when referring to roles in the application.
