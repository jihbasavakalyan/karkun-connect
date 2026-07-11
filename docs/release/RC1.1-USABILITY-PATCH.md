# RC1.1 — Usability Patch (Connections)

**Date:** 11 July 2026  
**Baseline:** RC1 (`v1.0.0-rc1`) + auth certification `a2ea6c8` + regression `6ed1fa7`  
**Patch commit:** `51da962`

---

## Resolved

- Live Karkun search now supports token-based matching.
- Clearing search restores the complete eligible list.
- Connection modal layout improved with responsive scrolling.
- Fixed footer keeps actions visible.
- No changes to authentication, business rules, or connection engine.

---

## Out of scope (unchanged)

- Authentication architecture (frozen)
- Firestore schema / repository pattern
- Connection engine validation rules (one Rukn → many Karkuns; one Karkun → one Rukn)
- Medium/Low backlog items from [RC1-REGRESSION-REPORT.md](RC1-REGRESSION-REPORT.md)

---

## Verification

```bash
npm run lint
npm run build
npm run verify:assignments
```

---

## Related

- [CHANGELOG-1.0.md](CHANGELOG-1.0.md)
- [RC1-REGRESSION-REPORT.md](RC1-REGRESSION-REPORT.md)
