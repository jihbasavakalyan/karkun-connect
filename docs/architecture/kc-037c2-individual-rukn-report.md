# KC-037C2 — Individual Rukn Performance Report

**Status:** Implemented  
**Gate:** [kc-037c2-arch009-gate.md](./kc-037c2-arch009-gate.md)

## What changed

Operational PDF for one selected Rukn from Report Center:

1. Cover · 2. Profile · 3. Campaign Summary · 4. Activities · 5. Assigned Karkun list (ASN-sorted) · 6. Performance · 7. Recommendations · 8. Closing · 9. Appendix

Built through Composer section `individual_rukn_performance` using CampaignReportModel + KC-033 person views. PDF via existing Urdu HTML pipeline.

## Unchanged

Composer · Registry architecture · Providers · Executive Campaign Report V2

## Verify

```bash
npm run verify:kc-037c2
```
