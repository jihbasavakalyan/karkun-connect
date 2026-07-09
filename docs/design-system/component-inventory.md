# Component Inventory

Complete inventory of design-system-related components as of M6.5.

## UI primitives (`src/components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| `Icon` | `Icon.tsx` | Stroke icon family |
| `PageShell` | `PageShell.tsx` | Page layout wrapper |
| `PageHeader` | `PageHeader.tsx` | Title + actions |
| `PrimaryButton` | `PrimaryButton.tsx` | Primary CTA |
| `SecondaryButton` | `SecondaryButton.tsx` | Secondary action |
| `GhostButton` | `GhostButton.tsx` | Tertiary / inline |
| `DangerButton` | `DangerButton.tsx` | Destructive action |
| `StatusBadge` | `StatusBadge.tsx` | Semantic status chip |
| `EmptyState` | `EmptyState.tsx` | Zero-data states |
| `Skeleton` | `Skeleton.tsx` | Loading placeholder |
| `HomePageSkeleton` | `Skeleton.tsx` | Home loading layout |
| Form styles | `formStyles.ts` | Shared field classes |
| Button base | `buttonBase.ts` | Shared button tokens |

## Layout (`src/components/layout/`)

| Component | Purpose |
|-----------|---------|
| `AdminSidebar` | Admin navigation (Icon-based) |
| `AdminTopBar` | Global search, alerts, mobile nav |
| `CampaignStatusBar` | Active campaign banner |
| `PortalAuthActions` | Sign out / user menu |

## Home — Concept D (`src/components/home/`)

| Component | Purpose |
|-----------|---------|
| `AdminHomeHero` | Admin compact hero |
| `RuknHomeHero` | Rukn compact hero |
| `AdminPriorityStrip` | Priority KPI strip |
| `AdminTodaysWorkPanel` | Today's work flow |
| `AdminCampaignContextPanel` | Campaign context |
| `CampaignPulseHeartbeat` | Pulse indicator |
| `RuknPeopleRows` | People row list |
| `RuknFloatingActionButton` | Rukn FAB |
| `RuknQuickActionsBar` | Quick action grid |
| `HomeSection` | Section wrapper |
| `RuknTodaysSchedule` | Schedule timeline |
| `RuknActivityFeed` | Recent activity |

## Command center (`src/components/command-center/`)

| Component | Purpose |
|-----------|---------|
| `CommandCenterHero` | Campaign headline |
| `CommandCenterValues` | Campaign values grid |
| `CommandCenterAdminQuickActions` | Admin shortcuts |
| `CommandCenterRuknQuickActions` | Rukn shortcuts |
| `CommandCenterTeamPerformance` | Team leaderboard table |
| `CommandCenterCampaignProgress` | Progress + top Rukns |

## Status badge wrappers

| Component | Domain |
|-----------|--------|
| `ComplianceStatusBadge` | Compliance module |
| `CommunicationStatusBadge` | Messaging |
| `ExecutionStatusBadge` | Visit execution |
| `CampaignStatusBadge` | Campaign setup |
| `RelationshipHealthBadge` | Guidance health |
| `JourneyStageBadge` | Journey stage |
| `EnterpriseBadge` | Command center KPIs |

## Common (`src/components/common/`)

| Component | Purpose |
|-----------|---------|
| `Logo` | Brand mark |
| `Modal` | Dialog shell |
| `ContactActionBar` | Phone / WhatsApp bar |

## Relationship (`src/components/relationship/`)

| Component | Purpose |
|-----------|---------|
| `ConnectedKarkunCard` | Connected karkun card |
| `AvailableKarkunRow` | Available karkun row |
| `RelationshipActionBar` | Release / replace actions |
| `KarkunSearchField` | Search input |
| `RelationshipSummaryPanel` | Summary stats |

## Pages using PageShell + PageHeader

All admin module pages except home/command center overlays. Rukn module pages (My Karkun, Available, Profile, Campaign Record, Connection Journey, Help).

## Design token files

| File | Purpose |
|------|---------|
| `src/index.css` | CSS `@theme` + `ds-*` + `cd-*` classes |
| `src/design-system/tokens.ts` | JS token constants |
| `src/design-system/iconNames.ts` | Icon name union |
| `src/design-system/index.ts` | Barrel export |
