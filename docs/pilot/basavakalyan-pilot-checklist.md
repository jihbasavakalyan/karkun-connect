# Basavakalyan Pilot Checklist

Use this checklist to prepare and run the Karkun Connect 1.0 RC1 pilot in Basavakalyan.

## Pre-Installation

- [ ] Confirm target browsers: Chrome, Edge, Safari (mobile)
- [ ] Verify network access to deployment URL
- [ ] Run `npm run build` and `npm run verify:rc1` on release build
- [ ] Document deployment URL for administrators and Rukns

## Demo Accounts

- [ ] Administrator: `admin@demo.com` / `password`
- [ ] Male Rukn 1: `rukn1@demo.com` / `password`
- [ ] Male Rukn 2: `rukn2@demo.com` / `password`
- [ ] Female Rukn 1: `rukn3@demo.com` / `password`
- [ ] Female Rukn 2: `rukn4@demo.com` / `password`
- [ ] Distribute credentials securely (not via public channels)

## Campaign Setup

- [ ] Administrator logs in and confirms active campaign at `/admin/campaign`
- [ ] Verify campaign name, dates, and status
- [ ] Confirm 49 Rukns visible at `/admin/rukn`
- [ ] Confirm ~493 Karkuns loaded at `/admin/karkun`

## Assignment Process

- [ ] Assign at least 2 Karkuns per demo Rukn (male to male, female to female)
- [ ] Verify assignment appears on Rukn dashboard after Rukn login
- [ ] Test replace workflow with documented reason
- [ ] Test remove assignment workflow

## Execution Flow

- [ ] Rukn opens Annexure-1 for an assigned Karkun
- [ ] Complete form with progressive disclosure
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

## Feedback Collection

- [ ] Assign feedback coordinator
- [ ] Prepare issue log template (screen, role, steps, expected vs actual)
- [ ] Schedule daily pilot review during first week
- [ ] Track critical vs cosmetic issues separately

## Known RC1 Limitations

- No backend persistence — data resets on full reload (except auth session)
- No push notifications
- No territory mapping or analytics
- Assignments are in-memory only for the session

## Rollback Plan

- [ ] Keep previous stable build URL available
- [ ] Document git tag/commit for RC1: see release notes
- [ ] Communicate rollback trigger criteria (critical data loss, auth failure)

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Pilot Lead | | | |
| Administrator | | | |
| Technical Lead | | | |
