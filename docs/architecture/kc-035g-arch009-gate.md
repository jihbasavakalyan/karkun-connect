# KC-035G — KC-ARCH-009 Gate (Secretary Personality)

**Classification:** Enhancement (cross-cutting Urdu personality)  
**Master contract:** [KC-035 Digital Rafeeq 2.0](./kc-035-digital-rafeeq-2.md)

## Phase 0

**Problem:** Response copy is correct but can feel repetitive; need centralized secretary templates + light variation without AI wording.

**Reuse:** SECRETARY_URDU, WORKFLOW_URDU, DIALOGUE_URDU, recommendation copy. No new speech stack.

### Impact Matrix

| Area | Y/N | How |
|------|-----|-----|
| `src/secretary/**` | Y | Templates + variation |
| Dialogue / Recommendation / Navigation responses | Y | Compose through secretary |
| Business logic | N | Copy only |

## Phase 1

Risk LOW. **GO.**

## Phase 2

Templates + variants + compose helpers + `verify:kc-035g`.

## Phase 3

Variation non-robotic; no software wording; A–F regression.

## Go / No-Go

Invent AI phrases? **NO** · Proceed? **GO**

## Phase 4 — Regression audit

Ack variation, templates, no AI/software wording; A–F verify green.

## Phase 5 — Certification

**READY**

## Phase 6 — Post-deploy

Filled after production smoke.
