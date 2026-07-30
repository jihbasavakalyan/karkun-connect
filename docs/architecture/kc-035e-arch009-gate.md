# KC-035E — KC-ARCH-009 Gate (Operational Recommendation Engine)

**Classification:** New Feature (advise-only)  
**Master contract:** [KC-035 Digital Rafeeq 2.0](./kc-035-digital-rafeeq-2.md)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033

## Phase 0

**Problem:** Dialogue/Workflow suggest person-level next steps only; fleet NBA, daily brief, and role guidance are not unified behind a Rafeeq Recommendation Engine.

**Reuse:** `runPriorityEngine` / `getPriorityRafeeqExposure`, `buildPersonSecretaryFacts` + `suggestNextFromRemaining`, CanonicalMetricProviders (via secretary facts). **Never write.**

### Impact Matrix

| Area | Y/N | How |
|------|-----|-----|
| `src/recommendations/**` | Y | New advise engine |
| DigitalRafeeqService | Y | Thin façade |
| Dialogue / Workflow | Y | Optional consume; no mutation ownership |
| Repositories / Matrix | N | Read-only adapters only |

## Phase 1

Risks LOW–MEDIUM (read-only). No HIGH. **GO.**

## Phase 2

Models + adapters + engine + Urdu responses + `verify:kc-035e` + façade.

## Phase 3

Person / role / daily brief bundles; no writes; A–D regression; typecheck; scoped eslint.

## Go / No-Go

Duplicate metrics? **NO** · Direct writes? **NO** · Proceed? **GO**

## Phase 4 — Regression audit

Person / role / daily brief advise; A–D verify green; no writes.

## Phase 5 — Certification

**READY**

## Phase 6 — Post-deploy

Filled after production smoke.
