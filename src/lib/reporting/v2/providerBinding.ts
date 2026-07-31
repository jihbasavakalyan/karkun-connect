/**
 * KC-037A — Bind KC-033 CanonicalMetricProviders into ReportContext.
 * Report sections must read KPIs only through this bundle.
 */

import { CanonicalMetricProviders } from '@/lib/operations/canonicalCampaignMetrics'
import { APP_VERSION } from '@/constants/app'
import { getActiveCampaign, getCampaignTimeline } from '@/services/campaignService'
import type { ReportConfig, ReportContext, ReportProviderBundle } from './types'

export function resolveProviderBundle(): ReportProviderBundle {
  return CanonicalMetricProviders
}

export function createReportContext(
  config: ReportConfig,
  options?: { now?: Date },
): ReportContext {
  const now = options?.now ?? new Date()
  return {
    config,
    providers: resolveProviderBundle(),
    localization: { language: config.language },
    campaign: {
      campaign: getActiveCampaign() ?? null,
      timeline: getCampaignTimeline(now),
    },
    runtime: {
      now,
      systemVersion: APP_VERSION,
    },
  }
}
