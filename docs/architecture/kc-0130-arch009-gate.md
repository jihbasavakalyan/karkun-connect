# KC-0130 — KC-ARCH-009 Gate (Intelligent Official Communication Generation)

**Classification:** Enhancement (communication presentation / workflow)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Root cause (proven):** Implementation — Official Briefing fills `{{PendingObjectives}}` from `buildTodaysFocusItems(...).pendingLabel` (e.g. repeated “Visit Pending”), while Rukn Connections cards use numeric pending counts from `buildCampaignExecutionSummary` via `buildRuknWorkspacePending`. Preview and card diverge; WhatsApp text is generic/repetitive.

## Phase 0 — Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | `OfficialBriefingModal` — status + intelligent body; optional note/remarks/closing |
| Lib / communication | Y | Workspace campaign summary (card SSoT) + Urdu briefing generator; stop joining focus pending labels for Communicate |
| Official engine vars | Y (presentation) | `PendingObjectives` / related aliases become numeric/natural summary for consistency |
| Campaign calculations | N | Read-only reuse of `buildCampaignExecutionSummary` |
| Person resolution / assignment / repos / Firestore / APIs | N | Forbidden |
| Auth / bootstrap / dashboard math | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Campaign arithmetic | LOW | No new math |
| Official library templates | MEDIUM | PendingObjectives wording changes for Rukn recipients — becomes numeric summary, not label spam |
| Communicate one-click | MEDIUM | Body generated from summary; verify card parity for R035-style data |
| Persistence | LOW | Existing sendIndividualMessage only |

### HIGH items

None.

## Phase 2 — Plan

1. `buildRuknWorkspaceCampaignSummary(ruknId)` — single object (connected, completed/pending per module, lastCommunication, overallStatus) from existing execution summary + card status helpers.
2. Refactor card pending helper to derive from that summary (identical numbers).
3. `generateIntelligentOfficialBriefingUrdu(...)` — greeting → acknowledgement → status numbers → only pending lines → encouragement/appreciation → optional free-text → closing.
4. Wire `OfficialBriefingModal` to summary + generator; preview shows Recipient, Campaign, Overall Status, message; editable Personal Note / Additional Remarks / Closing Message.
5. Replace focus-label `PendingObjectives` join in official variables with structured pending summary string.
6. Verify script: card summary === briefing summary; no “Visit Pending” spam; no `{{`; appreciation when all pending 0.
7. No schema/repo/API/campaign-rule changes.

**Rollback:** Revert summary/generator/modal/engine var + verify/gate.

## Phase 3 — Verification

- `npm run lint` / `typecheck` / `build` / `verify:kc-0130`
- Card vs briefing field parity
- Dynamic omit of zero-pending sections; appreciation when complete
- Prod smoke after deploy

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES — PendingObjectives from focus labels vs card numerics |
| Software problem? | YES |
| Config/ops only? | NO |
| Bootstrap / auth / repos / Firestore / campaign math? | NO |
| Existing workflows? | YES — Official Communicate preview body; mitigated by verify + card parity |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

- `npm run verify:kc-0130` exit 0 — card/summary parity; no Visit Pending spam; appreciation path; OC vars clean
- `npm run lint` / `typecheck` / `build` pass
- No Firestore / repo / campaign calculation changes

## Phase 5 — Certification

**READY**

## Phase 6 — Post-deploy

Pending production deploy + multi-Rukn parity checks.
