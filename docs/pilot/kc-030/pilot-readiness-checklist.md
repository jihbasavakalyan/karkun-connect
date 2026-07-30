# KC-030 — Pilot Readiness Checklist

**Date:** 2026-07-31  
**Build:** `a3b623f` · `1.0.0-rc.1`  
**URL:** https://karkun-connect.vercel.app

## A. Engineering gate (this sprint)

| # | Item | Status |
|---|------|--------|
| A1 | No Critical open defects | ✅ |
| A2 | No High open defects | ✅ |
| A3 | `tsc -b` clean | ✅ |
| A4 | Write lifecycle (`verify:kc-028b`) | ✅ |
| A5 | Reliability layer (`verify:reliability`) | ✅ |
| A6 | Auth contracts (`verify:auth`, `verify:login-render`) | ✅ |
| A7 | Executive report contracts (`verify:kc0125`, `verify:kc-bug-0126`) | ✅ |
| A8 | Weekly Ijtema window (`verify:kc-028c`) | ✅ |
| A9 | Voice + Secretary (`verify:rafeeq-voice`, `verify:rafeeq-secretary`, `verify:kc-027`) | ✅ |
| A10 | Production readiness docs script (`verify:production`) | ✅ |
| A11 | KC-030 certification package committed | ✅ |
| A12 | Verify harness drift ticketed as Medium (not silent) | ✅ See known-issues-register |

## B. Environment (operator confirm)

| # | Item | Status |
|---|------|--------|
| B1 | Production HTTPS reachable | ⬜ |
| B2 | `VITE_REPOSITORY_PROVIDER=firestore` on prod | ⬜ |
| B3 | Firebase Email/Password + Phone OTP enabled | ⬜ |
| B4 | Firestore rules + indexes deployed | ⬜ |
| B5 | Admin accounts + custom claims | ⬜ |
| B6 | Rukn master mobiles verified | ⬜ |
| B7 | Pre-pilot backup taken | ⬜ |

## C. Interactive smoke (operator)

| # | Workflow | Status |
|---|----------|--------|
| C1 | Admin login / logout / hard refresh | ⬜ |
| C2 | Rukn login / role isolation | ⬜ |
| C3 | Dashboard KPIs + post-write refresh | ⬜ |
| C4 | Inbox approve + reject | ⬜ |
| C5 | Connect / disconnect | ⬜ |
| C6 | Visit save | ⬜ |
| C7 | Weekly Ijtema attendance | ⬜ |
| C8 | Baitul Maal save | ⬜ |
| C9 | Communication + WhatsApp | ⬜ |
| C10 | Executive PDF visual | ⬜ |
| C11 | Voice + Secretary spot-check | ⬜ |
| C12 | Security spot-check (unauthorized access) | ⬜ |

## D. Leadership

| # | Item | Status |
|---|------|--------|
| D1 | Known Medium/Low accepted | ⬜ |
| D2 | Controlled pilot scope agreed (Basavakalyan) | ⬜ |
| D3 | Sign [go-live-approval.md](../go-live-approval.md) after B+C | ⬜ |

## Gate decision

| Gate | Decision |
|------|----------|
| Engineering (A) | **PASS** → READY FOR CONTROLLED PILOT |
| Full go-live signature (B+C+D) | **PENDING** operator + leadership |
