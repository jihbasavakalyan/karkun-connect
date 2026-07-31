# KC-037B — Report Center & Multi-Report Framework

**Status:** Implemented  
**Parent:** [KC-037](./kc-037-executive-report-framework-v2.md) · [KC-037A Composer](./kc-037a-report-composer.md)  
**Gate:** [KC-037B ARCH-009](./kc-037b-arch009-gate.md)

## Entry point

Admin **Report Center** → `/admin/reports` (`ROUTES.ADMIN_REPORTS`)

The Campaign / Weekly Ijtema **Generate Report** button navigates here (configuration workflow), then PDF generation uses:

`generateConfiguredReport` → `composeReport` → KC-033 providers → `downloadCampaignReportPdf`

## Functional in this release

| Capability | Status |
|------------|--------|
| Executive Campaign Report + PDF | Available |
| Other report types | Registered, selectable in UI as disabled/soon |
| Dashboard / Excel / CSV / JSON | Placeholders |
| Section checkboxes | Driven by Section Registry metadata |
| Presets | Built-in catalog (enabled presets apply config) |
| Composer validation | Rejects unavailable types, inactive sections, unsupported outputs, missing deps/providers |

## Connection ≠ Visit

Preview and Executive PDF copy preserve: **Connection** = administrative assignment; **Visit** = personal physical meeting.

## Verify

```bash
npm run verify:kc-037b
npm run verify:kc-037a
```
