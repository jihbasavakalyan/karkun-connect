# KC-003 — Digital Rafeeq
## 05 — Knowledge Model

> **Initiative:** [KC-003 — Digital Rafeeq](./00-master-index.md)  
> **Document:** 05 — Knowledge Model  
> **Sprint:** 0.1 — Documentation Refinement  
> **Status:** Draft  
> **Master index:** [00-master-index.md](./00-master-index.md)

This document defines what Digital Rafeeq may know, cite, and reason about. Detailed knowledge taxonomy will be added in future commits.

**Reading order:** Read after [02-system-architecture.md](./02-system-architecture.md), before [09-domain-lexicon.md](./09-domain-lexicon.md).

---

## Purpose of This Document

This document describes the **knowledge boundaries** for Digital Rafeeq — which facts come from Karkun Connect's authoritative data, which come from campaign documentation, and what the companion must never invent or assume.

Grounding rules support [10-conversation-principles.md](./10-conversation-principles.md) — especially *Never guesses*.

---

## Design Posture

Digital Rafeeq's knowledge is **grounded in existing Karkun Connect sources**. The companion explains and guides; it does not maintain a parallel registry of people, assignments, or compliance state.

---

## Document Scope

This document will eventually cover:

- Knowledge categories and sources of truth
- Rukn-scoped vs. global knowledge
- Campaign context knowledge
- Operational knowledge (connections, visits, follow-ups, compliance)
- Procedural knowledge (how to perform tasks in KC)
- Static reference knowledge (policies, definitions)
- Freshness, staleness, and uncertainty handling
- Knowledge the companion must not claim

---

## Sources of Truth

<!-- TODO: Map knowledge categories to existing KC repositories, stores, and services. -->

| Knowledge Category | Authoritative Source | Notes |
|--------------------|----------------------|-------|
| _TBD_ | _TBD_ | Placeholder |

---

## Rukn Scope Model

<!-- TODO: What a Rukn may see vs. administrator-only knowledge. -->

_[Placeholder — Rukn scope rules to be defined.]_

---

## Campaign Knowledge

<!-- TODO: Active campaign metadata, milestones, timelines — linkage to campaign layer. -->

_[Placeholder — campaign knowledge to be documented.]_

---

## Operational Knowledge

<!-- TODO: Assignments, guidance, compliance status, schedules — conceptual mapping only. -->

_[Placeholder — operational knowledge boundaries to be added.]_

---

## Procedural Knowledge

<!-- TODO: Step-level guidance that points to existing KC workflows without duplicating business logic. -->

_[Placeholder — procedural knowledge to be defined.]_

---

## Reference & Lexical Knowledge

<!-- TODO: Glossary, role definitions, campaign terminology — see domain lexicon. -->

_[Placeholder — reference knowledge to be linked from [09-domain-lexicon.md](./09-domain-lexicon.md).]_

---

## Uncertainty & Missing Data

<!-- TODO: How the companion acknowledges gaps rather than hallucinating. -->

_[Placeholder — uncertainty handling to be documented.]_

---

## Prohibited Knowledge Claims

<!-- TODO: Explicit list of facts the companion must not assert without source backing. -->

_[Placeholder — prohibited claims to be listed.]_

---

## Related Documents

| Document | Role |
|----------|------|
| [00-master-index.md](./00-master-index.md) | Initiative entry point |
| [02-system-architecture.md](./02-system-architecture.md) | Data access architecture |
| [09-domain-lexicon.md](./09-domain-lexicon.md) | Term definitions |
| [03-conversation-design.md](./03-conversation-design.md) | How knowledge appears in dialogue |
| [10-conversation-principles.md](./10-conversation-principles.md) | Never guesses; never bypasses business rules |

---

## Revision History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-07-17 | _TBD_ | Sprint 0 — structure and placeholders |
| 0.2 | 2026-07-17 | _TBD_ | Sprint 0.1 — principles link, cross-references |
