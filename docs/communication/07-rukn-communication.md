# KC-0090 — Rukn Communication
## Connected-Karkun Relationship Workspace

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 07 — Rukn Communication  
> **Nature:** Product specification — no UI implementation  
> **Status:** Authoritative

---

## 1. Purpose

**Rukn Communication** is the relationship communication workspace for field Rukns.

It exists so a Rukn can serve **Connected Karkuns** with continuity, dignity, and journey alignment — not so the Rukn manages channels.

---

## 2. Audience

**Only the Rukn's Connected Karkuns.**

```text
Eligible recipient
  = Karkun with an active Connection to this Rukn
```

Out of scope for this workspace:

- Other Rukns' Connected Karkuns
- Unconnected Karkuns (browse/availability may exist elsewhere in the product; they are not Rukn Communication audience until Connected)
- Mission-wide All Rukns / All Karkuns / Admin groups (default)

---

## 3. Organizing Principle

> This workspace is always organized around **Connected Karkuns**, not channels.

| Correct mental model | Incorrect mental model |
|----------------------|------------------------|
| People → conversation / follow-up / visit / ledger | WhatsApp inbox as the home |
| Relationship timeline per Connected Karkun | Channel folders (SMS / Email / WA) as primary nav |
| Journey stage for this person | Broadcast console |

Channels remain available as **delivery choices** under a person or follow-up — never as the root IA.

---

## 4. Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **My Karkuns** | Primary hub of Connected Karkuns — status, journey glance, next step |
| **Conversations** | Relationship threads and outreach history with Connected Karkuns |
| **Follow-ups** | Promised next contacts and commitments |
| **Visit Planning** | Planned visits and contact intent |
| **Companion Ledger** | Continuity memory — what was shared, promised, noted |
| **Personal Notes** | Private-to-workflow notes that support service (policy may define visibility) |
| **Shared Resources** | Materials shared with a Connected Karkun in service of the journey |
| **Digital Rafeeq Suggestions** | Companion guidance for the day's relationships |

---

## 5. Navigation Mapping

See [05-navigation.md](./05-navigation.md):

My Karkuns · Conversations · Follow-ups · Companion Ledger · Visit Planning · Notes · Rafeeq

**My Karkuns** is the primary organizing surface.

---

## 6. Companion Ledger

The Companion Ledger is the Rukn's **service memory** for each Connected Karkun.

| Ledger should | Ledger must not |
|---------------|-----------------|
| Preserve promises and meaningful context | Become employee surveillance |
| Support visit planning and follow-ups | Replace Connection audit events |
| Feed Digital Rafeeq with grounded facts | Invent history |

Structural connection events remain with the Connection / activity domains. Companion Ledger is relationship continuity for COS.

---

## 7. Digital Rafeeq in This Workspace

Digital Rafeeq walks alongside the Rukn:

- Suggests who needs attention among **Connected Karkuns**
- Prepares visit context
- Reminds of follow-ups without pressure language (DRCS)

Rafeeq does not expand permission scope and does not command sends.

Aligned with [KC-003](../kc-003-digital-rafeeq/00-master-index.md) and the Automation Philosophy Charter.

---

## 8. Multi-Channel Behavior

From a Connected Karkun context, the Rukn may deliver via WhatsApp, SMS, or Email according to Delivery Policy and consent — still **one relationship**, multiple possible channels.

---

## 9. Four Relationship Checks

Every Rukn Communication feature must:

1. Strengthen the relationship with the Connected Karkun  
2. Guide the Rukn  
3. Help the Administrator support the campaign (through better field continuity, not raw surveillance)  
4. Align with the Campaign Journey  

---

## 10. Non-Goals

- No UI, routes, or placeholders in KC-0090
- No change to Connection Engine rules
- No WhatsApp-only product framing

---

## 11. Related Documents

- [01-product-vision.md](./01-product-vision.md)
- [03-domain-model.md](./03-domain-model.md)
- [04-permission-matrix.md](./04-permission-matrix.md)
- [05-navigation.md](./05-navigation.md)
- [08-delivery-engine.md](./08-delivery-engine.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Code impact | None |
| Primary noun | Connected Karkun |
