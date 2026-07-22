# KC-0090 — Shared Libraries
## Reusable Communication Configuration Libraries

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 09 — Shared Libraries  
> **Nature:** Product library model — configuration over implementation  
> **Status:** Authoritative

---

## 1. Purpose

Shared Libraries are the reusable building blocks of Karkun COS.

Campaigns **select and configure** library entries.  
Libraries **belong to the platform**, not to a single campaign.

This enforces:

- Campaign Independent communication
- Configuration over Implementation
- Consistency of tone, journey, and objectives across missions

---

## 2. Library Catalog

| Library | What it holds | Primary consumers |
|---------|---------------|-------------------|
| **Objective Library** | Mission outcomes communication may advance | Admin Mission Center, Journey alignment |
| **Activity Library** | Reusable activity types (visit, call, share resource, follow-up) | Journeys, Rukn execution |
| **Journey Library** | Journey templates and stage definitions | Journey Management, Connection Journey alignment |
| **Template Library** | Message bodies, merge fields, category metadata | Admin Templates, Rukn allowed sends |
| **Tone Library** | Tone profiles compatible with DRCS / campaign dignity | Template authoring, Rafeeq presentation |
| **Audience Library** | Reusable Static / Dynamic / Hybrid group definitions | Admin Audience Management |
| **Automation Library** | Quiet automation recipes (triggers → recommended communications) | Admin Automation |
| **Campaign Pack Library** | Bundles of objectives, journeys, templates, and policies for a campaign type | Campaign configuration |
| **Rafeeq Guidance Library** | Grounded guidance patterns and prompts for Digital Rafeeq | Rafeeq surfaces (Admin + Rukn) |

---

## 3. Library Rules

1. **Platform ownership** — Entries persist beyond a single campaign instance.
2. **Mission configuration** — An active mission activates a subset (often via Campaign Pack).
3. **No hardcoding** — Prefer library entries over campaign-specific code paths.
4. **Permission aware** — Audience Library definitions do not bypass the permission matrix.
5. **Channel agnostic authoring** — Templates and tone are authored above adapters; channel limits apply at render/delivery time.
6. **Rafeeq alignment** — Rafeeq Guidance Library must obey KC-003 principles and DRCS.

---

## 4. Campaign Pack Composition (Conceptual)

```text
Campaign Pack
  ├── Objectives (from Objective Library)
  ├── Journeys (from Journey Library)
  ├── Activities (from Activity Library)
  ├── Templates + Tone bindings
  ├── Default Audience recipes
  ├── Delivery Policy defaults
  ├── Automation recipes
  └── Rafeeq guidance subset
```

Packs accelerate configuration; they do not relocate COS ownership into the campaign.

---

## 5. Governance

| Concern | Guidance |
|---------|----------|
| Authoring | Admin-controlled for mission libraries |
| Quality | Templates pass dignity / DRCS checks before activation |
| Versioning | Conceptual versions for packs and templates (schema deferred) |
| Deprecation | Soft-retire entries; do not break historical Communication records |

---

## 6. Non-Goals

- No code modules or Firestore collections created in KC-0090
- No migration of existing templateService data in this sprint
- Future mapping from current templates → Template Library is an implementation concern

---

## 7. Related Documents

- [01-product-vision.md](./01-product-vision.md)
- [03-domain-model.md](./03-domain-model.md)
- [06-admin-communication.md](./06-admin-communication.md)
- [08-delivery-engine.md](./08-delivery-engine.md)
- [KC-003 Style Guide](../kc-003-digital-rafeeq/04-style-guide.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Code impact | None |
