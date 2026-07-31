# KC-035 — Digital Rafeeq 2.0

**Status:** Canonical master architecture (frozen contract for all KC-035 sub-sprints)  
**Product role:** Digital Operational Secretary of Karkun Connect  
**Standards:** [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) · [KC-033](./kc-033-canonical-metric-registry.md)

> Future KC-035 implementation prompts should **reference this document** instead of restating architecture.

---

## Vision

Digital Rafeeq is **not** a chatbot, AI assistant, or voice-search feature.

It is the **Digital Operational Secretary** of Karkun Connect.

**Ultimate objective:** NO CLICK · NO TOUCH · JUST VOICE

A Rukn or Administrator should complete an entire day's campaign work through natural Urdu conversation. The application becomes secondary; the conversation becomes primary.

---

## Product principles

Behave like an experienced Jamaat secretary:

- remember · understand · guide · execute · advise · converse naturally

Never behave like a command-line interface.

---

## Layered architecture

```
Conversation Engine          (KC-035A — Remember)
        ↓
Dialogue Manager             (KC-035D — Manage turns)
        ↓
Intent Engine                (KC-035B — Understand)
        ↓
Workflow Engine              (KC-035C — Orchestrate)
        ↓
Recommendation Engine        (KC-035E — Advise)
        ↓
Voice Navigation             (KC-035F — Operate)
        ↓
Existing Services / Repositories
        ↓
KC-033 Canonical Providers
```

Secretary personality & Urdu polish: **KC-035G** (cross-cutting tone refinement).

Every layer has **one responsibility**. No duplicated business logic.

---

## Single responsibility

| Layer | Responsibility |
|-------|----------------|
| Conversation | Remembers operational context & history |
| Dialogue | Manages interruptions, switches, corrections, repair, multi-turn control |
| Intent | Understands Urdu into typed intents + entities + confidence |
| Workflow | Orchestrates validated execution via existing services |
| Recommendation | Advises next-best / daily guidance (no alternate metrics) |
| Voice Navigation | Full app control without mandatory clicks |
| Repositories / Matrix / adapters | Execute domain mutations |
| KC-033 providers | Calculate operational truth |
| Secretary responses | Speak administrative Urdu |

---

## Engineering principles

### Canonical data only

Every response uses **KC-033 operational truth**. Never duplicate calculations or invent alternate metrics.

### No business logic in engines

Conversation, Dialogue, Intent, Workflow, and Recommendation **orchestrate only**. They never reimplement visit, attendance, payment, app registration, assignment, or reporting rules.

### Existing services first

Reuse repositories, Matrix services, campaign/reporting/attendance/payment services. Never reimplement existing functionality.

### Strong typing & registries

Central registries; no switch-heavy discovery; modular, testable, extensible packages.

---

## Urdu principles

Administrative Urdu only. Avoid software / AI wording.

| Use | Avoid |
|-----|--------|
| جی۔ | Loading… |
| محفوظ کر دیا گیا۔ | Opening… / Processing… |
| اس کارکن کی تازہ صورتحال یہ ہے۔ | AI-generated filler |
| مزید ایک کارروائی باقی ہے۔ | Machine-translation tone |

---

## Conversation & context rules

- Conversation continues naturally across turns (no repeated greetings; no context restart).
- Remember: current worker, campaign, report, workflow, clarification.
- Forget only when workflow completes or the user changes context.
- Never guess — clarify naturally (e.g. ambiguous names).

---

## Confidence rules (centralized)

| Band | Range | Behaviour |
|------|-------|-----------|
| Execute | ≥ 0.90 | Ready |
| Confirm | 0.60–0.89 | Ask confirmation |
| Clarify | &lt; 0.60 | Clarify |

Owned by Intent confidence policy; Dialogue/Workflow consume bands — do not fork thresholds.

---

## Workflow rules

Validate → execute existing service → refresh canonical data → secretary response → suggest next action.

## Recommendation rules (KC-035E)

Always recommend a Next Best Action. Never end a workflow without guidance.

## Voice rules (KC-035F)

Everything should eventually work through voice. No feature requires mandatory clicking. Keyboard becomes optional.

## Security

Confirmation required for: Delete · Bulk Update · Reset · Remove · Merge.  
Routine operations may execute immediately when confidence band is Execute.

## Performance

Lightweight engines; no unnecessary re-renders; no duplicated repository calls; cache where appropriate.

---

## Package map (canonical)

| Package | Sprint |
|---------|--------|
| `src/conversation/engine/` | KC-035A |
| `src/intents/` | KC-035B |
| `src/workflows/` | KC-035C |
| `src/dialogue/` | KC-035D |
| `src/recommendations/` | KC-035E |
| `src/navigation/` | KC-035F |
| `src/secretary/` | KC-035G |

Public façade methods live on `DigitalRafeeqService` without embedding domain rules.

---

## Sub-sprint roadmap

| Sprint | Layer | Status |
|--------|-------|--------|
| **KC-035A** | Conversation Engine (Remember) | ✅ Production Complete |
| **KC-035B** | Natural Urdu Intent Engine (Understand) | ✅ Production Complete |
| **KC-035C** | Operational Workflow Engine (Execute) | ✅ Production Complete |
| **KC-035D** | Dialogue Manager (Manage) | ✅ Production Complete |
| **KC-035E** | Operational Recommendation Engine (Advise) | ✅ Production Complete |
| **KC-035F** | Voice Navigation & Voice Operation | ✅ Production Complete |
| **KC-035G** | Secretary Personality & Conversation Polish | ✅ Production Complete |
| **KC-035R1** | Operational Recovery (wire live voice → KC-035 pipeline) | ✅ Production Complete |

Gates: [035A](./kc-035a-arch009-gate.md) · [035B](./kc-035b-arch009-gate.md) · [035C](./kc-035c-arch009-gate.md) · [035D](./kc-035d-arch009-gate.md) · [035E](./kc-035e-arch009-gate.md) · [035F](./kc-035f-arch009-gate.md) · [035G](./kc-035g-arch009-gate.md) · [035R1](./kc-035r1-arch009-gate.md)

**Live voice path (KC-035R1):** `DigitalRafeeqVoiceDrawer` → `runKc035OperationalTurn` → `DigitalRafeeqService.processDialogueTurn` (Dialogue → Intent → Workflow / Navigation / Search) → secretary Urdu → TTS. MVP `runRafeeqTurn` remains fallback for unresolved utterances only.

---

## Acceptance criteria (program)

Digital Rafeeq should feel like talking to an experienced Jamaat secretary rather than operating software. An Administrator should perform almost all daily campaign activities through natural Urdu conversation with minimal or no manual interaction.

Every sub-sprint must:

- Preserve this architecture
- Maintain backward compatibility with prior KC-035 layers
- Pass ARCH-009 + production certification
- Keep Karkun Connect releasable

---

## Mandatory release process (every KC-035 sub-sprint)

Implementation ✅ · Verification ✅ · Typecheck ✅ · Scoped ESLint ✅ · Commit ✅ · Push ✅ · GitHub Verified (`HEAD == origin/main`) ✅ · Vercel Deployment Ready ✅ · Production SHA == latest commit ✅ · Production Smoke ✅ · Release Complete ✅

If GitHub has the commit but Vercel creates no deployment within ~2 minutes: investigate auto-deploy / branch / queue / skip; perform **manual Production redeploy** if required. Production certification is mandatory.
