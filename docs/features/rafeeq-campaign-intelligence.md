# Digital Rafeeq — Campaign Intelligence

**Status:** Production-ready MVP v1.1  
**Module:** `src/conversation/mvp/campaignIntelligence/`  
**UI:** Digital Rafeeq VoiceDrawer summary card  
**Gate:** [`../architecture/kc-rafeeq-campaign-intelligence-arch009-gate.md`](../architecture/kc-rafeeq-campaign-intelligence-arch009-gate.md)  
**Verify:** `npm run verify:rafeeq-campaign-intelligence`

---

## Purpose

Answer natural-language campaign progress questions with live metrics and simple insights from existing Karkun Connect services — read-only, via KC-0131.

## Architecture flow

```text
Utterance → Intent (REPORT / CAMPAIGN_INTEL)
  → Secretary → Orchestrator → Confirmation (auto-approved)
  → Pipeline → Campaign Intelligence Adapter
  → Service Contract → MetricsService + DashboardMetricsService + campaignService
  → VoiceDrawer (summary card + metrics + actions)
```

Reference reporting flow still runs for path certification.

## Supported questions

| Example | Topic |
|---------|-------|
| How is the campaign progressing? / Campaign overview / Show campaign summary | overview |
| How many Karkuns are connected? | connected |
| How many visits are pending? / completed? | visits_* |
| Show Weekly Ijtema progress / What about attendance? | ijtema |
| Show app registration progress | registration |
| Show Baitul Maal progress | baitul_maal |
| Which campaign metrics need attention? | attention |
| What changed this week? / Progress today | week_change / today |
| Why? / Show details / Open report | follow-ups (session topic) |

## Data sources

| Metric | Service |
|--------|---------|
| Connected / remaining / progress % | `MetricsService.getCampaignConnectionMetrics` |
| Visits planned / completed / pending / week | `DashboardMetricsService` visit metrics |
| App registration | `DashboardMetricsService` app registration |
| Weekly Ijtema health | `getDashboardWeeklyIjtemaHealthSlice` |
| Baitul Maal health | `getDashboardMonthlyBaitulMaalHealthSlice` |
| Campaign name / day / progress | `campaignService` |

Cached via `getTurnMetricsBundle` (short TTL).

## Insight rules

Derived only by comparing existing fields:

- Visit % below connection % → visits lag / largest opportunity  
- Registration % healthy or lagging vs thresholds  
- Ijtema / Baitul Maal module pct bands  
- Visit submissions this week when > 0  

No invented analytics engines.

## Limitations

- Rukn-scoped visit/registration when `ruknId` present; some health slices remain campaign-wide  
- English+Urdu keyword classify only (no AI)  
- “Open Campaign” remains navigation; intelligence phrases omit open/go-to  

## Out of scope

Writes · Firestore changes · Parallel repositories · Business-rule changes
