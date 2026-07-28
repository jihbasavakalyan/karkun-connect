# KC-0125 — Communication Template Inventory

**Status:** Reviewed → Edited → Verified → Approved  
**Scope:** Content quality only (no business logic / Firestore / campaign workflow changes)

## Sources of truth

| Library | Path | Count / notes |
|---------|------|----------------|
| V1 WhatsApp templates | `src/data/communication/defaultTemplates.ts` | Core operational + greetings |
| Workflow Urdu playbook | `src/data/communication/workflowUrduPlaybook.ts` | Assignment, execution, compliance, motivation, admin, guidance |
| Official Communication (OC) library | `src/lib/communication/officialCommunicationLibrary.ts` | Charter-aligned OC bodies |
| Context-aware Notify builder | `src/lib/communication/contextAware/messageBuilder.ts` | Personalized pending-matter drafts |
| Approved editorial copy | `src/lib/communication/contextAware/approvedEditorialCopy.ts` | Greeting, purpose, activity labels |
| Daily reports (Arkaan) | `src/data/dailyReports/arkanTemplates.ts` | Progress / motivation / final push |
| Campaign PDF Urdu | `src/lib/reporting/campaignReportUrdu.ts` | Report headings & KPI labels |
| Terminology dictionary | `src/lib/communication/urduTerminology.ts` | Preferred / avoid map |

Merged at runtime via `communicationStore` → `OFFICIAL_WHATSAPP_TEMPLATES` (playbook + OC appended).

## Audit coverage

| Surface | Status |
|---------|--------|
| Daily Reports | Approved |
| Mission Workspace / context-aware Notify | Approved (personalized bullets) |
| Weekly Ijtema reminders | Approved |
| Monthly Baitul Maal reminders | Approved |
| Visit reminders | Approved |
| App Registration (JIH) reminders | Approved |
| Follow-up reminders | Approved |
| Campaign completion / summary | Approved (playbook + OC + PDF) |
| Administrator reports | Approved (daily + PDF) |
| Inbox / pending activity notifications | Approved via context-aware builder |
| Success / empty-pending path | Approved (`الحمد للہ` completion copy) |
| WhatsApp preview | Uses same approved bodies |
| PDF reports | Noto Naskh Arabic + RTL reshape; typography padding improved |

## Approval gate

Only templates that pass:

1. No `URDU_AVOID` vocabulary  
2. Natural, personal, specific Urdu  
3. Context-aware pending lists (builder)  
4. `validateEditorialMessage` for Notify drafts  

Verification: `npm run verify:kc0125`
