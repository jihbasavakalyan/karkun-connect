# KC-037 — Version 1 Administrator-Only Reporting Policy

**Status:** Product scope lock (Version 1 / current campaign)  
**Type:** Configuration / product policy (not a new reporting feature)  
**Parent:** [KC-037 Executive Report Framework V2](./kc-037-executive-report-framework-v2.md) · [KC-037B Report Center](./kc-037b-report-center.md)  
**Standards:** [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md)

> Report Center is an **executive decision-support** module. Throughout the current campaign it remains **Administrator-only**. Rukn personal reporting is deferred until after campaign completion.

---

## Version 1 access model

### Administrators may

- Open Report Center (`/admin/reports`)
- Generate, preview, download PDF, and export reports
- Generate ZIP bundles (future, Admin-only when added)
- Share reports **manually** (e.g. Arkaan WhatsApp Group)

### Rukns must not have

- Report Center
- Report generation / preview / PDF download
- Report archive / export
- Personal Reports, My Performance Report, Report History, Report Menu

### Explicit non-goals (do not implement now)

- Automatic distribution
- WhatsApp / email integration
- Scheduled report generation
- Secure Rukn-facing report archive

### Executive workflow (Version 1)

Administrator → Generate Report → Preview → Download PDF → Share manually in Arkaan WhatsApp Group.

---

## Enforcement (evidence)

| Control | Location | Behaviour |
|---------|----------|-----------|
| Route shell | `AppRouter.tsx` — `/admin/*` | `ProtectedRoute allowedRole="administrator"` |
| Report Center page | `AdminReportCenterPage` under `/admin/reports` | Only reachable inside Admin shell |
| Admin nav | `adminNavigation.ts` | “Reports” → `ROUTES.ADMIN_REPORTS` |
| Rukn nav | `RuknLayout.tsx` | No Reports item |
| Legacy path | `/rukn/reports` | Redirects to Campaign Record (no Report Center) |
| Reporting libs | `src/lib/reporting/**` | Client-side; no Rukn page imports |

**Architecture unchanged:** Report Center → Composer → Section Registry → KC-033 Providers → Renderer.

---

## Rukn Version 1 product scope (unchanged)

Dashboard · Connected Karkuns · Visits · Invited for Weekly Ijtema · Today's Weekly Ijtema Attendance · Baitul Maal · Notifications · Digital Rafeeq.

---

## KC-ARCH-009 gate (this policy lock)

### Phase 0 — Classification & impact

- **Type:** Configuration (product scope lock) + minimal UI label cleanup
- **Root cause N/A** (not a bug) — access already Admin-gated; policy formalizes Version 1
- **Impact Matrix:** Authorization / Routing / Voice labels (Y — confirm + relabel); Reporting pipeline / Firestore / metrics / generation logic (N — frozen)

### Phase 1 — Regression risk

| Area | Risk | Notes |
|------|------|-------|
| Admin Report Center | LOW | No generation logic change |
| Rukn shell / nav | LOW | No Reports nav today |
| Digital Rafeeq quick action | LOW | Rukn label only: “Reports” → “Campaign Record” |
| Persistence / Firestore | N/A | No writes |

### Phase 2 — Implementation plan

1. Record this policy document
2. Relabel Rukn Rafeeq “Reports” affordance so it does not imply Report Center
3. Annotate Report Center entry docs/comments as Admin-only for V1
4. Do **not** change composer, providers, PDF exporters, or report types

### Phase 3 — Verification

- Admin: `/admin/reports` loads Report Center under Admin role
- Rukn: no Report Center nav; `/rukn/reports` → Campaign Record; no `@/components/reporting` / `@/lib/reporting` under `src/pages/rukn`
- Rukn Rafeeq quick actions do not show a “Reports” label

### Go / No-Go

| Question | Answer |
|----------|--------|
| Touches report generation / KPI math? | No |
| Touches Admin Report Center behaviour? | No (docs/comments only) |
| Safe to ship without deploy of reporting stack? | Yes — policy + label only |
| Ready to code? | **GO** |

### Phase 5 certification

**READY** — policy lock + label cleanup only; reporting architecture frozen.
