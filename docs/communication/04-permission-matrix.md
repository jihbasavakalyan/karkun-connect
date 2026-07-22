# KC-0090 — Permission Matrix
## Communication Operating System

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 04 — Permission Matrix  
> **Nature:** Approved permission model — documentation only  
> **Status:** Authoritative

---

## 1. Approved Scope Model

| Role | Communication Scope |
|------|---------------------|
| **Admin** | All Rukns, All Karkuns, Groups |
| **Rukn** | Only Connected Karkuns |

This matrix is **non-negotiable** for Karkun COS. Implementations must enforce it; documentation does not grant access.

---

## 2. Detailed Matrix

### 2.1 Audience Capabilities

| Capability | Administrator | Rukn |
|------------|---------------|------|
| Address All Rukns | Yes | No |
| Address Selected Rukns | Yes | No |
| Address All Karkuns | Yes | No |
| Address Selected Karkuns | Yes | Only Connected Karkuns |
| Address Static Groups | Yes | No* |
| Address Dynamic Groups | Yes | No* |
| Address Hybrid Groups | Yes | No* |
| Address own Connected Karkuns | Yes (via selection) | **Yes — primary** |
| View mission-wide delivery reports | Yes | No |
| View own relationship / conversation history | Yes (oversight) | Yes (own Connected Karkuns) |

\* Default: Rukn cannot use Admin group constructs. A future policy may allow Rukn-scoped groups that are **strict subsets of Connected Karkuns**; until approved, treat as **No**.

### 2.2 Workspace Capabilities

| Capability | Administrator | Rukn |
|------------|---------------|------|
| Admin Communication workspace | Full | No |
| Rukn Communication workspace | Oversight / support views as product defines later | Full (own scope) |
| Mission Center | Yes | No |
| Audience Management (mission) | Yes | No |
| Journey Management (mission config) | Yes | Consume / advance for Connected Karkuns |
| Template Library (mission config) | Yes | Use allowed templates; no mission-wide authoring by default |
| Delivery Center | Yes | Own send history only |
| Automation (mission) | Yes | Receive / act on personal automations only |
| Companion Ledger | Oversight as policy allows | Own ledger for Connected Karkuns |
| Digital Rafeeq Guidance | Admin coaching surfaces | Personal companion |

### 2.3 Configuration vs Execution

| Action | Administrator | Rukn |
|--------|---------------|------|
| Configure shared libraries for mission | Yes | No |
| Configure delivery policies for mission | Yes | No |
| Initiate relationship communication | Yes (mission scope) | Yes (Connected Karkuns) |
| Override quiet hours / emergency | Yes (policy-bound) | No (unless policy grants) |

---

## 3. Connection Boundary

Rukn communication scope is derived from the **Connection** domain:

```text
Rukn may communicate with Karkun K
  ⟺
there exists an active Connection between Rukn and K
```

- Ending or replacing a Connection removes communication eligibility for that Karkun in the Rukn workspace.
- Administrators do not become Rukns by using Admin Communication; they operate under Admin scope.

**Product language:** Connected Karkuns — not "assigned list" — when describing Rukn permissions.

---

## 4. Channel Permissions

Channel adapters (WhatsApp, SMS, Email, future) do **not** expand audience scope.

| Rule | Statement |
|------|-----------|
| Same audience, any channel | Permission is about **who**, not **which app** |
| Consent / compliance | Delivery Policy may block a channel even if audience is allowed |
| No channel privilege escalation | Having Email access never unlocks non-Connected Karkuns for a Rukn |

---

## 5. Digital Rafeeq & Automation

| Actor | May receive guidance about | May not |
|-------|----------------------------|---------|
| Rukn | Own Connected Karkuns, own follow-ups, own ledger | Other Rukns' private companion context |
| Admin | Mission bottlenecks, coaching aggregates, campaign support | Surveil Rukns as employees |

Aligned with [Automation Philosophy Charter](../architecture/automation-philosophy-charter.md): assistance, not policing.

---

## 6. Enforcement Expectations (Future Implementation)

When implementation begins (outside KC-0090):

1. Resolve audience **before** template render.
2. Reject out-of-scope recipients at service boundary.
3. Audit denied attempts for Admin review where appropriate.
4. Do not rely on UI hiding alone.

No enforcement code is added in this sprint.

---

## 7. Related Documents

- [02-architecture.md](./02-architecture.md)
- [03-domain-model.md](./03-domain-model.md)
- [06-admin-communication.md](./06-admin-communication.md)
- [07-rukn-communication.md](./07-rukn-communication.md)
- [Authentication](../architecture/authentication.md) — role identity (unchanged)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Code impact | None |
