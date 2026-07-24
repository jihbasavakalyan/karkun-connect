# KC-ARCH-009 — Feature Impact & Regression Prevention Framework

**Status:** Permanent engineering governance standard (not a sprint)  
**Applies to:** Every feature, bug fix, refactor, migration, optimization, infrastructure change, configuration change, and production deployment  
**Cursor rule:** `.cursor/rules/kc-arch-009-feature-impact.mdc` (always applied)

## Prompt preamble (mandatory)

Every future implementation prompt should begin with (alongside KC-ARCH-001 where applicable):

> **Implementation must comply with KC-ARCH-009 — Feature Impact & Regression Prevention Framework.**  
> Do not begin coding until Phases 0–3 and the Go/No-Go checklist are complete.

Do not rediscover impact analysis module by module.

---

## Purpose

KC-ARCH-009 is an **engineering process gate**, not a feature.

It ensures:

- Root cause is proven before change
- Architecture impact is assessed before change
- Regression risk is classified before change
- Verification is defined before coding
- Production readiness is certified before deploy
- Post-deploy behaviour is verified after deploy

**Speculation is prohibited.** Operational and configuration problems must not be “fixed” with application code.

---

## Gate model

| Gate | Phases | Rule |
|------|--------|------|
| **Implementation gate** | 0 → 1 → 2 → 3 + Go/No-Go | Coding **MUST NOT** start until these are complete and approved |
| **Deployment gate** | 4 → 5 | Deploy **MUST NOT** occur if Phase 5 is `NOT READY` |
| **Closure gate** | 6 | Ticket **MUST NOT** close until post-deploy verification is recorded |

Related permanent standards remain in force (e.g. [KC-ARCH-001](./kc-arch-001-reliability-persistence.md)).

---

## PHASE 0 — Root cause & architecture impact assessment

**Before writing a single line of code.**

### 0.1 Understand & classify the request

Classify as exactly one primary type:

| Type |
|------|
| New Feature |
| Enhancement |
| Bug Fix |
| Refactor |
| Migration |
| Performance Optimization |
| Infrastructure |
| Configuration |

### 0.2 Root cause (bug fixes and production incidents)

Root cause **MUST** be one of:

| Classification |
|----------------|
| Architecture |
| Environment / Configuration |
| Data |
| Authentication |
| Infrastructure |
| Implementation |
| Operations / User State |
| Unknown |

**Evidence is mandatory.** Never implement speculative fixes.

If evidence is insufficient: **STOP** and request additional evidence.

### 0.3 Architecture impact assessment

Identify every potentially affected area, including at least:

| Area | Area | Area |
|------|------|------|
| UI | Pages | Components |
| Hooks | Services | Repositories |
| Firestore | Authentication | Authorization |
| Session Management | Bootstrap | Dashboard |
| Metrics | Campaign Engine | Automation Engine |
| Notifications | Voice | API |
| Caching | Persistence | Routing |
| State Management | Background Tasks | Performance |
| Monitoring | Logging | Security |
| Dependencies | | |

### 0.4 Impact Matrix (required artifact)

Produce an Impact Matrix before Phase 1:

| Area | Impacted? (Y/N) | How | Notes |
|------|-----------------|-----|-------|
| … | | | |

---

## PHASE 1 — Regression risk analysis

### 1.1 Risk categories

For every impacted area, classify risk for:

| Category |
|----------|
| Data Integrity |
| Persistence |
| Authentication |
| Authorization |
| Bootstrap |
| Dashboard |
| Repositories |
| Firestore |
| Concurrency |
| Async Dependencies |
| Race Conditions |
| Performance |
| Caching |
| UI |
| Navigation |
| API |
| Security |
| Monitoring |
| Logging |

Assign **LOW** / **MEDIUM** / **HIGH**.

### 1.2 HIGH risk documentation (required)

For every **HIGH** item document:

| Field | Content |
|-------|---------|
| Why | Why risk is high |
| Impact | What breaks if wrong |
| Mitigation | How risk is reduced |
| Verification | How it will be proven |
| Rollback | How to undo safely |

### 1.3 Operational classification

Determine whether the reported issue is actually:

| Class | Action |
|-------|--------|
| Engineering | Proceed through KC-ARCH-009 phases |
| Configuration | Recommend config/ops change — **no code** |
| Infrastructure | Recommend infra change — **no app code** unless proven necessary |
| Data | Recommend data/ops repair path — **no speculative code** |
| User Onboarding | Recommend onboarding/ops — **no code** |
| Operational Process | Recommend process — **Do NOT recommend code changes** |

If operational rather than engineering: **recommend an operational action; do not recommend code changes.**

---

## PHASE 2 — Implementation plan

**Before implementation**, produce a complete execution plan:

| Plan element |
|--------------|
| Implementation strategy |
| Files to modify |
| Files to create |
| Files to delete |
| Repositories affected |
| Services affected |
| Firestore collections affected |
| Data migrations |
| API changes |
| Public interface changes |
| Dependencies |
| Estimated implementation order |
| Commit strategy |
| Rollback strategy |
| Success criteria |

### Implementation rules

- Reuse existing architecture, services, and repositories
- Avoid duplicate business logic and hidden dependencies
- Avoid unnecessary abstractions
- Preserve public interfaces and repository contracts
- Minimize implementation scope
- One responsibility per commit
- Follow all KC-ARCH standards (including KC-ARCH-001)

---

## PHASE 3 — Verification plan

**Before coding**, define verification covering:

| Verification type |
|-------------------|
| Unit |
| Integration |
| Regression |
| Cold Start |
| Hard Refresh |
| Fresh Login |
| Logout / Login |
| Repository |
| Firestore |
| Authentication |
| Dashboard |
| Performance |
| Production Smoke Tests |

### Evidence required (examples)

- Console logs
- API responses
- Firestore verification
- Authentication verification
- Custom claims verification
- Production traces
- Cross-check totals
- Screenshots where appropriate

### Unacceptable evidence

Statements such as:

- “It looks fixed”
- “It should work”
- “Probably resolved”

are **NOT** acceptable.

---

## Go / No-Go checklist

**Cursor / engineer MUST answer before implementation.**

| # | Question |
|---|----------|
| 1 | Is the root cause proven? |
| 2 | Is objective evidence available? |
| 3 | Is this actually a software problem? |
| 4 | Could this be configuration? |
| 5 | Could this be operational? |
| 6 | Does this affect bootstrap? |
| 7 | Does this affect authentication? |
| 8 | Does this affect authorization? |
| 9 | Does this affect repositories? |
| 10 | Does this affect Firestore? |
| 11 | Does this affect dashboard? |
| 12 | Does this affect persistence? |
| 13 | Does this affect routing? |
| 14 | Does this affect caching? |
| 15 | Does this introduce async dependencies? |
| 16 | Could this introduce race conditions? |
| 17 | Could this impact production startup? |
| 18 | Could this impact existing workflows? |

For every **YES** answer provide:

- Impact
- Mitigation
- Regression Tests

**Implementation cannot begin until this checklist is complete.**

---

## PHASE 4 — Post-implementation impact audit

**Before certification**, verify:

| Check |
|-------|
| No existing workflow broken |
| No dashboard regressions |
| No bootstrap regressions |
| No authentication regressions |
| No authorization regressions |
| No Firestore regressions |
| No repository regressions |
| No persistence regressions |
| No API regressions |
| No performance degradation |
| No console errors |
| No runtime errors |
| No memory leaks |
| No infinite loading |

**List every workflow tested.**

---

## PHASE 5 — Production readiness certification

**Before deployment**, verify:

| Check |
|-------|
| Console clean |
| Runtime clean |
| Network requests successful |
| Firestore healthy |
| Authentication healthy |
| Claims healthy |
| Bootstrap healthy |
| Dashboard healthy |
| Performance acceptable |
| Rollback verified |
| Monitoring available |

Provide exactly one certification:

| Result | Meaning |
|--------|---------|
| **READY** | Deploy allowed |
| **READY WITH KNOWN LIMITATIONS** | Deploy allowed only with documented limitations |
| **NOT READY** | **Deployment prohibited** |

---

## PHASE 6 — Post-deployment verification

**Immediately after deployment**, verify:

| Area | Area |
|------|------|
| Admin Login | Rukn Login |
| Dashboard | Hard Refresh |
| Cold Start | Logout / Login |
| New User | Existing User |
| Firestore | Repositories |
| Campaign | Assignments |
| Metrics | Authentication |
| Claims | API |
| Performance | |

Compare expected vs actual behaviour. Document all observations.

---

## Permanent engineering rules

Every future implementation must:

1. **Think** before coding  
2. **Prove** before changing  
3. **Reuse** before creating  
4. **Measure** before optimizing  
5. **Verify** before deploying  
6. **Certify** before closing  

Additionally:

- Engineering decisions must be evidence-driven  
- Speculation is prohibited  
- Root cause must be proven  
- Operational problems must not be solved with code  
- Configuration problems must not be solved with code  
- Architecture must remain deterministic, observable, maintainable, and regression-resistant  

---

## Artifact checklist (per change)

| Phase | Required artifact |
|-------|-------------------|
| 0 | Request classification + root cause (if bug) + Impact Matrix |
| 1 | Risk table + HIGH mitigations + operational classification |
| 2 | Implementation plan |
| 3 | Verification plan + evidence list |
| Go/No-Go | Completed checklist with YES expansions |
| 4 | Workflow test list + regression results |
| 5 | READY / READY WITH KNOWN LIMITATIONS / NOT READY |
| 6 | Post-deploy observation log |

---

## Success criteria

This framework is a **mandatory engineering gate** for the repository.

Every future feature, bug fix, optimization, refactor, migration, infrastructure change, and production deployment **MUST** complete KC-ARCH-009:

1. Before implementation begins (Phases 0–3 + Go/No-Go)  
2. Before deployment is approved (Phases 4–5)  
3. Before the work is closed (Phase 6)  

---

## Related documents

- [KC-ARCH-001 — Reliability & Persistence](./kc-arch-001-reliability-persistence.md)
- [Authentication](./authentication.md)
- [Rukn authentication](./rukn-authentication.md)
- [Repository layer](./repository-layer.md)
- [Firestore](./firestore.md)
