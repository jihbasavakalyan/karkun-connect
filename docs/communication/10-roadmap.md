# KC-0090 — Roadmap
## Communication Operating System Delivery Phases

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 10 — Roadmap  
> **Nature:** Phased plan — documentation complete; implementation later  
> **Status:** Planning guidance

---

## 1. Current Milestone

| Milestone | Status |
|-----------|--------|
| **KC-0090 — Product Specification** | Complete (this documentation set) |

KC-0090 intentionally ships **documentation only**. Architecture, repositories, schema, routing, auth, and state management remain frozen.

---

## 2. Recommended Phases (Future)

Phases below are **proposals for later sprints**. Each phase must re-validate the architecture freeze and open an ADR if boundaries must move.

### Phase A — Specification Adoption

| Work | Notes |
|------|-------|
| Stakeholder review of COS docs | Product + architecture sign-off |
| Align terminology in future copy | Connection / Connected Karkun |
| Map existing Communication Centre → COS IA | Gap analysis only |

**Exit:** Team agrees COS is the target product model.

### Phase B — Domain Mapping ADR

| Work | Notes |
|------|-------|
| Map COS entities to existing stores/services | No silent schema invention |
| Decide Companion Ledger persistence approach | Prefer extend vs new collection — ADR required if new |
| Delivery Engine contract vs current send APIs | Adapter façade plan |

**Exit:** Approved ADR(s); still no unauthorized schema change.

### Phase C — Admin Communication IA Migration

| Work | Notes |
|------|-------|
| Navigate toward Mission Center / Audience / Journeys / Templates / Delivery | Routing change only with approval |
| Preserve existing delivery behavior | No engine rewrite required initially |
| Multi-channel framing in UI copy | WhatsApp + SMS + Email |

**Exit:** Admin workspace reflects COS navigation intent without breaking production sends.

### Phase D — Rukn Communication (Connected Karkuns)

| Work | Notes |
|------|-------|
| Person-first Rukn Communication surfaces | My Karkuns centered |
| Conversations / Follow-ups / Notes / Visit Planning | Within Connected scope only |
| Companion Ledger MVP | Per ADR |
| Rafeeq suggestions hooks | Reuse KC-003 / KC-020 patterns |

**Exit:** Rukn workspace is relationship-first, permission-safe.

### Phase E — Delivery Engine Hardening

| Work | Notes |
|------|-------|
| Explicit adapter interface | WhatsApp, SMS, Email |
| Delivery Policy configuration | Quiet hours, preference, retry |
| Delivery Center completeness | Admin monitoring |

**Exit:** Channel-independent engine with three live adapters.

### Phase F — Shared Libraries & Campaign Packs

| Work | Notes |
|------|-------|
| Promote templates/objectives/journeys into libraries | Configuration over implementation |
| Campaign Pack activation | Campaign configures COS |
| Automation Library recipes | Quiet assistance only |

**Exit:** New campaigns assemble from packs rather than custom messaging code.

### Phase G — Future Adapters

| Work | Notes |
|------|-------|
| Push, Voice, Telegram, Signal, External APIs | Behind same engine |

**Exit:** New channels without new workspaces.

---

## 3. Dependency Map

```text
KC-0090 Docs (done)
    → Phase A review
        → Phase B ADR
            → Phase C Admin IA
            → Phase D Rukn Connected-Karkun workspace
                → Phase E Delivery hardening
                    → Phase F Libraries & packs
                        → Phase G future adapters
```

Cross-dependencies:

- **KC-003 Digital Rafeeq** — guidance voice and DRCS
- **KC-020 Automation Philosophy** — quiet assistance rules
- **Connection domain** — Connected Karkun truth
- **PX Constitution** — action before analytics; command-center posture

---

## 4. Explicit Holds

Do **not** start implementation phases by:

- Refactoring repositories "while we are here"
- Adding Firestore collections without ADR
- Creating placeholder COS screens on `main` without a scoped sprint
- Collapsing Admin and Rukn into one messaging inbox

---

## 5. Success Metrics (Later)

When implementation ships, evaluate:

1. % of communications with explicit Objective + Journey alignment  
2. Rukn time-to-next-action for Connected Karkuns  
3. Admin ability to configure a campaign pack without new code  
4. Multi-channel delivery share (not WhatsApp monoculture)  
5. Four Relationship Checks pass rate in design review  

---

## 6. Related Documents

- [README.md](./README.md)
- [02-architecture.md](./02-architecture.md)
- [11-documentation-certification.md](./11-documentation-certification.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Implementation | Not started |
