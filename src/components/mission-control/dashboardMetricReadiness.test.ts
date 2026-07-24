import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_HEALTH_METRIC_READINESS,
  resolveCampaignHealthMetricPending,
  resolveDashboardMetricPending,
} from '@/components/mission-control/dashboardMetricReadiness'

describe('KC-0102A dashboard metric readiness', () => {
  it('unlocks critical Campaign Health visits at metricsReady only', () => {
    expect(CAMPAIGN_HEALTH_METRIC_READINESS.visits).toBe('critical')
    expect(
      resolveCampaignHealthMetricPending('visits', true, false),
    ).toBe(false)
    expect(
      resolveCampaignHealthMetricPending('visits', false, true),
    ).toBe(true)
  })

  it('keeps background Campaign Health metrics pending until backgroundReady', () => {
    for (const id of [
      'weekly-ijtema',
      'monthly-baitul-maal',
      'app-registration',
    ] as const) {
      expect(CAMPAIGN_HEALTH_METRIC_READINESS[id]).toBe('background')
      expect(resolveCampaignHealthMetricPending(id, true, false)).toBe(true)
      expect(resolveCampaignHealthMetricPending(id, true, true)).toBe(false)
    }
  })

  it('never uses metric values as readiness', () => {
    expect(
      resolveDashboardMetricPending({
        gate: 'critical',
        metricsReady: true,
        backgroundReady: false,
      }),
    ).toBe(false)
  })
})
