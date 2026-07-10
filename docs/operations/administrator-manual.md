# Administrator Manual — Karkun Connect Pilot V1

Production manual for Basavakalyan campaign administrators. Authentication uses **Firebase email and password** — not demo accounts.

---

## Login

1. Open https://karkun-connect.vercel.app
2. Select **Administrator**
3. Enter your assigned email and password
4. Optional: enable **Remember Me** on your trusted device
5. You are redirected to `/admin` (Command Center)

**Forgot password:** Use the reset link on the login page. Reset email is sent via Firebase.

---

## 1. Dashboard (`/admin`)

Review at the start of each day:

- People counts (49 Rukns, ~493 Karkuns expected after import)
- Assignment status (connected vs unassigned)
- Compliance summaries (Ijtema, JIH, Bait-ul-Maal)
- Today's priority and recommended actions

Use quick actions to jump to Connections, Execution, or Compliance.

---

## 2. Campaign (`/admin/campaign`)

- Confirm active campaign name, dates, and status
- Create a new campaign when starting a fresh pilot cycle
- All downstream modules reference this campaign context

---

## 3. Import Master Data

**Path:** Settings → Data Migration (`/admin/settings`)

### Rukn Master

1. Prepare Excel/CSV per migration template (49 records)
2. Import Rukn Master
3. Verify: `/admin/rukn` shows 49 active Rukns
4. Each Rukn must have a valid unique mobile — this is the Rukn Login ID

### Karkun Master

1. Import male Karkun list (~196) and female Karkun list (~297)
2. Verify: `/admin/karkun` shows ~493 Karkuns
3. Review import summary for skipped rows (invalid mobiles, duplicates)

### Verify imported data

- Dashboard people counts match import
- Search a known Rukn and Karkun by name or mobile
- Filter by gender on Karkun page

---

## 4. Rukn Management (`/admin/rukn`)

- Browse, search, and filter the Rukn master
- Add or edit records as needed before connections
- Confirm gender and mobile before assigning Karkuns

---

## 5. Karkun Management (`/admin/karkun`)

- Browse, search, and filter the Karkun registry
- Use global search (top bar) to find people quickly
- Gender and valid mobile are required for assignment

---

## 6. Connections (`/admin/assignments`)

Assign Karkuns to compatible Rukns (**same gender only**).

| Action | When to use |
|--------|-------------|
| **Connect** | Link an available Karkun to a Rukn |
| **Replace** | Swap current Karkun (requires reason) |
| **Remove** | Unassign with reason |

Rules enforced automatically:

- One active assignment per Rukn slot
- Gender matching
- No duplicate active assignments

After connecting, ask the Rukn to refresh or re-login to see assigned Karkuns.

---

## 7. Execution (`/admin/execution`)

Monitor Annexure-1 visit progress across all Rukns.

- View submitted visits and in-progress journeys
- Open **Reports** section (`?section=reports`) for execution summaries
- Export where available

---

## 8. Compliance (`/admin/compliance`)

Track four areas per Karkun:

| Area | Actions |
|------|---------|
| Ijtema Attendance | Update status, bulk actions |
| JIH Web Portal | Registration and monthly reporting |
| Bait-ul-Maal | Contribution tracking |

Pending items appear first. Dashboard metrics sync with list updates.

---

## 9. Follow-up (`/admin/follow-up`)

Review post-visit follow-up queue. Mark items complete when resolved.

---

## 10. Communication (`/admin/communication`)

- Load message templates
- Send to selected Karkuns or lists
- WhatsApp shows template flow; live API integration is post-pilot

---

## 11. Lists (`/admin/lists`)

Manage recipient lists for communication campaigns.

---

## 12. Settings & Help

- **Settings** — version info, data migration, backup export
- **Help** — linked workflow documentation

### Backup before major changes

Settings → Data Migration → Export JSON backup. Store securely off-device.

---

## 13. Logout

Use **Logout** in the top bar. Session clears and you return to `/login`.

---

## Search and Filter Quick Reference

| Page | Search | Filters |
|------|--------|---------|
| Rukn | Name, mobile | Gender, status |
| Karkun | Name, mobile | Gender, assignment, compliance |
| Connections | Rukn/Karkun name | Gender, assigned/unassigned |
| Execution | Rukn/Karkun | Status, date |
| Compliance | Karkun name | Area, pending |

---

## Pre-Pilot Checklist

Complete [Basavakalyan Pilot Checklist](../pilot/basavakalyan-pilot-checklist.md) and [Administrator Test Report](../pilot/administrator-test-report.md) before go-live.

---

## Support

- Operational issues: [Troubleshooting Guide](troubleshooting-guide.md)
- Incidents: [Incident Response](incident-response.md)
- Recovery: [Recovery Guide](recovery-guide.md)
