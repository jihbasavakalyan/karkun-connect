# Rukn Quick Guide — Karkun Connect Pilot V1

Short guide for Rukn field supervisors in the Basavakalyan pilot.

---

## Login (Mobile + OTP)

1. Open https://karkun-connect.vercel.app
2. Select **Rukn**
3. Enter your **registered mobile number** (the number on the Rukn Master)
4. Tap **Send OTP**

### If mobile is not registered

You will see:

> This mobile number is not registered with the campaign.  
> Please contact the Administrator.

No OTP is sent. Contact your administrator to verify your number is on the Rukn Master.

### If mobile is registered

1. Complete reCAPTCHA if prompted
2. Enter the 6-digit OTP from SMS
3. Tap **Verify**
4. You are redirected to `/rukn` (Home)

**Wrong OTP:** Clear and re-enter, or wait for resend countdown.  
**Expired OTP:** Request a new OTP after countdown.

Enable **Remember Me** only on your personal device.

---

## Home Dashboard (`/rukn`)

At a glance:

- **Today's Work** — who needs attention today
- **Connected Karkuns** — people assigned to you
- Quick actions: Call, WhatsApp, Record Visit

---

## My Karkun (`/rukn/my-karkun`)

View all Karkuns assigned to you. Each card shows visit status and next action.

---

## Record a Visit

1. Tap a Karkun from Home or My Karkun
2. Open **Record Visit** / Annexure-1 form (`/rukn/visit/:karkunId`)
3. Complete the form (progressive sections)
4. Submit — duplicate completed visits are blocked

Your administrator sees the update under Execution.

---

## Update Journey

From a connected Karkun profile, view and update the **Connection Journey** stages as you guide each person.

---

## Campaign Record (`/rukn/campaign-record`)

Review your campaign participation history and completion summary.

---

## Mobile Navigation

Bottom bar:

- **Home** — Dashboard
- **My Karkun** — Assigned list
- **Campaign Record** — Your record

**Logout** is in the header. Always logout on shared devices.

---

## Tips

| Situation | What to do |
|-----------|------------|
| No Karkuns visible | Ask administrator to connect Karkuns to you |
| Page reloaded | Sign in again (Remember Me may restore session) |
| OTP not received | Check signal; wait for resend; contact administrator |
| Visit won't submit | Check network; ensure required fields complete |

---

## Terminology

Use **Rukn** and **Karkun** as shown in the app — these are the official role names.

---

## Support

Contact your campaign administrator for:

- Mobile number registration
- Assignment changes
- Login or OTP issues

Technical escalation: [Troubleshooting Guide](troubleshooting-guide.md)
