# Administrator Guide — Karkun Connect 1.0 RC1

This guide walks administrators through the complete campaign workflow for the Basavakalyan pilot.

> **Production pilot:** Use the [Administrator Manual](../operations/administrator-manual.md) for Firebase email/password login. Demo credentials below are for local/dev only and are **not** used in production.

## Login

**Production:** Assigned Firebase administrator email + password (see [Admin Setup](../operations/admin-setup.md)).

**Local / demo (dev only):**

- Email: `admin@demo.com`
- Password: `password`

## 1. Dashboard (`/admin`)

Review command center metrics:

- People counts (49 Rukns, ~493 Karkuns)
- Assignment status (active, unassigned Rukns, available Karkuns)
- Compliance summaries (Ijtema, JIH, Bait-ul-Maal)
- Recent activity log

Use quick actions to jump to Assignments, Execution, or Compliance.

## 2. Campaign (`/admin/campaign`)

Confirm the active campaign identity, duration, and status. All downstream modules reference this campaign context.

## 3. Rukn Management (`/admin/rukn`)

Browse and search the Rukn master (49 active records). Verify gender and contact details before assignments.

## 4. Karkun Management (`/admin/karkun`)

Browse, search, and filter the Karkun registry. Add or edit records as needed. Gender and valid mobile number are required for assignment.

## 5. Assignments (`/admin/assignments`)

Assign Karkuns to compatible Rukns (same gender). Supported actions:

- **Assign** — Link an available Karkun to a Rukn
- **Replace** — Swap the current Karkun with another (requires reason)
- **Remove** — Unassign with reason

The engine prevents duplicate active assignments per Rukn and enforces gender matching.

## 6. Execution (`/admin/execution`)

Monitor Annexure-1 visit progress across all Rukns. Use the Reports section (`?section=reports`) for execution summaries.

## 7. Compliance (`/admin/compliance`)

Track four compliance areas per Karkun:

| Area | Actions |
|------|---------|
| Ijtema Attendance | Update status, bulk actions |
| JIH Web Portal | Registration and monthly reporting |
| Bait-ul-Maal | Contribution tracking |

Pending items appear first by default. Dashboard metrics sync with list updates.

## 8. Follow-up (`/admin/follow-up`)

Review post-visit follow-up queue and completion status.

## 9. Settings & Help

- **Settings** (`/admin/settings`) — RC1 version, auth, and campaign reference
- **Help** (`/admin/help`) — Linked workflow documentation

## Pre-Pilot Checklist

Before going live, complete [Basavakalyan Pilot Checklist](../pilot/basavakalyan-pilot-checklist.md).

## Verification

Run `npm run verify:rc1` to confirm all regression checks pass before deployment.
