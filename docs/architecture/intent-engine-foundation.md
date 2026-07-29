# KC-0131.3 — Intent Engine Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131.1 · KC-0131.2 · [`kc-0131-3-arch009-gate.md`](./kc-0131-3-arch009-gate.md)  
**Module:** `src/conversation/intent/`  

---

## Purpose

Provide the architecture that converts **canonical conversation domain inputs** into **standardized intent batches** for Digital Rafeeq.

This sprint defines the pipeline, contracts, registry, and validation — **not** language understanding, AI, or business execution.

---

## Intent pipeline

```text
Conversation Domain
        ↓
Candidate Intents          (IntentClassifier — placeholder)
        ↓
Normalization              (IntentNormalizer — placeholder)
        ↓
Validation                 (IntentValidator — structural / registry)
        ↓
Conflict Resolution        (IntentConflictResolver — model only)
        ↓
Resolved Intent Batch
        ↓
Placeholder Planning Input (codes for KC-0131.1 planner — no execution)
```

---

## Registry

`IntentDefinitionRegistry` holds metadata for:

`VISIT_UPDATE` · `FOLLOW_UP` · `IJTEMA_ATTENDANCE` · `BAITUL_MAAL` · `APP_REGISTRATION` · `CALL` · `WHATSAPP` · `REMINDER` · `SEARCH` · `NAVIGATION` · `REPORT` · `UNKNOWN`

Each definition includes display name, description, default priority, confirmation flag, and parameter names. **No execution behaviour.**

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `models/` | IntentDefinition, ResolvedIntent, IntentBatch, parameters, targets, confidence, status |
| `contracts/` | Classifier / Normalizer / Validator / Resolver / ConflictResolver / Pipeline / Service |
| `registry/` | Canonical intent definitions |
| `classifiers/` | Placeholder classifier (explicit codes → candidates) |
| `normalizers/` | Code canonicalization |
| `validators/` | Registry + structural checks |
| `resolvers/` | Resolve + conflict modeling |
| `pipeline/` | Orchestrates stages |
| `services/` | Façade + foundation planning-code bridge |

**Public entry:** `import { conversationIntent } from '@/conversation'` or `@/conversation/intent`.

---

## Confidence model

Levels: `HIGH` · `MEDIUM` · `LOW` · `UNKNOWN`  

Declared only — **not calculated** in KC-0131.3.

---

## Conflict model (architecture)

| Kind | Meaning |
|------|---------|
| `duplicate` | Same intent type appears more than once |
| `missing_parameters` | Required parameters flagged absent |
| `ambiguous_people` | Person target marked ambiguous |
| `conflicting_actions` | Multiple mutating action intents in one batch |
| `unsupported_type` | UNKNOWN / unsupported codes |

Conflicts are recorded on the batch — never auto-executed away.

---

## Extension points

| Future work | Hook |
|-------------|------|
| Real NLU / LLM classifier | Replace `IntentClassifier` |
| Parameter extraction | Enrich `IntentParameter` / `IntentTarget` |
| Authz-aware person binding | Domain services → targets (not inside this package) |
| Secretary Engine | Consume `IntentBatch` / planning codes |
| Confidence scoring | Fill `IntentConfidence.score` via dedicated calculator |

---

## Relationship to Conversation Domain (KC-0131.2)

- Input boundary: `IntentPipelineInput` carries conversation/session/turn/message ids, locale, text, and optional domain intent codes.  
- Domain `IntentReference` remains the conversation-graph link; engine produces richer `ResolvedIntent` batches.  
- Do not fork domain entities inside feature modules — map through this engine.

---

## Relationship to Conversation Foundation (KC-0131.1)

- `intentBatchToFoundationCollection()` maps a resolved batch to foundation `IntentCollection` for the **placeholder planner**.  
- No plan execution, WhatsApp, calling, or writes.

---

## Relationship to future Secretary Engine

Secretary Engine should:

1. Accept `IntentBatch` (or planning codes)  
2. Map supported codes to existing platform workflows  
3. Require confirmation per DRDS before any side effect  

Intent Engine must remain business-service independent; Secretary owns orchestration into existing services.

---

## Verification

```bash
npm run verify:kc-0131.3
npm run verify:kc-0131.1
npm run verify:kc-0131.2
npm run typecheck
```

---

## Explicit non-scope

AI / LLM · NLP · STT / TTS · Repository / Firestore · Business execution · UI / React · WhatsApp / calling / reminders / scheduling logic
