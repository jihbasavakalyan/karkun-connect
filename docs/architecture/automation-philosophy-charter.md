# KC-020 — Automation Philosophy & Product Charter

**Status:** ✅ COMPLETE  
**Sprint:** KC-020 (Execution Context & Automation Framework — Foundation)  
**Nature:** Philosophy, architecture, and design principles. This sprint intentionally does **not** automate execution itself.

Future implementation sprints (Phone Call, Meeting, Follow-up, Compliance, Digital Rafeeq enhancements, Notifications, Voice, AI recommendations, etc.) shall build upon this charter **without redefining its philosophy**.

---

## Definition

Automation in Karkun Connect is:

> Quiet, contextual assistance that helps advance campaign objectives while preserving human relationships and human decision-making.

Automation is **NOT**:

- Task enforcement
- Activity monitoring
- Employee tracking
- Workflow policing

---

## Product Philosophy

Automation exists to **reduce effort**.

Never to increase reporting.

Every automation should make a Rukn think:

> "That was helpful."

Never:

> "Now I have another thing to update."

---

## Responsibilities of Automation

Automation has only four responsibilities.

### Remember

Remember what people naturally forget.

Examples: previous interaction, pending follow-up, worker history, campaign continuity.

### Prepare

Prepare information before execution.

Examples: today's priorities, relevant worker context, pending objectives, upcoming activities.

### Recommend

Suggest the most helpful next action.

Examples: reconnect, schedule meeting, follow-up, update contact.

Recommendations never become mandatory.

### Learn

Improve future recommendations using campaign history.

Learning improves suggestions.

Learning never evaluates people.

---

## Responsibilities of People

Execution always belongs to people.

Only people can: decide, call, meet, counsel, encourage, build relationships.

Automation never replaces these responsibilities.

---

## Design Principles

Every automation must satisfy the following principles.

| Principle | Meaning |
|-----------|---------|
| **Mission Before Metrics** | Measure campaign progress — not individual productivity. |
| **Relationships Before Records** | Capture interactions only because they strengthen relationships. Never collect information without purpose. |
| **Guidance Before Reporting** | Help people move forward — do not simply record history. |
| **Trust Before Control** | Support people — never supervise people. |
| **Assistance Before Automation** | Automate preparation — never automate responsibility. |
| **Context Before Notification** | Reminders must be meaningful — never send reminders simply because time has elapsed. |
| **Invisible Intelligence** | The best automation is almost invisible. Users should experience better execution — not more software. |

---

## Automation Layers

Automation operates in three layers.

### Execute

Human action.

Examples: call, visit, meeting, attendance.

Automation does not interrupt.

### Support

Automation prepares and recommends.

Examples: previous context, suggested follow-up, today's priorities, worker summary.

This is Digital Rafeeq's primary layer.

### Reflect

Campaign insights after execution.

Examples: weekly progress, trends, objectives, areas needing attention.

Reflection never interrupts execution.

---

## Digital Rafeeq

Digital Rafeeq is a **presenter**.

- It does not invent decisions.
- It communicates automation outputs naturally.
- It should always sound supportive.
- Never managerial.

Structured recommendations are produced by the Automation Engine (`src/execution`). Digital Rafeeq converts them into natural Urdu — it does not invent action codes.

---

## Administrator Experience

Administrators receive **campaign insight**.

Not employee surveillance.

Dashboards exist to identify where support is needed.

Not to rank people.

---

## Success Criteria

Automation is successful when:

- More workers receive attention
- Follow-ups are remembered
- Meetings become easier to organize
- Campaign objectives progress
- Administrative effort decreases
- Users feel supported

Automation is **NOT** successful because:

- More data exists
- More buttons were pressed
- More notifications were sent
- More reports were generated

---

## Permanent Product Rule

Every future feature must answer **YES** to all five questions:

1. Does this help achieve a campaign objective?
2. Does it strengthen relationships?
3. Does it reduce effort?
4. Does it fit Execute, Support, or Reflect?
5. Will users feel supported instead of supervised?

If any answer is **NO**, redesign the feature before implementation.

---

## Automation Constitution

> Automation quietly supports the mission.  
> People perform the mission.  
> Relationships remain the priority.  
> Technology serves people.  
> Never the other way around.

---

## Technical Foundation (KC-020)

| Capability | Location |
|------------|----------|
| Execution Context | `src/execution/types.ts` |
| Automation Engine | `src/execution/AutomationEngine.ts` |
| Policy Engine | `src/execution/policies/` |
| Event Bus | `src/execution/eventBus.ts` |
| Next Best Action | `src/execution/nextBestAction.ts` |
| Objective Evaluation | `src/execution/objectiveEvaluation.ts` |
| Rafeeq Presentation | `src/execution/rafeeq/presentNextBestAction.ts` |
| Architecture diagram | [`execution-automation-framework.md`](./execution-automation-framework.md) |

Golden rule lifecycle:

```text
Execution action
  → Execution Context
  → Automation Engine starts
  → Human execution
  → Outcome captured
  → Campaign objective evaluated
  → Next Best Action generated
  → Execution Context closed
```

---

## Sprint Closure

**KC-020 is officially complete.**

This charter is the permanent product rule for automation in Karkun Connect.
