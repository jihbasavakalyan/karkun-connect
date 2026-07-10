# Basavakalyan Pilot Checklist

Use this checklist to prepare and run the Karkun Connect production pilot in Basavakalyan.

> **Production auth:** Firebase email/password (Administrator) and phone OTP (Rukn). Demo accounts are no longer used.

## Pre-Installation

- [ ] Complete [Production Checklist](../operations/production-checklist.md)
- [ ] Confirm target browsers: Chrome, Edge, Safari (mobile)
- [ ] Verify network access to production HTTPS URL
- [ ] Run `npm run build`, `npm run verify:rc1`, `npm run verify:production`, `npm run verify:p3`
- [ ] Document deployment URL for administrators and Rukns
- [ ] Complete P3 acceptance reports in [docs/pilot/](./) before go-live
- [ ] Obtain [Go-Live Approval](go-live-approval.md) signatures

## Accounts (Production)

- [ ] Administrator Firebase accounts created (see [Admin Setup](../operations/admin-setup.md))
- [ ] Custom claims `{ role: "administrator" }` set for admins
- [ ] Rukn mobiles verified against master data
- [ ] Custom claims `{ role: "rukn", ruknId: "..." }` set (recommended)
- [ ] Credentials distributed securely (not via public channels)

## Campaign Setup

- [ ] Administrator logs in and confirms active campaign at `/admin/campaign`
- [ ] Verify campaign name, dates, and status
- [ ] Confirm 49 Rukns visible at `/admin/rukn`
- [ ] Confirm ~493 Karkuns loaded at `/admin/karkun`

## Assignment Process

- [ ] Assign at least 2 Karkuns per pilot Rukn (male to male, female to female)
- [ ] Verify assignment appears on Rukn dashboard after Rukn login
- [ ] Test replace workflow with documented reason
- [ ] Test remove assignment workflow
- [ ] Verify multi-device sync (admin assigns, Rukn sees update)

## Execution Flow

- [ ] Rukn opens visit journey for an assigned Karkun
- [ ] Complete Annexure-1 form with progressive disclosure
- [ ] Confirm duplicate submission is blocked
- [ ] Administrator sees update at `/admin/execution`

## Compliance Workflow

- [ ] Update Ijtema status for a test Karkun
- [ ] Update JIH registration status
- [ ] Record monthly reporting status
- [ ] Update Bait-ul-Maal entry
- [ ] Confirm dashboard metrics update at `/admin`

## Mobile Validation

- [ ] Test Rukn portal at 360px width
- [ ] Test Rukn portal at 390px width
- [ ] Verify bottom navigation and touch targets
- [ ] Confirm no horizontal scrolling on forms
- [ ] Test tablet layout at 768px

## Session Testing

- [ ] Login with Remember Me — close browser — reopen — session restored
- [ ] Login without Remember Me — new tab works, new browser does not persist
- [ ] Logout clears session and redirects to login
- [ ] Rukn OTP login and resend flow works

## Offline Testing

- [ ] Make compliance update offline — no crash
- [ ] Reconnect — data syncs after refresh

## Feedback Collection

- [ ] Assign feedback coordinator
- [ ] Prepare issue log template (screen, role, steps, expected vs actual)
- [ ] Schedule daily pilot review during first week
- [ ] Track critical vs cosmetic issues separately

## Production Capabilities

- Firebase Authentication (M7)
- Cloud Firestore persistence with offline cache (M8)
- Multi-device synchronization
- JSON backup via Settings → Data Migration

## Rollback Plan

- [ ] Keep previous stable build artifact available
- [ ] Document git tag/commit for release
- [ ] Firestore export taken before go-live
- [ ] Communicate rollback trigger criteria (see [Recovery Guide](../operations/recovery-guide.md))

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Pilot Lead | | | |
| Administrator | | | |
| Technical Lead | | | |
