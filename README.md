# Karkun Connect

**Version 1.0.0 RC1** — Campaign management platform for JIH Basavakalyan pilot.

Karkun Connect helps administrators and Rukns coordinate campaign outreach: managing people masters, assigning Karkuns to Rukns, recording Annexure-1 visits, tracking compliance (Ijtema, JIH registration, monthly reporting, Bait-ul-Maal), and monitoring follow-up.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Demo Accounts

All demo passwords are `password`.

| Role | Email | Notes |
|------|-------|-------|
| Administrator | `admin@demo.com` | Full admin portal |
| Rukn (Male) | `rukn1@demo.com` | First active male Rukn |
| Rukn (Male) | `rukn2@demo.com` | Second active male Rukn |
| Rukn (Female) | `rukn3@demo.com` | First active female Rukn |
| Rukn (Female) | `rukn4@demo.com` | Second active female Rukn |

Use **Remember Me** on the login screen to persist the session across browser restarts. Without it, the session is kept for the current tab only.

## Build & Quality Gates

```bash
npm run build          # Production build
npm run lint           # ESLint
npm run verify:rc1     # Full RC1 regression suite
```

Individual verification scripts:

```bash
npm run verify:routes
npm run verify:auth
npm run verify:data
npm run verify:assignments
npm run verify:compliance
```

## Application Modules

| Module | Admin route | Description |
|--------|-------------|-------------|
| Dashboard | `/admin` | Command center metrics and quick actions |
| Campaign | `/admin/campaign` | Active campaign identity and duration |
| Rukn | `/admin/rukn` | Rukn master (49 records) |
| Karkun | `/admin/karkun` | Karkun registry (~493 production records) |
| Assignments | `/admin/assignments` | Rukn ↔ Karkun assignment engine |
| Execution | `/admin/execution` | Annexure-1 monitoring and reports |
| Compliance | `/admin/compliance` | Ijtema, JIH, Bait-ul-Maal |
| Follow-up | `/admin/follow-up` | Post-visit follow-up queue |
| Settings | `/admin/settings` | RC1 configuration reference |
| Help | `/admin/help` | Workflow guides |

Rukn portal routes: `/rukn`, `/rukn/my-karkun`, `/rukn/available-karkun`, `/rukn/campaign-record`, visit flow via Annexure-1.

## Documentation

| Document | Location |
|----------|----------|
| User Guide | [docs/guides/user-guide.md](docs/guides/user-guide.md) |
| Administrator Guide | [docs/guides/administrator-guide.md](docs/guides/administrator-guide.md) |
| Rukn Guide | [docs/guides/rukn-guide.md](docs/guides/rukn-guide.md) |
| Architecture Index | [docs/architecture/index.md](docs/architecture/index.md) |
| Pilot Checklist | [docs/pilot/basavakalyan-pilot-checklist.md](docs/pilot/basavakalyan-pilot-checklist.md) |
| Release Notes | [docs/sprints/sprint-13-rc1-release-notes.md](docs/sprints/sprint-13-rc1-release-notes.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Sprint History | [docs/sprints/sprint-history.md](docs/sprints/sprint-history.md) |

## Technology Stack

- React 19 + TypeScript
- Vite 8
- React Router 7
- Tailwind CSS 4
- In-memory mock data (no backend in RC1)

## RC1 Scope Constraints

This release candidate does **not** include Firebase, backend APIs, push notifications, territory mapping, or analytics. All data is stored in browser memory and resets on full page reload except authenticated session (when Remember Me is enabled).

## License

Private — JIH Basavakalyan pilot use.
