/**
 * KC-037C-F — Shared access to CampaignReportModel via Composer context providers.
 */

import {
  buildCampaignReportModel,
  type CampaignReportModel,
} from '@/lib/reporting/campaignReportModel'
import type { ReportContext } from '../types'

export function campaignModelFromContext(ctx: ReportContext): CampaignReportModel {
  return buildCampaignReportModel({
    generatedBy: ctx.config.generatedBy,
    organization: ctx.config.organization,
    now: ctx.runtime.now,
    providers: ctx.providers,
  })
}

export function pairView(m: {
  completed: number
  total: number
  pending: number
  pct: number
}) {
  return { completed: m.completed, total: m.total, pending: m.pending, pct: m.pct }
}
