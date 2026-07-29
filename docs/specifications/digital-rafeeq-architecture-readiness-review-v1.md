# Digital Rafeeq — Architecture Readiness Review (ARR)

**Document ID:** DRDS-ARR-v1.0  
**Primary specification:** [`digital-rafeeq-design-specification-v1.md`](./digital-rafeeq-design-specification-v1.md)  
**Review date:** 2026-07-29  
**Nature:** Review only — no application code, APIs, UI, Firestore, or repository changes  
**Final verdict:** **APPROVED WITH MINOR CLARIFICATIONS**  
**Freeze status:** **DRDS v1.0 (Approved Baseline)** — clarifications incorporated; specification frozen  

---

## 1. Executive Summary

DRDS v1.0 is constitutionally sound for governing Digital Rafeeq as Karkun Connect’s intelligent interaction layer. It preserves repository-first design, COS domain ownership, confirmation-before-action, role boundaries, Urdu-first respectful conversation, and disable-safe UI.

Cross-check against KC-0104, repository/Firestore architecture, KC-ARCH-001, the Automation Philosophy Charter, the Communication permission matrix, KC-003, and voice architecture found **no fatal contradictions**. Issues found were **ambiguities and soft tensions** that could cause implementers to invent parallel SoRs, misread “orchestrator” as owning Automation, confuse Engagement with a new Communication domain, or treat Voice First as voice-only UX.

Those issues were corrected with **surgical clarifications only** (no philosophy rewrite). All five open questions remain **Open**, with constraints recorded where existing docs already bound behaviour. KC-0131.1 may enter **KC-ARCH-009 Phases 0–3 and implementation planning** under this frozen baseline; coding still requires per-ticket ARCH-009 Go/No-Go.

**Confidence statement:** With the frozen baseline, KC-0131 implementation can begin without introducing architectural drift, duplicated business logic, direct Firestore access from the interaction layer, or repository-first violations — provided tickets cite DRDS and complete ARCH-009 gates.

---

## 2. Product Review

### Findings

| Check | Result | Evidence |
|-------|--------|----------|
| Scope clearly defined | **Pass** | §4.1 platform-wide; §4.5 non-scope; P2/P3 |
| Remains inside Karkun Connect | **Pass** | Vision, Mission, §15.2 |
| Not a generic AI assistant | **Pass** | P3, §9.2, §15.3 |
| Responsibilities complete | **Pass** | §10 five postures; §12 secretary contracts |
| Philosophy internally consistent | **Pass after clarification** | Voice First (§3.3) clarified vs P10 |

### Assessment

- Mission → Philosophy → Scope → Non-scope form a coherent product story.  
- Platform-wide scope correctly overrides historical KC-003 “Admin later” **as constitution**, while ARR clarification preserves optional **Rukn-first delivery sequencing** for early slices.  
- Companion + secretary postures are product roles, not auth roles — correctly stated.  
- No feature in DRDS expands into general AI; decline-and-redirect is explicit.

### Residual product notes (non-blocking)

- Early sprint planning should state whether KC-0131.1 ships Rukn surfaces first (allowed) while Admin remains in-constitution.  
- “Organizational mission outcomes” in §3.1 is broader than “campaign” alone; still bounded by “defined by Karkun Connect,” so acceptable.

**Product gate:** **Approved**

---

## 3. Architecture Review

### Findings

| Check | Result | Evidence |
|-------|--------|----------|
| Repository-first preserved | **Pass** | P5–P8, §3.7–3.8, §16.2–16.4 |
| COS remains authoritative | **Pass after clarification** | §4.2 now maps UI modules → COS domains; Communication → Engagement |
| No duplicate business logic | **Pass** | P7, §16.3, Validation stage §13 |
| No parallel data sources | **Pass** | §3.7, §17.6, Companion Ledger note |
| No direct Firestore writes | **Pass after clarification** | §13 façade rule: services/stores/repos only |
| Existing workflows remain valid | **Pass** | P9, P11, §16.7 |
| Pure interaction layer | **Pass after clarification** | §10.2 presenter/orchestrator boundary; §16.1 |

### Soft tensions resolved

1. **Presenter (KC-020) vs Orchestrator (DRDS §10.2)** — Clarified: orchestration = conversation orchestration; presenter of NBA/engine outputs; no invented action codes; no parallel execution engine.  
2. **Engagement vs Communication** — Clarified COS mapping table.  
3. **Connection vs Assignment** — Prefer Connected Karkuns / Connection; §13.2 wording updated.  
4. **Dual intelligence paths (R4)** — Acknowledged debt; Foundation must consolidate toward §13, not add a third path. Tracked as prerequisite, not a DRDS failure.

### Aligned corpora

- KC-0104 ownership / SoR model  
- Repository layer + Firestore-via-repositories  
- KC-ARCH-001 durable writes / no silent success  
- Communication permission matrix (Connected Karkuns; Admin vs Rukn)  
- Automation charter human Execute / Support assist  

**Architecture gate:** **Approved**

---

## 4. Security Review

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Confirmation rules complete | **Pass** | §17.1 + §13.2 read-only exemption |
| Permission boundaries | **Pass** | §17.2; matrix cited |
| Role-aware behaviour | **Pass** | §17.3; Admin coaching vs Rukn personal; no Secretary auth role |
| Microphone behaviour | **Pass** | §17.5; push-to-talk; no always-on without review |
| Privacy principles | **Pass** | §17.4; no cross-role exfiltration |
| Audit requirements | **Pass with open future** | §17.7 existing trails + structured companion logs; transcript SoR deferred (OQ-DRDS-04) |

### Assessment

Confirmation matrix covers read, navigate, draft, send, CRUD, batch, and Admin-sensitive actions. Security correctly states UI hiding ≠ authorization. OQ-DRDS-03 remains open but is **constrained**: aggregates/coaching allowed; employee surveillance forbidden.

**Security gate:** **Approved**

---

## 5. UX Review

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Personality consistent | **Pass** | §9 IS / IS NOT; Rafeeq Test |
| Urdu natural / respectful | **Pass** | §6, §8; preferred phrases; avoid jargon |
| Address forms consistent | **Pass** | محترم / باجی / محترمہ; identity رفیق / رفیقہ |
| Non-robotic responses | **Pass** | §8.3–8.4; style corpus retained |
| Reminder philosophy non-pressure | **Pass** | §14 tiers; never shame/compare; KC-020 alignment |
| Conversation minimizes effort | **Pass** | Multi-intent + single confirmation; concise guidelines |

### Assessment

Voice First vs additional layer clarified to prevent voice-only UX mistakes. Gender-unknown default (OQ-DRDS-01) and typography (OQ-DRDS-05) remain open and are **non-blocking** for Conversation Foundation if neutral register is used and gender is not guessed.

**UX gate:** **Approved**

---

## 6. Future-proofing Review

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Future modules without redesign | **Pass** | §4.3–4.4 expansion rule + §19.1 register checklist |
| Plugin architecture feasible | **Pass** | §19.2 adapter-based (intent/knowledge/channel/presentation); not unconstrained marketplace |
| Conversation engine independent | **Pass** | §16.5 modular separation |
| Language layer independent | **Pass** | §6.3; §19.3 presentation packs |
| Voice layer replaceable | **Pass** | §7.4; §16.6; §19.4 |
| Decision engine modular | **Pass** | §13 pipeline; stages separable from providers |

Digital Rafeeq correctly has **no COS SoR domain** — interaction layer attachment model scales without inventing ownership.

**Future-proofing gate:** **Approved**

---

## 7. Open Questions Status

| ID | Disposition | Rationale |
|----|-------------|-----------|
| OQ-DRDS-01 | **Keep Open** | No corpus default for unknown gender; “must not guess” already sufficient for Foundation |
| OQ-DRDS-02 | **Keep Open** | Numeric caps undefined; quiet-hours *override* role constrained from permission matrix |
| OQ-DRDS-03 | **Keep Open** | Transcript visibility undecided; surveillance ban and aggregate coaching already constrained |
| OQ-DRDS-04 | **Keep Open** | Current in-memory behaviour documented; future durable audit requires product/compliance decision — do not invent collection |
| OQ-DRDS-05 | **Keep Open** | Typography preference only; non-architectural |

**No open question was closed by inventing behaviour.**

### Foundation non-blocking rule

KC-0131.1 may proceed if: gender is not guessed; proactivity defaults to Silent/Reactive; no Admin transcript UI; no new conversation SoR collection; typography deferred.

---

## 8. Risks Identified

| ID | Risk | Severity | Mitigation in frozen DRDS |
|----|------|----------|---------------------------|
| ARR-R1 | Dual Q&A paths (runtime vs ops answers) diverge further | **High** | R4 + §16.8; Foundation must not add a third path; inventory prerequisite |
| ARR-R2 | Misread Orchestrator as owning Automation | **Medium** | §10.2 presenter/orchestrator clarification |
| ARR-R3 | Invent Communication or conversation SoR | **Medium** | §4.2 COS mapping; §17.6 Companion Ledger note |
| ARR-R4 | Direct Firestore / ad-hoc writes from voice handlers | **High** | §13 façade rule |
| ARR-R5 | Legacy vs canonical metrics in briefings | **Medium** | R5; prefer cycle adapters |
| ARR-R6 | Voice-only UX from “Voice First” | **Low** | §3.3 / P10 compatibility note |
| ARR-R7 | KC-003 vs DRDS thrash in tickets | **Medium** | §21.6 sequencing clarification + precedence |
| ARR-R8 | ARCH-009 skipped for “just chat” | **High** | Document Control Rule + R12 |
| ARR-R9 | Write-via-conversation without durability | **High** | KC-ARCH-001; §18.3; R10 |
| ARR-R10 | Intrusive proactivity before caps decided | **Low** | Default Silent/Reactive until OQ-DRDS-02 |

---

## 9. Recommended DRDS Changes (applied)

Only clarifications required by ARR were applied. **No philosophy change.**

| # | Change | Why |
|---|--------|-----|
| 1 | Status → **DRDS v1.0 (Approved Baseline) — Frozen** + freeze rule | Formal freeze |
| 2 | §3.3 Voice First vs P10 compatibility | Resolve apparent rule conflict |
| 3 | §4.2 COS domain mapping; Engagement; Connection terminology; Reporting row | Prevent architectural drift / fake domains |
| 4 | §10.2 Presenter / orchestrator boundary | Align with KC-020; reduce ownership risk |
| 5 | §13 Execution façade + “Must not” expansions | Close Firestore/SDK ambiguity |
| 6 | §13.2 “Connection ownership change” | Terminology consistency |
| 7 | §17.6 Companion Ledger + OQ-DRDS-03 constraints | Prevent parallel transcript DB; bound privacy |
| 8 | §21.6 KC-003 sequencing + dual decision tests | End Rukn-first vs platform-wide thrash |
| 9 | Open Questions table enriched; Foundation non-blocking note | Resolve what can be constrained without inventing behaviour |
| 10 | Approval + Revision History 1.0-ARR | Record freeze |

**Not changed:** Mission, non-negotiable principles P1–P11 intent, personality, confirmation philosophy, roadmap spine KC-0131.1–4, capability boundaries against general AI.

---

## 10. Implementation Readiness — KC-0131.x

| Ticket | DRDS guidance sufficient? | Prerequisites before coding |
|--------|---------------------------|-----------------------------|
| **KC-0131.1 Conversation Foundation** | **Yes** | KC-ARCH-009 Phases 0–3 + Go/No-Go; inventory dual intelligence paths and pick consolidation target (no third path); session lifecycle vs in-memory voice history; `digitalRafeeq.enabled` / bootstrap UX contract; optional Rukn-first slice statement; gender neutral fallback (no guess) |
| **KC-0131.2 Intent Engine** | **Yes** | Person/connection/search resolution service contracts; entity binding within authz; out-of-scope decline behaviour |
| **KC-0131.3 Secretary Engine** | **Yes** | Map each secretary action to existing COS/automation/navigation entry points; WhatsApp = assist/`wa.me` (not new ESP); calling = prepare/queue (not PBX); confirmation + durable writes |
| **KC-0131.4 Role-aware Intelligence** | **Yes** | Permission matrix test plan; proactive tier defaults; OQ-DRDS-02/03 product inputs if leaving Silent/Reactive |

### Consistency review summary

| Issue class | Result |
|-------------|--------|
| Duplicate sections | None material |
| Conflicting terminology | Addressed (Connection/Assignment; Engagement/Communication; presenter/orchestrator) |
| Conflicting rules | Voice First vs P10 clarified |
| Missing definitions | Façade rule and COS mapping added |
| Circular dependencies | None (Rafeeq → services → repos) |
| Scope creep | Guarded by §15; monitored via R1 |
| Architectural drift | Guarded by freeze + COS mapping |

---

## 11. Final Verdict

# APPROVED WITH MINOR CLARIFICATIONS

Clarifications have been incorporated into the primary specification.

### Freeze declaration

**DRDS v1.0 (Approved Baseline)** is **frozen** as of 2026-07-29.

Future Digital Rafeeq implementation **must remain aligned** with this specification unless a **formally approved DRDS revision** is made.

### Authority for next work

- Sprint planning for **KC-0131.1–0131.4** may proceed under this baseline.  
- Each implementation ticket must cite **DRDS v1.0 (Approved Baseline)** and complete **KC-ARCH-009** Phases 0–3 + Go/No-Go before coding.  
- Supporting detail may be drawn from KC-003, voice architecture, COS, and communication docs **where consistent** with the frozen baseline; on conflict, **DRDS prevails**.

---

## Review Sign-off Record

| Perspective | Verdict |
|-------------|---------|
| Product | Approved |
| Architecture | Approved |
| Security | Approved |
| UX | Approved |
| Future-proofing | Approved |
| Overall | **APPROVED WITH MINOR CLARIFICATIONS → Frozen Baseline** |

---

*End of Architecture Readiness Review — DRDS-ARR-v1.0*
