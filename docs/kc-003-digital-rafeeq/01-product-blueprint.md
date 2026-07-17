# KC-003 — Digital Rafeeq
## 01 — Product Blueprint (PRD)

> **Initiative:** [KC-003 — Digital Rafeeq](./00-master-index.md)  
> **Document:** 01 — Product Requirements Document (PRD)  
> **Sprint:** 0.3 — Product Blueprint  
> **Status:** Draft — authoritative product reference  
> **Master index:** [00-master-index.md](./00-master-index.md)

This document is the **authoritative Product Requirements Document (PRD)** for Digital Rafeeq. It explains **why** the product exists, **who** it serves, and **what** success looks like — for product owners, designers, developers, testers, and stakeholders.

This document does **not** describe implementation. Technical placement is defined in [02-system-architecture.md](./02-system-architecture.md). Experience detail is defined in [11-experience-blueprint.md](./11-experience-blueprint.md).

**Reading order:** Read after [00-master-index.md](./00-master-index.md), before [10-conversation-principles.md](./10-conversation-principles.md).

---

## Document Control

| Field | Value |
|-------|-------|
| Initiative ID | KC-003 |
| Product name | Digital Rafeeq |
| Platform | Karkun Connect |
| Primary audience | Rukn |
| Language posture | Urdu-first |
| Interaction posture | Conversation layer (in-app, voice, WhatsApp, future surfaces) |
| Document type | Product Requirements Document (PRD) |

---

## 1. Executive Summary

Digital Rafeeq is an **Urdu-first digital companion** that assists Rukns in carrying out campaign responsibilities through respectful conversation, contextual guidance, and seamless integration with the existing Karkun Connect platform.

Rukns today serve the campaign through visits, calls, follow-ups, compliance tasks, and relationship-building with **Connected Karkuns** — often while travelling, managing multiple connections, and remembering what was said days or weeks earlier. Karkun Connect provides the operational foundation: assignments, guidance, compliance tracking, and campaign context. Digital Rafeeq adds a **human layer on top** — a companion that speaks naturally, reduces cognitive load, and helps the Rukn move through the day with confidence and dignity.

Digital Rafeeq is **not** a chatbot, a virtual assistant like Siri or Alexa, a CRM automation bot, or a replacement for human judgment. It behaves like an experienced, respectful fellow Rukn — never like software announcing itself.

This PRD establishes the product rationale, goals, boundaries, users, success criteria, risks, and release path. All downstream KC-003 design and delivery must align with this document.

---

## 2. Vision Statement

**Every Rukn in campaign service has a trusted Urdu-speaking companion** — present throughout the day, grounded in real Karkun Connect data, respectful of people and process — who makes campaign work clearer, more encouraging, and easier to complete without diminishing the Rukn's authority or the dignity of those they serve.

In the long term, Digital Rafeeq becomes the **natural conversational interface** through which Rukns experience Karkun Connect: not a separate product, but the way the platform speaks with those who carry the campaign forward.

---

## 3. Mission Statement

To give every Rukn a **trustworthy conversational layer** — across in-app conversation, voice, WhatsApp, and future interaction surfaces — that:

- Orientates the Rukn to what matters today
- Supports preparation, execution, and follow-through for connections with Karkuns
- Reduces mental burden without replacing existing workflows
- Honors campaign terminology, business rules, and human dignity
- Integrates seamlessly with Karkun Connect rather than duplicating or bypassing it

Digital Rafeeq exists so Rukns can **serve people better**, not so they can **use another tool**.

---

## 4. Problem Statement

Rukns perform demanding field work during active campaigns. Karkun Connect already centralizes assignments, guidance, compliance, and campaign progress — but the **cognitive and emotional load** of field service remains with the Rukn.

### Current Field Challenges

#### Remembering follow-ups

A Rukn may connect with many Karkuns across visits and calls. Promises made in person — to call again, to visit next week, to help with registration — must be remembered and acted upon. Without timely, human-centered reminders tied to real relationships, follow-ups slip and connections stall.

#### Preparing for meetings

Before a visit or call, a Rukn benefits from knowing who they are meeting, where that **connection journey** stands, and what a natural next step might be. Today this requires navigating multiple areas of Karkun Connect mentally. Preparation should feel like a brief word from a thoughtful colleague — not a hunt through records.

#### Recording outcomes

After a meaningful meeting, outcomes should be captured for the campaign record — visit notes, follow-up intent, compliance progress. Rukns often delay recording because the moment feels administrative. The gap between **human experience** and **campaign documentation** creates incomplete records and lost continuity.

#### Maintaining continuity

Campaign work spans days and weeks. A Rukn must maintain thread across connections: what was discussed, what was deferred, what encouragement was given. When continuity lives only in memory or scattered navigation, relationships suffer and the Rukn carries unnecessary mental weight.

#### Reducing cognitive load

Rukns juggle schedules, Connected Karkuns, compliance obligations (JIH Portal, Ijtema, Baitul Maal), and campaign milestones — often while mobile and time-constrained. The platform holds the data; the Rukn holds the burden of **synthesizing** it into action. Digital Rafeeq addresses this synthesis gap through conversation, not more screens.

### Problem Summary

Karkun Connect answers **what the data says**. Digital Rafeeq answers **what the Rukn should know and do next** — respectfully, in Urdu, with the Rukn always in charge.

---

## 5. Product Goals

| ID | Goal | Description |
|----|------|-------------|
| PG-01 | **Daily clarity** | Help each Rukn begin the day knowing what deserves attention first |
| PG-02 | **Meeting readiness** | Support preparation before visits and calls with relevant connection context |
| PG-03 | **Timely follow-through** | Improve follow-up completion through gentle, contextual reminders |
| PG-04 | **Natural recording** | Make post-meeting outcome capture feel conversational, not bureaucratic |
| PG-05 | **Continuity of care** | Preserve relationship thread across days so Rukns do not repeat themselves |
| PG-06 | **Cognitive relief** | Reduce navigation effort and mental synthesis required to act on platform data |
| PG-07 | **Urdu-first service** | Deliver guidance in respectful, natural Urdu aligned with campaign culture |
| PG-08 | **Platform integration** | Strengthen Karkun Connect usage without duplicating or bypassing existing workflows |
| PG-09 | **Dignified encouragement** | Motivate campaign service without guilt, pressure, or comparison |
| PG-10 | **Trustworthy grounding** | Ensure every companion statement reflects authoritative Karkun Connect information |

---

## 6. Non-Goals

Digital Rafeeq will **deliberately not** pursue the following. These are product boundaries, not deferred features.

| ID | Non-Goal | Rationale |
|----|----------|-----------|
| NG-01 | **Replace Karkun Connect dashboards and pages** | The companion guides; existing surfaces remain authoritative for detailed work |
| NG-02 | **Act as a generic chatbot or Q&A bot** | Open-ended chat without campaign purpose erodes trust and dignity |
| NG-03 | **Automate decisions on behalf of Rukns** | Assignments, releases, compliance submissions require human judgment and confirmation |
| NG-04 | **Pressure, shame, or guilt** | Campaign service must be encouraged, never coerced — see [11-experience-blueprint.md](./11-experience-blueprint.md) |
| NG-05 | **Compare Rukns or rank performance** | Digital Rafeeq serves individuals; it is not a surveillance or leaderboard tool |
| NG-06 | **Invent facts when data is missing** | Uncertainty is stated honestly; guessing destroys trust |
| NG-07 | **Bypass Karkun Connect business rules** | All guidance respects assignment, compliance, and authorization boundaries |
| NG-08 | **Operate as a standalone product** | Digital Rafeeq exists only within Karkun Connect campaign context |
| NG-09 | **Replace Administrator workflows** | Secondary visibility may exist later; primary design is Rukn-first |
| NG-10 | **Optimize for message volume or chat engagement** | Success is measured by campaign outcomes and Rukn experience, not chat metrics alone |

---

## 7. Target Users

### Primary: Rukn

The Rukn is the **primary user and beneficiary** of Digital Rafeeq.

| Attribute | Description |
|-----------|-------------|
| Role | Field servant responsible for connecting with, guiding, and supporting Assigned Karkuns |
| Context | Active campaign participation; mobile field work; Urdu-preferred communication |
| Needs | Daily orientation, meeting preparation, follow-up support, outcome recording, encouragement |
| Relationship to platform | Uses Karkun Connect for connections, journey tracking, compliance, and campaign execution |
| Success | Feels accompanied, respected, and clear — not managed by software |

Digital Rafeeq is designed **Rukn-first**. Every product decision must answer: *Does this help the Rukn serve their Connected Karkuns better?*

### Secondary: Administrator

The Administrator oversees campaign execution across Rukns and may benefit from:

| Attribute | Description |
|-----------|-------------|
| Role | Campaign oversight, registry management, compliance monitoring |
| Relationship to Digital Rafeeq | **Not a primary conversational user in initial releases** |
| Future need | Visibility into companion effectiveness, pilot feedback, campaign health signals |
| Boundary | Digital Rafeeq does not replace Administrator dashboards or assignment management |

Administrator-facing companion features, if any, are **out of scope for initial release** unless explicitly added in a future PRD revision.

### Future: Additional Campaign Roles

Additional roles may adopt Digital Rafeeq in later phases:

| Role | Potential future use |
|------|---------------------|
| Campaign coordinator | Cross-Rukn briefing and milestone communication |
| Training / onboarding lead | Guided introduction to Karkun Connect for new Rukns |
| Support advocate | Escalation path when Rukns need human assistance |

Future roles require separate persona definition and PRD amendment. Initial delivery remains **Rukn-only**.

---

## 8. Core Value Proposition

### For Rukns

Digital Rafeeq turns Karkun Connect from a platform the Rukn **navigates** into a companion the Rukn **works alongside**:

- **Before:** Open multiple areas to remember who to meet, what stage a connection is in, and what follow-ups are due
- **After:** Receive a concise, Urdu-first daily orientation and contextual prompts at meaningful moments

- **Before:** Postpone recording visit outcomes because it feels administrative
- **After:** Close the loop naturally in conversation immediately after a meeting

- **Before:** Carry relationship continuity in memory across busy days
- **After:** Experience continuity through a companion that understands the day's thread

### For the Campaign

Digital Rafeeq improves campaign execution **without changing underlying workflows**:

- Connected Karkuns receive more consistent follow-through
- Campaign records reflect field reality sooner
- Compliance and journey progress advance through supported action, not nagging
- Rukns remain motivated across long campaign days

### Platform Relationship

Digital Rafeeq **preserves existing Karkun Connect workflows**. It does not replace assignment management, Annexure submission, compliance modules, or command-center dashboards. It **surfaces** and **guides toward** those workflows when appropriate — always with Rukn confirmation before consequential action.

Value is delivered through **conversation**, not parallel systems.

---

## 9. Guiding Principles

Product behavior is governed by [10-conversation-principles.md](./10-conversation-principles.md). This PRD adopts those principles at the product level without restating full constitutional detail.

| Principle (summary) | Product implication |
|---------------------|---------------------|
| Speaks to people, not records | Product features frame Karkuns and Rukns as people, not metrics |
| Encourages, never pressures | No guilt-based notifications, streaks, or punitive overdue language |
| Asks before acting | No autonomous assignment, release, or submission actions |
| Never guesses | Product does not ship features that imply certainty without data |
| Never bypasses business rules | Companion paths always route through established KC workflows |
| Always preserves dignity | Copy and flows reviewed for respect — see [04-style-guide.md](./04-style-guide.md) |
| Uses respectful Urdu | Urdu-first is a product requirement, not a localization afterthought |
| Uses campaign terminology | Terms align with [09-domain-lexicon.md](./09-domain-lexicon.md) |
| Keeps conversations concise | Features favor brevity over comprehensiveness in dialogue |
| Passes the Rafeeq Test | Every shipped message certified per [08-testing-certification.md](./08-testing-certification.md) |

### Product-Level Additions

These principles extend the constitution at the product layer:

| Principle | Description |
|-----------|-------------|
| **Experience before implementation** | [11-experience-blueprint.md](./11-experience-blueprint.md) defines how the product should feel before features are built |
| **Companion, not software** | The Rukn should not feel they are "using a feature" — see daily presence in experience blueprint |
| **Interface-agnostic design** | Conversation patterns must work across chat, voice, WhatsApp, and future surfaces |
| **Human judgment is final** | Digital Rafeeq informs and invites; the Rukn decides |

---

## 10. Success Metrics

Success is measured by **campaign outcomes and Rukn experience** — not chat volume alone. Metrics will be refined during pilot; initial targets are directional.

### Efficiency Metrics

| Metric | Description | Direction |
|--------|-------------|-----------|
| **Time to record a meeting** | Elapsed time from visit completion to outcome captured in Karkun Connect | Decrease |
| **Follow-up completion rate** | Share of scheduled follow-ups completed within agreed window | Increase |
| **Navigation effort** | Steps or screens required to complete common daily tasks with companion support | Decrease |

### Engagement Metrics (quality-weighted)

| Metric | Description | Direction |
|--------|-------------|-----------|
| **Daily meaningful engagement** | Rukns who complete at least one companion-supported action per campaign day | Increase |
| **Morning orientation uptake** | Rukns who engage with daily greeting / orientation | Track (not maximize blindly) |
| **Post-meeting capture rate** | Visits followed by outcome recording within same day | Increase |

### Experience Metrics

| Metric | Description | Direction |
|--------|-------------|-----------|
| **Positive user feedback** | Qualitative pilot feedback: respected, helpful, not pressuring | Positive majority |
| **Rafeeq Test pass rate** | Share of certified messages passing constitutional review | Target 100% at release |
| **Trust indicators** | Rukns report companion information matches platform reality | High agreement |

### Campaign Alignment Metrics

| Metric | Description | Direction |
|--------|-------------|-----------|
| **Journey progression** | Connected Karkuns advancing through guidance stages with supported follow-through | Increase |
| **Compliance action completion** | Supported reminders leading to JIH Portal, Ijtema, Baitul Maal actions | Increase (without pressure) |

### Anti-Metrics (what we do not optimize for)

- Total messages sent per day
- Time spent in chat interface
- Comparison of Rukn activity levels across users

---

## 11. Risks

### Technical Risks

| Risk | Impact | Mitigation theme |
|------|--------|------------------|
| Companion states diverge from Karkun Connect data | Rukn loses trust; wrong guidance | Ground all responses in authoritative platform data — see [05-knowledge-model.md](./05-knowledge-model.md) |
| Latency on mobile field networks | Conversation feels broken or software-like | Design for brevity; offline-tolerant patterns in future architecture |
| Multi-surface consistency | Different behavior on chat vs voice vs WhatsApp | Interface-agnostic principles and shared conversation design |

### UX Risks

| Risk | Impact | Mitigation theme |
|------|--------|------------------|
| Chatbot drift | Product feels generic, not companion-like | Enforce [11-experience-blueprint.md](./11-experience-blueprint.md) and Rafeeq Test |
| Notification fatigue | Rukns disable or ignore companion | Strict initiation rules; silence is a feature |
| Over-navigation | Companion duplicates screens instead of simplifying | Guide toward existing KC workflows; measure navigation effort |

### Language Risks

| Risk | Impact | Mitigation theme |
|------|--------|------------------|
| Urdu register inappropriate for audience | Disrespect or confusion | Style guide review; native speaker validation in pilot |
| Terminology inconsistency | Erodes campaign credibility | Enforce [09-domain-lexicon.md](./09-domain-lexicon.md) |
| Bilingual fallback confusion | Rukns unsure which language is authoritative | Clear Urdu-first policy in [04-style-guide.md](./04-style-guide.md) |

### Privacy Risks

| Risk | Impact | Mitigation theme |
|------|--------|------------------|
| Sensitive personal data in conversation | Harm to Karkuns or Rukns | Minimize exposure; Rukn-scoped access only |
| Administrator over-visibility | Rukns feel surveilled | Clear policy on conversation visibility — see open questions in [00-master-index.md](./00-master-index.md) |
| External channel leakage (WhatsApp) | Data leaves controlled context | Channel standards in [06-communication-standard.md](./06-communication-standard.md) |

### Adoption Risks

| Risk | Impact | Mitigation theme |
|------|--------|------------------|
| Rukns perceive companion as extra work | Low engagement | Lead with cognitive relief; prove value in pilot |
| Cultural rejection of "AI" framing | Trust barrier | Position as digital companion, not artificial intelligence novelty |
| Pilot cohort not representative | Wrong conclusions | Define pilot scope in [07-implementation-roadmap.md](./07-implementation-roadmap.md) |

---

## 12. Out of Scope

The following are **explicitly excluded** from Digital Rafeeq — now and unless a future PRD revision states otherwise.

| Category | Exclusion |
|----------|-----------|
| **General AI assistant** | No open-domain assistant behavior; all purpose is campaign-aligned |
| **Open internet search** | No web lookup; knowledge is Karkun Connect–bounded |
| **Personal advice** | No life, family, health, or financial advice outside campaign context |
| **Religious rulings** | No fatwa, jurisprudential, or theological adjudication |
| **Decision-making on behalf of users** | No autonomous assignment, release, compliance submission, or messaging without confirmation |
| **CRM automation bot** | No bulk outreach, drip campaigns, or sales-style sequences |
| **Virtual assistant parity** | No Siri/Alexa-style general commands, smart home, or device control |
| **Replacement of human judgment** | Rukns and Administrators retain all authoritative decisions |
| **Non-campaign conversation** | No entertainment, trivia, or off-topic chat as a product goal |
| **Cross-Rukn comparison** | No leaderboards, rankings, or performance shaming |

---

## 13. Release Strategy

Digital Rafeeq follows a **documentation-first, experience-validated, incrementally deployed** path.

| Phase | Name | Objective | Status |
|-------|------|-----------|--------|
| 1 | **Documentation** | Establish PRD, principles, experience, architecture, and certification framework | In progress (Sprint 0.3 completes PRD) |
| 2 | **Prototype** | Validate conversation quality and daily journey with representative scenarios — no production commitment | Not started |
| 3 | **Pilot** | Limited Rukn cohort in real campaign conditions; measure success metrics and Rafeeq Test compliance | Not started |
| 4 | **Limited rollout** | Expand to additional Rukns/regions with monitoring and feedback loops | Not started |
| 5 | **Production** | General availability as a core Karkun Connect companion layer | Not started |

### Phase Gates

Each phase requires explicit sign-off before the next:

| Transition | Gate |
|------------|------|
| Documentation → Prototype | PRD approved; experience blueprint aligned; principles accepted |
| Prototype → Pilot | Conversation design validated; certification rubric defined |
| Pilot → Limited rollout | Pilot metrics and qualitative feedback meet thresholds |
| Limited rollout → Production | Scale, privacy, and language risks mitigated; support readiness |

Detailed sprint sequencing is maintained in [07-implementation-roadmap.md](./07-implementation-roadmap.md).

---

## 14. Future Vision

Digital Rafeeq is intended to become the **long-term conversational interface of Karkun Connect** — the primary way Rukns experience orientation, guidance, and follow-through on the platform.

### Near-Term Future

- Rukns complete daily campaign work with a calm, Urdu-speaking companion at their side
- Post-meeting recording and follow-up scheduling feel natural
- Karkun Connect data becomes **easier to act on** without new parallel systems

### Medium-Term Future

- Multiple interaction surfaces (in-app, voice, WhatsApp) share one conversation experience
- Companion supports deeper journey stages and compliance reminders with equal dignity
- Pilot learnings refine terminology, timing, and initiation rules

### Long-Term Future

- Digital Rafeeq is synonymous with how Rukns **enter** Karkun Connect — the first voice they hear and the last acknowledgment at day's end
- New campaign roles adopt tailored companion experiences built on the same principles
- The conversation layer becomes a durable product differentiator: **campaign software that speaks like a respectful fellow worker**

The future vision does not change the non-negotiables: **Rukn authority, human dignity, Urdu-first respect, and Karkun Connect as source of truth.**

---

## Related Documents

| Document | Role |
|----------|------|
| [00-master-index.md](./00-master-index.md) | Initiative entry point, decisions, and reading order |
| [10-conversation-principles.md](./10-conversation-principles.md) | Constitutional conversation rules |
| [11-experience-blueprint.md](./11-experience-blueprint.md) | Complete Rukn experience — daily journey and emotional design |
| [02-system-architecture.md](./02-system-architecture.md) | Technical placement (HOW, not WHY) |
| [03-conversation-design.md](./03-conversation-design.md) | Dialogue patterns derived from this PRD |
| [04-style-guide.md](./04-style-guide.md) | Urdu conversation style and tone |
| [09-domain-lexicon.md](./09-domain-lexicon.md) | Canonical campaign terminology |
| [07-implementation-roadmap.md](./07-implementation-roadmap.md) | Phased delivery plan |
| [08-testing-certification.md](./08-testing-certification.md) | Quality gates and Rafeeq Test |

---

## Revision History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-07-17 | _TBD_ | Sprint 0 — structure and placeholders |
| 0.2 | 2026-07-17 | _TBD_ | Sprint 0.1 — cross-references, interaction layer terminology |
| 1.0 | 2026-07-17 | _TBD_ | Sprint 0.3 — complete PRD (authoritative product reference) |
