# KC-0131.2 — Conversation Domain Model

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 (Approved Baseline) · DRDS-ARR-v1.0 · KC-0131.1 · KC-ARCH-009 gate [`kc-0131-2-arch009-gate.md`](./kc-0131-2-arch009-gate.md)  
**Module:** `src/conversation/domain/`  

---

## Purpose

Establish the **canonical conversation domain model** for Digital Rafeeq — the shared language and data structures reused by:

- Intent Engine (future)
- Secretary Engine (future)
- Voice Layer
- Confirmation Layer
- Future AI adapters

No future module should invent duplicate conversation entities. KC-0131.1 foundation remains the runtime lifecycle machine; this domain model is the shared vocabulary and structural graph that adapters map into.

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `enums/` | Canonical enumerations (speaker, phase, state, message, response, intent origin, confirmation, resolution) |
| `value-objects/` | Branded IDs and small values (ids, timestamp, locale, mode, status, priority, confidence) |
| `entities/` | Conversation, session, turn, speaker, participant, message, references, outcome |
| `factories/` | Structural constructors — no business behaviour |
| `validators/` | Structural integrity only — no authz / business rules |
| `mappers/` | Foundation ↔ domain mapper interfaces and structural bridges |

**Public entry:** `import { conversationDomain } from '@/conversation'` or `import { … } from '@/conversation/domain'`.

---

## Entity relationships

```text
Conversation
  ├── Participant[] ── Speaker?
  ├── Session[] 
  │     ├── Turn[]
  │     │     ├── Message (input / output)
  │     │     └── IntentReference[]
  │     ├── ConfirmationReference?
  │     └── ExecutionReference[]
  └── ConversationOutcome?
```

- **Conversation** — durable conversation identity (in-memory for now; not a Firestore SoR).  
- **ConversationSession** — one runtime episode; links optionally to foundation session id.  
- **ConversationTurn** — one exchange unit within a session.  
- **Speaker / Participant** — who speaks vs who is authorized in platform terms (role strings only).  
- **Message** — utterance / transcript / guidance text shape.  
- **IntentReference / ExecutionReference / ConfirmationReference** — opaque links for future engines; may cite foundation ids.  
- **ConversationOutcome** — structural completion summary.

---

## Value objects

Branded opaque types: `ConversationId`, `SessionId`, `TurnId`, `MessageId`, `Timestamp`, `Language`, `Locale`, `SpeakerRole`, `ConversationMode`, `ConversationStatus`, `ConversationPriority`, `ConversationConfidence`, plus reference ids.

Factories expose `as*` helpers for construction. Business logic must not depend on brand erasure.

---

## Enumerations (canonical vocabulary)

| Enum | Role |
|------|------|
| `SpeakerType` | user / rafeeq / system |
| `ConversationPhase` | Product-facing phase (includes confirming / executing) |
| `ConversationState` | Aligned 1:1 with KC-0131.1 foundation lifecycle states |
| `MessageType` | utterance, transcript, guidance, … |
| `ResponseType` | informational, clarification, confirmation, completion, error, suggestion |
| `IntentOrigin` | user_utterance, system_signal, placeholder, … |
| `ConfirmationState` | none → pending → accepted / declined / expired / superseded |
| `ResolutionState` | unresolved → resolved / ambiguous / out_of_scope / placeholder / … |

`conversationStateToPhase()` maps runtime state → phase for presentation without business rules.

---

## Extension strategy

1. **Prefer domain types** in new conversation modules.  
2. **Map** foundation runtime objects through `mappers/` — do not fork entities.  
3. **Do not** add repository / Firestore / React / AI dependencies to this package.  
4. Deepen `IntentReference` resolution in the Intent Engine without changing enum names.  
5. Secretary / voice adapters consume references and messages; they do not redefine `Conversation`.

---

## Reuse guidelines

| Do | Do not |
|----|--------|
| Import from `@/conversation/domain` | Copy entity shapes into feature folders |
| Use factories + structural validators | Encode authz or campaign rules here |
| Map foundation sessions/plans/confirmations | Mutate foundation public API |
| Keep brands on ids | Persist domain graph as a new SoR without product approval |

---

## Relationship to DRDS

| DRDS | Domain coverage |
|------|-----------------|
| §5 Identity / §6 Languages | `Locale`, `Language`, speakers |
| §11 Conversation Model | Conversation, Session, Turn, multi-intent references |
| §13 Decision Framework | Phase + State vocabulary; confirmation / execution references |
| §16 Architecture Constraints | Pure domain; repository-independent |
| §17 Confirmation / retention | ConfirmationReference; no transcript SoR |
| §21 Roadmap | Shared model for 0131.3+ |

---

## Relationship to KC-0131.1

- Foundation = **runtime lifecycle + placeholder planner + session services**.  
- Domain = **canonical vocabulary + entity graph + mapper ports**.  
- Mappers are **read-only bridges**; foundation verify suite must continue to pass unchanged.  
- Domain `ConversationState` values match foundation states exactly.

---

## Verification

```bash
npm run verify:kc-0131.2
npm run verify:kc-0131.1
npm run typecheck
```

---

## Explicit non-scope

AI / NLP · STT / TTS · Repository / Firestore · Execution · UI · Business validation · React
