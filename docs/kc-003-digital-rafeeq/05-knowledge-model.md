# KC-003 — Digital Rafeeq
## 05 — Knowledge Model

> **Initiative:** [KC-003 — Digital Rafeeq](./00-master-index.md)  
> **Document:** 05 — Knowledge Model  
> **Sprint:** 0.5 — Digital Rafeeq Knowledge Model  
> **Status:** Draft — authoritative knowledge reference  
> **Master index:** [00-master-index.md](./00-master-index.md)

This document defines the **complete knowledge model** for Digital Rafeeq — what the companion may know, where knowledge comes from, what requires confirmation, and what must never be assumed.

Digital Rafeeq must always provide **grounded responses** based on Karkun Connect data. It must **never invent information**.

**Reading order:** Read after [02-system-architecture.md](./02-system-architecture.md), before [09-domain-lexicon.md](./09-domain-lexicon.md).

Grounding rules support [10-conversation-principles.md](./10-conversation-principles.md) — especially *Never guesses* and *Never bypasses business rules*. Experience expectations are defined in [11-experience-blueprint.md](./11-experience-blueprint.md).

---

## Document Control

| Field | Value |
|-------|-------|
| Document type | Knowledge Model |
| Authority hierarchy | Repository → Service → Derived → Session → User input |
| Companion rule | Repositories remain authoritative; conversation memory is never source of truth |

---

## 1. Knowledge Philosophy

Digital Rafeeq **never "knows everything."**

It is not an oracle, a general knowledge system, or an inference engine that fills gaps with plausible answers. It is a **companion that speaks only from verified campaign context** — and honestly admits when context is missing.

### What Digital Rafeeq May Know

Digital Rafeeq may cite or reason from only the following classes of knowledge:

| Class | Description |
|-------|-------------|
| **Verified campaign information** | Facts established by Karkun Connect business rules and persisted records |
| **Repository data** | Authoritative persisted domain state (campaign, people, connections, execution, compliance, communication, settings) |
| **Current user context** | Authenticated role, Rukn scope, session identity, and permission boundary |
| **Approved communication content** | Templates and messaging content approved for campaign use |
| **Derived presentation** | Read-only summaries computed from authoritative sources (e.g. today's programme, journey stage) |
| **Explicit user input** | What the Rukn states in the current conversation — always subject to confirmation before persistence |

### What Is Always Unknown

Anything outside the classes above must be treated as **unknown**:

- General world knowledge unrelated to campaign service
- Personal opinions about people
- Inferred meeting outcomes not recorded
- Assumed follow-up completion not confirmed
- Other Rukns' private activity
- Future intentions not stated by the user
- Compliance status not present in authoritative records
- Internet or external reference material

### Knowledge Posture

| Principle | Implication |
|-----------|-------------|
| **Grounded, not creative** | Rafeeq explains and guides from evidence — it does not embellish |
| **Scoped, not global** | A Rukn sees only what their role and assignments permit |
| **Fresh when possible** | Prefer current repository state over conversation recall |
| **Confirmed before persisted** | User speech is not truth until confirmed and written to authoritative storage |
| **Honest under uncertainty** | Unknown is stated clearly; the next appropriate action is offered |

Digital Rafeeq does not maintain a **parallel registry** of people, assignments, compliance, or campaign state. If it is not in Karkun Connect's authoritative layer, Rafeeq does not claim it.

---

## 2. Knowledge Domains

The following table documents every knowledge area Digital Rafeeq may reference. Terminology aligns with [09-domain-lexicon.md](./09-domain-lexicon.md).

**Confidence levels:** `High` = direct repository read; `Medium` = derived from authoritative data; `Low` = session or user input pending confirmation; `None` = must not assert.

---

### Campaign

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Active campaign identity, dates, status, milestones, and thematic context for daily orientation |
| **Source of Truth** | Campaign repository (library and active campaign selection) |
| **Owner** | Campaign administrators; platform campaign configuration |
| **Update Frequency** | Infrequent — changes at campaign setup or phase transitions |
| **Permission Scope** | Rukn: read active campaign context; Administrator: full campaign library |
| **Confidence Level** | High when loaded from repository; None if campaign unavailable |

---

### Rukn

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Identity and scope of the serving Rukn — who is speaking, which Rukn's assignments apply |
| **Source of Truth** | Authentication session + Rukn master registry |
| **Owner** | Platform registry; authenticated session |
| **Update Frequency** | Stable; changes on registry updates or account linkage |
| **Permission Scope** | Rukn: own identity only; Administrator: full Rukn directory |
| **Confidence Level** | High for authenticated self; None for unauthenticated or ambiguous scope |

---

### Karkun

| Attribute | Definition |
|-----------|------------|
| **Purpose** | People in the Karkun registry — names, contact context, registration posture, demographic attributes needed for respectful address |
| **Source of Truth** | Karkun repository / people registry |
| **Owner** | Administrator-managed master registry |
| **Update Frequency** | Moderate — registry imports and profile updates |
| **Permission Scope** | Rukn: Karkuns within connection scope and available pool; Administrator: full registry |
| **Confidence Level** | High for registry fields; None for attributes not in registry |

---

### Connections

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Assignment relationships between Rukn and Karkun — who is connected, active, released, or pending |
| **Source of Truth** | Connection repository (assignment records) |
| **Owner** | Rukn actions via assignment workflows; Administrator oversight |
| **Update Frequency** | Frequent during active campaign days |
| **Permission Scope** | Rukn: own assignments only; Administrator: all assignments |
| **Confidence Level** | High for persisted assignment state; Low until user confirms new connection actions |

---

### Meetings

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Scheduled or intended visits and calls — today's intended contact with a Connected Karkun |
| **Source of Truth** | Derived from guidance, follow-up schedule, and execution state; not a separate invented calendar |
| **Owner** | Rukn through scheduling and visit execution workflows |
| **Update Frequency** | Daily and per-engagement |
| **Permission Scope** | Rukn: own schedule context; Administrator: cross-Rukn visibility where permitted |
| **Confidence Level** | Medium — derived from authoritative inputs; Low if only mentioned in conversation |

---

### Meeting History

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Recorded outcomes of past visits and submissions — what happened, when, and what was captured |
| **Source of Truth** | Execution repository (Annexure records, visit outcomes, activity log) |
| **Owner** | Rukn through post-meeting recording workflows |
| **Update Frequency** | Per completed engagement |
| **Permission Scope** | Rukn: own submitted history for scoped Karkuns; Administrator: broader execution visibility |
| **Confidence Level** | High only for submitted records; None for visits not yet recorded |

---

### Journey

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Connection journey stage per Karkun — where the relationship stands in campaign progression |
| **Source of Truth** | Guidance engine state derived from execution, compliance, and assignment data |
| **Owner** | Platform guidance rules; advanced by recorded actions |
| **Update Frequency** | Changes when execution or compliance milestones are recorded |
| **Permission Scope** | Rukn: journey for own Connected Karkuns; Administrator: aggregate journey distribution |
| **Confidence Level** | Medium–High — derived but rule-bound; never manually invented by Rafeeq |

---

### Next Contact

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Agreed or scheduled follow-up — next visit, call, or check-in with a Karkun |
| **Source of Truth** | Follow-up records in execution repository; confirmed scheduling intent |
| **Owner** | Rukn through follow-up scheduling workflows |
| **Update Frequency** | Per meeting close and follow-up changes |
| **Permission Scope** | Rukn: own follow-ups; Administrator: oversight views |
| **Confidence Level** | High when persisted; Low when only discussed in conversation pending confirmation |

---

### Today's Programme

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Synthesized view of what deserves attention today — first meeting, urgent follow-ups, waiting Karkuns |
| **Source of Truth** | Derived presentation from assignments, guidance, follow-ups, and campaign day context |
| **Owner** | Read-only synthesis; underlying actions owned by Rukn |
| **Update Frequency** | Continuous during active day as state changes |
| **Permission Scope** | Rukn: own programme; Administrator: command-center aggregates |
| **Confidence Level** | Medium — must trace to authoritative inputs; Rafeeq cites programme as guidance, not command |

---

### Campaign Progress

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Campaign-level completion posture — submissions, connection progress, health indicators |
| **Source of Truth** | Derived from execution metrics, assignment counts, and campaign timeline |
| **Owner** | Platform calculation; visible in campaign context surfaces |
| **Update Frequency** | Daily during active campaign |
| **Permission Scope** | Rukn: personal and scoped contribution view; Administrator: full campaign progress |
| **Confidence Level** | Medium — aggregated; Rafeeq must not invent percentages or rankings |

---

### Reports

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Compliance and campaign reporting status — JIH Portal reports, attendance, Baitul Maal posture |
| **Source of Truth** | Compliance repository and related compliance services |
| **Owner** | Karkun compliance state; Rukn facilitation |
| **Update Frequency** | Per compliance events and reporting cycles |
| **Permission Scope** | Rukn: compliance status for own Connected Karkuns; Administrator: full compliance dashboards |
| **Confidence Level** | High for recorded compliance; None for assumed registration or attendance |

---

### Notifications

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Time-sensitive awareness — follow-up due, milestone reached, reminder before contact |
| **Source of Truth** | Derived triggers from follow-ups, schedule, and campaign events — not free-form alerts |
| **Owner** | Platform rules; Rukn opt-in to companion-initiated reminders |
| **Update Frequency** | Event-driven |
| **Permission Scope** | Rukn: own notifications; Administrator: system-level broadcasts where applicable |
| **Confidence Level** | Medium — must link to real events; Rafeeq delivers as human context, not alarm counts |

---

### Communication Templates

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Approved message patterns for outreach — WhatsApp, scheduled messages, campaign communications |
| **Source of Truth** | Communication repository |
| **Owner** | Administrator-approved templates; Rukn selects and confirms send |
| **Update Frequency** | Infrequent template updates |
| **Permission Scope** | Rukn: use within scope; Administrator: template management |
| **Confidence Level** | High for template content; sending always requires Rukn confirmation |

---

### Administrative Settings

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Platform configuration — migration state, broadcast lists, backup posture, environment settings |
| **Source of Truth** | Settings repository |
| **Owner** | Administrator |
| **Update Frequency** | Rare |
| **Permission Scope** | Administrator only; **not** exposed to Rukn companion dialogue |
| **Confidence Level** | High for administrators; **None** — Rafeeq must not disclose to Rukns |

---

### Future AI Context

| Attribute | Definition |
|-----------|------------|
| **Purpose** | Transient interpretation artifacts — parsed intent, language understanding, conversation summaries |
| **Source of Truth** | **Not authoritative** — AI adapter output only |
| **Owner** | Digital Rafeeq conversation layer (ephemeral) |
| **Update Frequency** | Per conversation turn |
| **Permission Scope** | Same as invoking user; never expands visibility |
| **Confidence Level** | Low — must be validated against repositories before any factual claim |

Future AI context **never overrides** repository truth. See Section 8.

---

## 3. Sources of Truth

Karkun Connect organizes knowledge through layered sources. Digital Rafeeq must know which layer is authoritative for each claim.

### Source Type Definitions

| Source Type | Role | Authority |
|-------------|------|-----------|
| **Repository** | Persisted domain records — campaign, people, connections, execution, compliance, communication, settings | **Highest** — primary source of truth |
| **Service** | Business logic that reads repositories and applies rules (assignment, guidance, compliance, campaign) | **High** — authoritative when rule-bound and reading repositories |
| **Derived Data** | Read-only summaries — today's programme, journey stage, campaign progress, KPIs | **Medium** — authoritative only as projection of repository + service rules |
| **Cached Data** | In-memory copies synchronized from repositories for runtime performance | **Medium** — treated as repository-equivalent when fresh; stale cache must not be cited |
| **Temporary Session Data** | Conversation thread, UI focus, in-progress drafts not yet submitted | **Low** — not truth until confirmed and persisted |
| **User Input** | Spoken or typed statements by the Rukn in conversation | **Low** — candidate truth only; requires confirmation before persistence |
| **Historical Data** | Past activity log, submitted Annexure records, archived campaign data | **High** for what was recorded; **None** for periods without records |

### Authority Hierarchy

When sources conflict, Digital Rafeeq resolves in this order:

1. **Repository** (persisted truth)
2. **Service** (rule-bound interpretation of repositories)
3. **Derived Data** (aggregations traceable to 1–2)
4. **Cached Data** (only if known fresh)
5. **User Input / Session** (never overrides 1–4 for factual claims)

### Domain-to-Source Mapping

| Knowledge Domain | Primary Source | Secondary Source |
|------------------|----------------|------------------|
| Campaign | Repository | Service (active campaign resolution) |
| Rukn | Repository + session | — |
| Karkun | Repository | — |
| Connections | Repository | Service (assignment engine) |
| Meetings | Derived | Service (guidance, scheduling) |
| Meeting History | Repository | Historical (activity log) |
| Journey | Derived | Service (guidance engine) |
| Next Contact | Repository | Service (follow-up engine) |
| Today's Programme | Derived | Service (guidance + assignment synthesis) |
| Campaign Progress | Derived | Service (campaign metrics) |
| Reports | Repository | Service (compliance) |
| Notifications | Derived | Service (event triggers) |
| Communication Templates | Repository | — |
| Administrative Settings | Repository | **Rukn: no access** |
| Future AI Context | Session only | **Never authoritative** |

### Repository Lookup Requirement

Digital Rafeeq **must perform repository lookup** (or equivalent fresh read through the platform data layer) before asserting:

- Who is connected to whom
- Whether a Karkun is Assigned or available
- Journey stage or compliance status
- Whether a meeting was recorded
- Campaign name, dates, or active status
- Follow-up due dates that will be stated as fact

Digital Rafeeq **may use derived presentation** without re-deriving manually when the platform already exposes a rule-bound summary — but must not invent fields not present in that summary.

---

## 4. Grounding Rules

Digital Rafeeq grounding is non-negotiable. Every factual statement must trace to Section 3 authority hierarchy.

### Core Rules

| Rule | Requirement |
|------|-------------|
| **Never invent** | Do not create people, assignments, outcomes, dates, or statuses that do not exist in authoritative sources |
| **Never estimate** | Do not approximate counts, percentages, or timelines unless explicitly provided by derived metrics |
| **Never fabricate** | Do not construct plausible narratives to fill gaps |
| **Never assume** | Do not treat conversation mention as completed action; do not infer meeting success without record |
| **Never answer beyond available evidence** | Decline to state facts outside permission scope or without data |

### When Information Is Unavailable

Digital Rafeeq must:

1. **State clearly** that the information is not available or not yet recorded
2. **Avoid speculation** — no "probably," "maybe they," or "I think"
3. **Offer the next appropriate action** — e.g. check the connection record, record the visit, ask the Rukn to confirm
4. **Preserve dignity** — uncertainty is not the Rukn's fault

**Example posture (not final copy):** *"اس ملاقات کا نتیجہ ابھی محفوظ نہیں ہوا — کیا آپ ابھی نوٹ کرنا چاہیں گے؟"*

### Prohibited Knowledge Claims

Digital Rafeeq must **never** assert without source backing:

- That a visit occurred when no record exists
- That a follow-up was completed when status is open
- Compliance registration status not in compliance records
- Another Rukn's assignments or performance
- Campaign rankings or comparisons between Rukns
- Administrator settings or system internals to Rukns
- External facts (news, weather, general knowledge) unless explicitly in scope later

### Alignment with Conversation Principles

Grounding implements [10-conversation-principles.md](./10-conversation-principles.md):

- *Never guesses* → Sections 4 and 9
- *Asks before acting* → Section 5
- *Never bypasses business rules* → Permission model Section 6
- *Speaks to people, not records* → Ground facts in records; speak to humans in prose

---

## 5. Confirmation Rules

User input and companion suggestions are **not persisted truth** until the Rukn explicitly confirms and the platform records the action.

### Situations Requiring Confirmation

| Situation | Why confirmation is required |
|-----------|------------------------------|
| **Recording a meeting** | Creates execution history; affects journey and campaign progress |
| **Scheduling next contact** | Creates follow-up obligation and future notifications |
| **Changing campaign data** | Campaign truth is administrator-governed |
| **Updating journey** | Journey advances through recorded actions, not conversation alone |
| **Connecting or releasing a Karkun** | Alters assignment state and relationship scope |
| **Replacing a Connected Karkun** | Structural assignment change |
| **Submitting compliance information** | Legal and campaign significance |
| **Sending a message on Rukn's behalf** | Communication leaves the platform or reaches a person |
| **Deleting or correcting recorded information** | Irreversible or audit-sensitive |
| **Administrative actions** | Settings, registry changes, broadcast sends — Administrator only |

### Confirmation Standard

Confirmation must be:

- **Explicit** — clear yes/no or equivalent unambiguous intent
- **Specific** — the Rukn knows what will be recorded or sent
- **Logged** — consequential actions traceable in platform activity where applicable

Digital Rafeeq **never treats** "maybe," silence, or partial answers as confirmation.

### Experience Alignment

Confirmation supports [11-experience-blueprint.md](./11-experience-blueprint.md) — recording meetings and scheduling next contact feel conversational, but **the Rukn always decides**.

---

## 6. Permission Model

Digital Rafeeq inherits Karkun Connect authorization. It **never discloses information outside the user's permission boundary**.

### Rukn

| Can access | Cannot access |
|------------|---------------|
| Own identity and scope | Other Rukns' private assignment detail |
| Own Connected Karkuns and available pool | Full Karkun registry beyond scope |
| Journey and compliance for own connections | Administrator settings |
| Own meeting history and follow-ups | Cross-Rukn comparisons or rankings |
| Own today's programme | System internals, migration state, backups |
| Approved communication templates (use, not manage) | Other Rukns' companion conversations (unless policy adds later) |

**Rule:** When a Rukn asks about out-of-scope data, Rafeeq declines gracefully — does not guess, does not leak.

### Administrator

| Can access | Cannot access |
|------------|---------------|
| Full registry and assignment visibility | Rukn companion private conversation content (unless explicit policy) |
| Compliance dashboards and campaign aggregates | Fabricated summaries not traceable to repositories |
| Communication template management | Acting as a Rukn without scoped context |
| Settings and administrative configuration | Bypassing business rules via companion |

**Rule:** Administrator companion features, if introduced, require separate PRD amendment. Initial Digital Rafeeq is **Rukn-scoped**.

### Future Roles

| Role | Posture |
|------|---------|
| Campaign coordinator | Potential read-only cross-Rukn briefing — scope TBD |
| Training lead | Onboarding content — no operational mutation without role |
| Support advocate | Escalation visibility — privacy policy required |

Future roles must define **visibility matrix** before companion access is enabled.

### Visibility Boundaries

Digital Rafeeq must:

- Resolve **authenticated role** before every knowledge retrieval
- Scope queries to **Rukn ID** for primary users
- **Refuse** to synthesize cross-boundary answers from partial leaks
- **Never** disclose mobile numbers, addresses, or sensitive attributes beyond conversational need and policy

---

## 7. Memory Model

Digital Rafeeq has **conversation memory** — but conversation memory is **not** source of truth.

### Memory Layers

| Layer | Contents | Authority | Lifetime |
|-------|----------|-----------|----------|
| **Current conversation** | Active turn-by-turn exchange | Low | Until conversation segment ends |
| **Current session** | Day's thread — who was discussed, what was deferred, encouragement given | Low–Medium | Session duration |
| **Persistent campaign records** | Assignments, submissions, follow-ups, compliance | **High (Repository)** | Campaign lifetime |

### What Conversation Memory May Hold

- Topics the Rukn already declined or deferred
- Tone and pacing preferences within the session
- In-progress confirmation dialogs
- References to "the meeting we just discussed" **before** persistence — always re-verify before citing as fact

### What Must Always Come from Repositories

- Assignment existence and status
- Karkun registry attributes
- Journey stage
- Compliance status
- Submitted meeting outcomes
- Campaign metadata
- Follow-up due dates stated as fact

### What Should Never Be Remembered

- **Unconfirmed** user statements as facts
- **Out-of-scope** data glimpsed in error
- **Other Rukns'** private details in Rukn session memory
- **AI adapter guesses** or discarded interpretations
- **Temporary errors** (failed loads, denied permissions) as persistent state

### Memory Boundary Rule

> If the repository contradicts conversation memory, **the repository wins** — and Rafeeq corrects gently without blaming the Rukn.

---

## 8. Future AI Adapter

A future **AI adapter** may assist Digital Rafeeq with language and conversation — but the adapter is **never the source of truth**.

### Permitted AI Adapter Uses

| Use | Description |
|-----|-------------|
| **Intent interpretation** | Understand what the Rukn is asking for in natural Urdu |
| **Language understanding** | Parse dialect, honorifics, indirect phrasing |
| **Conversation refinement** | Rephrase repository-backed facts into respectful companion prose |
| **Summarization** | Compress authoritative records into brief preparation context |

### Prohibited AI Adapter Uses

| Prohibited use | Reason |
|----------------|--------|
| Inventing facts not in repositories | Violates grounding |
| Estimating metrics | Violates grounding |
| Expanding permission scope | Violates permission model |
| Persisting AI output without confirmation | Violates confirmation rules |
| Replacing repository lookup | Repositories remain authoritative |

### Adapter Architecture Principle

```
Rukn utterance
    → AI adapter (interpret / refine language only)
    → Repository & service lookup (authoritative facts)
    → Grounding check
    → Rafeeq response (passes Rafeeq Test)
```

The AI adapter sits **between** language and facts — never **after** facts as a substitute source.

### Future AI Context Domain

"Future AI Context" (Section 2) holds **ephemeral interpretation state** — confidence always Low until validated against Section 3 sources.

---

## 9. Failure Handling

When the platform or conversation fails, Digital Rafeeq responds **gracefully without guessing**.

### Repository Unavailable

| Behaviour |
|-----------|
| State honestly that campaign information cannot be loaded right now |
| Do not cite cached stale data if freshness is unknown |
| Offer to retry or use existing Karkun Connect screens directly |
| Avoid fabricating today's programme |

### Network Offline

| Behaviour |
|-----------|
| Acknowledge limited connectivity |
| Do not claim submissions succeeded if not confirmed locally |
| Queue confirmation flows only if platform supports offline policy — otherwise defer |
| Maintain calm, non-technical tone |

### Permission Denied

| Behaviour |
|-----------|
| Decline without exposing why sensitive data exists |
| No leakage through "you're not allowed to see X's Y" with specifics |
| Offer in-scope alternative if possible |

### Incomplete Data

| Behaviour |
|-----------|
| Present what is known; name what is missing |
| Do not fill gaps with assumptions |
| Invite Rukn to complete recording or check platform |

### Unknown Request

| Behaviour |
|-----------|
| Acknowledge the request is outside companion scope |
| Redirect to campaign-aligned help or human support path |
| No generic AI answers from open knowledge |

### Conversation Ambiguity

| Behaviour |
|-----------|
| Ask one clarifying question — respectful, not interrogative |
| Do not proceed to action on ambiguous intent |
| Default to less disclosure, not more |

### Failure Tone

All failure responses must pass [11-experience-blueprint.md](./11-experience-blueprint.md) emotional guardrails: **no guilt, preserve dignity, encourage next step**.

---

## 10. Success Criteria

This document is **complete** when every engineer, designer, and tester can answer:

### What Does Digital Rafeeq Know?

Digital Rafeeq knows **only**:

- Verified campaign information from repositories and rule-bound services
- Derived summaries traceable to those sources
- Current authenticated user context
- Approved communication templates
- Ephemeral conversation state (non-authoritative)

It does **not** know general world facts, other Rukns' private work, unrecorded meetings, or administrator internals (for Rukn users).

### How Does It Know It?

| Question | Answer |
|----------|--------|
| Where do facts come from? | Section 3 — Repository highest, then service, derived, cache, session, user input |
| When is lookup required? | Before asserting assignments, journey, compliance, history, campaign facts |
| What role does AI play? | Language only — Section 8; never authoritative |
| What makes user speech true? | Confirmation + persistence — Section 5 |

### What Must It Never Assume?

- Meetings happened without record
- Follow-ups completed without status
- Compliance satisfied without compliance data
- Rukn consent without explicit confirmation
- Cross-scope visibility
- Repository-equivalent truth from conversation memory alone

### Document Acceptance Checklist

- [x] All 15 knowledge domains documented (Section 2)
- [x] Source types and authority hierarchy defined (Section 3)
- [x] Grounding and confirmation rules explicit (Sections 4–5)
- [x] Permission model for Rukn and Administrator (Section 6)
- [x] Memory boundaries clear (Section 7)
- [x] AI adapter bounded (Section 8)
- [x] Failure handling without guessing (Section 9)
- [x] Architecture-neutral — no APIs, schema, or code

---

## Related Documents

| Document | Role |
|----------|------|
| [00-master-index.md](./00-master-index.md) | Initiative entry point |
| [01-product-blueprint.md](./01-product-blueprint.md) | Product WHY — trustworthy grounding goal |
| [02-system-architecture.md](./02-system-architecture.md) | Technical placement (HOW, not WHAT to know) |
| [09-domain-lexicon.md](./09-domain-lexicon.md) | Canonical terminology |
| [10-conversation-principles.md](./10-conversation-principles.md) | Never guesses; asks before acting |
| [11-experience-blueprint.md](./11-experience-blueprint.md) | Human experience when knowledge is missing |
| [03-conversation-design.md](./03-conversation-design.md) | How grounded knowledge appears in dialogue |
| [08-testing-certification.md](./08-testing-certification.md) | Grounding test expectations |

---

## Revision History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-07-17 | _TBD_ | Sprint 0 — structure and placeholders |
| 0.2 | 2026-07-17 | _TBD_ | Sprint 0.1 — principles link, cross-references |
| 1.0 | 2026-07-17 | _TBD_ | Sprint 0.5 — complete knowledge model (authoritative) |
