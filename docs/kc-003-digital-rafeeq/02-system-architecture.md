# KC-003 — Digital Rafeeq
## 02 — System Architecture

> **Initiative:** [KC-003 — Digital Rafeeq](./00-master-index.md)  
> **Document:** 02 — System Architecture  
> **Sprint:** 0.1 — Documentation Refinement  
> **Status:** Draft  
> **Master index:** [00-master-index.md](./00-master-index.md)

This document describes how Digital Rafeeq will sit within Karkun Connect. Detailed architecture will be added in future design commits.

**Reading order:** Read after [10-conversation-principles.md](./10-conversation-principles.md), before [05-knowledge-model.md](./05-knowledge-model.md).

---

## Purpose of This Document

This document defines the **architectural placement** of Digital Rafeeq relative to the existing Karkun Connect application — repositories, services, stores, authentication, and Rukn-facing surfaces — without prescribing implementation.

---

## Architectural Posture

Digital Rafeeq is a **conversation layer** and **companion layer** that:

- Reuses the **existing Karkun Connect architecture**
- Serves **Rukns** in campaign work contexts
- Presents an **Urdu-first natural interaction** across supported surfaces
- Does **not** replace core assignment, compliance, or dashboard systems

### Interaction Surfaces

The conversation layer is **interface-agnostic**. The same architectural boundaries apply whether the Rukn interacts via:

- In-app conversation interface
- Voice interaction (speech recognition and synthesis)
- WhatsApp or other messaging channels
- Future interaction surfaces

---

## Document Scope

This document will eventually cover:

- High-level component diagram (conceptual)
- Integration boundaries with existing KC layers
- Data access principles (read vs. write, source of truth)
- Authentication and Rukn scope model
- Conversation session lifecycle (conceptual)
- Non-functional requirements (performance, offline, privacy)
- Explicit out-of-scope architectural changes

---

## Context Within Karkun Connect

<!-- TODO: Map Digital Rafeeq to existing layers (pages, hooks, services, repositories, stores). -->

_[Placeholder — context diagram and narrative to be added.]_

---

## Component Overview

<!-- TODO: Conceptual components (e.g. conversation interface, dialogue orchestration, knowledge access). No implementation naming required at Sprint 0. -->

| Component | Responsibility | Status |
|-----------|----------------|--------|
| Conversation interface | Rukn-facing interaction surface (chat, voice, etc.) | Placeholder |
| Dialogue orchestration | Turn-taking, flow, handoff to KC screens | Placeholder |
| Knowledge access | Read authoritative KC data per [05-knowledge-model.md](./05-knowledge-model.md) | Placeholder |

---

## Integration Boundaries

<!-- TODO: Define what Digital Rafeeq may read, suggest, or initiate vs. what remains in existing UI flows. -->

_[Placeholder — integration boundaries to be defined.]_

---

## Data & Source of Truth

<!-- TODO: Reference existing repositories/stores as authoritative sources; companion must not invent parallel truth. -->

_[Placeholder — data access principles to be documented. See [05-knowledge-model.md](./05-knowledge-model.md).]_

---

## Authentication & Authorization

<!-- TODO: Rukn-scoped access; alignment with existing auth and route guards. -->

_[Placeholder — auth model to be defined.]_

---

## Session & State Model

<!-- TODO: Conceptual conversation session, persistence expectations, and refresh behavior. -->

_[Placeholder — session model to be added.]_

---

## Non-Functional Requirements

<!-- TODO: Latency, availability, privacy, audit, and mobile-first considerations. -->

_[Placeholder — NFRs to be defined.]_

---

## Risks & Architectural Constraints

<!-- TODO: Risks of duplicating logic, bypassing repositories, or conflicting with KC-001 refresh lifecycle. -->

_[Placeholder — risks and constraints to be documented.]_

---

## Related Documents

| Document | Role |
|----------|------|
| [00-master-index.md](./00-master-index.md) | Initiative entry point |
| [01-product-blueprint.md](./01-product-blueprint.md) | Product scope and principles |
| [05-knowledge-model.md](./05-knowledge-model.md) | What the companion may know and cite |
| [06-communication-standard.md](./06-communication-standard.md) | Messaging and channel standards |
| [07-implementation-roadmap.md](./07-implementation-roadmap.md) | Delivery phases |

---

## Revision History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-07-17 | _TBD_ | Sprint 0 — structure and placeholders |
| 0.2 | 2026-07-17 | _TBD_ | Sprint 0.1 — conversation layer terminology, cross-references |
