# KC-037C3 — Individual Karkun Performance Report

**Status:** Implemented  
**Gate:** [kc-037c3-arch009-gate.md](./kc-037c3-arch009-gate.md)

## What changed

Operational PDF for one selected Karkun from Report Center:

1. Cover · 2. Personal Profile · 3. Campaign Participation · 4. Activity Summary · 5. Participation Matrix · 6. Timeline · 7. Outstanding Work · 8. Recommendations · 9. Closing Summary · 10. Appendix

Built through Composer section `individual_karkun_performance` using person registry fields + KC-033 provider views + existing `buildJourneyTimeline`. PDF via the existing Urdu HTML pipeline. Report Center requires `scopeTarget.personId` (connected Karkun select).

## Unchanged

Composer · Registry architecture · Providers · Executive Campaign Report V2 · Individual Rukn Report

## Verify

```bash
npm run verify:kc-037c3
```
