# KC-035F — KC-ARCH-009 Gate (Voice Navigation & Voice Operation)

**Classification:** New Feature (UI routing only)  
**Master contract:** [KC-035 Digital Rafeeq 2.0](./kc-035-digital-rafeeq-2.md)

## Phase 0

**Problem:** NAVIGATE_* intents are understood but Dialogue acknowledges unknown; no typed navigation resolution layer for voice operation.

**Reuse:** `resolveNavigationTarget` + `ROUTES`; Intent NAVIGATE_*; Dialogue move routing. **No STT/TTS redesign. No writes.**

### Impact Matrix

| Area | Y/N | How |
|------|-----|-----|
| `src/navigation/**` | Y | Resolve intent → route |
| Dialogue Manager | Y | `route_navigation` move |
| Intent registry | Y | Attendance / payment navigate intents |
| Workflow / repos | N | Untouched |

## Phase 1

Risk LOW–MEDIUM. **GO.**

## Phase 2

Navigation engine + Dialogue wiring + façade + `verify:kc-035f`.

## Phase 3

Dashboard/workers/reports/settings/attendance/payment/home/back targets; A–E regression.

## Go / No-Go

Bypass Workflow for writes? **NO** · Duplicate route tables? **NO** (reuse MVP map) · Proceed? **GO**

## Phase 4 — Regression audit

Dashboard/workers/reports/settings/attendance/payment/home/back; Dialogue `route_navigation`; A–E verify green.

## Phase 5 — Certification

**READY**

## Phase 6 — Post-deploy

Filled after production smoke.
