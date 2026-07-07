# Changelog

All notable changes to Karkun Connect are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0-rc.1] — 2026-07-07

### Added

- Full administrator portal: Dashboard, Campaign, Rukn, Karkun, Assignments, Execution, Compliance, Follow-up, Settings, Help
- Rukn portal: Dashboard, My Karkun, Available Karkun, Campaign Record, Annexure-1 visit flow
- Assignment engine with gender matching, replace, and unassign workflows
- Compliance module: Ijtema attendance, JIH web portal registration, monthly reporting, Bait-ul-Maal
- Authentication with Remember Me and session restore (localStorage / sessionStorage)
- Demo accounts for administrator and four Rukn personas
- Production karkun data migration (196 male + 297 female records)
- RC1 verification suite (`npm run verify:rc1`)
- Pilot documentation and Basavakalyan checklist

### Changed

- Navigation audit: legacy placeholder routes redirect to live pages
- Logout control added to Admin and Rukn layouts
- UI consistency pass: nav icons, status badges, empty states, mobile touch targets
- Settings and Help pages updated for RC1 workflows

### Removed

- Duplicate dashboard components and orphan admin pages
- Legacy `rukn@demo.com` demo account
- Placeholder routes and stub pages

### Fixed

- Rukn nav Reports link now points to Campaign Record
- Compliance dashboard sync and bulk actions
- Ijtema "Informed" status handling
- Inline assignment gender filtering and history preservation

## [0.9.0] — Pre-RC1 development

Sprints 1–12 delivered core modules incrementally. See [docs/sprints/sprint-history.md](docs/sprints/sprint-history.md).

[1.0.0-rc.1]: https://github.com/jihbasavakalyan/karkun-connect/compare/main...main
