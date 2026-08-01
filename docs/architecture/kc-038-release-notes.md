# KC-038 — Release Notes

## Summary

Official extension of **فعال کارکن، فعال جماعت** from end date **2 Aug 2026** to **9 Aug 2026**. No new campaign. No operational data reset. Timeline, remaining days, dashboards, and reports derive from the updated `endDate`.

## Commit / Deploy

| Item | Value |
|------|-------|
| Feature SHA | `cc5b392` |
| Also shipped | `93b5708` (KC-037C2 Individual Rukn Report) |
| Deployment ID | `dpl_58DX5dFvjDPi5B3YA3kZ6pPRZMmn` |
| Production | https://jihbasavakalyan.org |

## Evidence

Local: `verify:kc-038` 4/4 · typecheck clean  

Production smoke:

- `firestoreRepositories-BMLADrPM.js` contains `2026-08-09` and `2026-07-18`
- `campaignIdentity-Bsvn6cw3.js` contains Extended Campaign / Phase II / Urdu announcement
- Firestore `campaigns` collection empty → seed/`mockMissions` is the live source (patch script: no write needed)

## Messaging

- Announcement: مرکزی مہم … 9 اگست 2026 تک جاری رہے گی
- Phase: پہلا مرحلہ مکمل · دوسرا مرحلہ جاری
