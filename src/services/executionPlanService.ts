/**
 * Execution plan service — approve لائحۂ عمل and store schedule (KC-009).
 */

import { logActivity } from '@/stores/activityLogStore'
import {
  appendExecutionPlan,
  getActiveExecutionPlansForRukn,
  getActivePlanForKarkun,
  updateExecutionPlanStatus,
} from '@/stores/executionPlanStore'
import type {
  ExecutionPlan,
  ExecutionPlanDraftInput,
  PlanContactChannel,
  PlanContactWhen,
  PlanPreferredTime,
} from '@/types/executionPlan.types'

const WHEN_URDU: Record<PlanContactWhen, string> = {
  today: 'آج',
  tomorrow: 'کل',
  'this-week': 'اس ہفتے',
  custom: 'منتخب تاریخ',
}

const CHANNEL_URDU: Record<PlanContactChannel, string> = {
  visit: 'بالمشافہ ملاقات',
  call: 'فون کال',
  whatsapp: 'واٹس ایپ',
  ijtema: 'اجتماع',
}

const TIME_URDU: Record<PlanPreferredTime, string> = {
  morning: 'صبح',
  afternoon: 'دوپہر',
  evening: 'شام',
  custom: 'مخصوص وقت',
}

export function buildPlanSummaryUrdu(input: ExecutionPlanDraftInput): string {
  const when =
    input.firstContactWhen === 'custom' && input.firstContactDate
      ? input.firstContactDate
      : WHEN_URDU[input.firstContactWhen]
  const channel = CHANNEL_URDU[input.channel]
  const timePart =
    input.channel === 'visit' && input.preferredTime
      ? input.preferredTime === 'custom' && input.customTime
        ? `، وقت: ${input.customTime}`
        : `، وقت: ${TIME_URDU[input.preferredTime]}`
      : ''

  return `${input.karkunName} سے پہلا رابطہ ${when} کے دوران ${channel} کے ذریعے${timePart}۔`
}

export function approveExecutionPlan(input: ExecutionPlanDraftInput): ExecutionPlan {
  const now = new Date().toISOString()
  const summaryUrdu = buildPlanSummaryUrdu(input)
  const plan = appendExecutionPlan({
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    karkunId: input.karkunId,
    karkunName: input.karkunName,
    ruknId: input.ruknId,
    assignmentId: input.assignmentId,
    status: 'active',
    firstContactWhen: input.firstContactWhen,
    firstContactDate: input.firstContactDate,
    channel: input.channel,
    preferredTime: input.preferredTime,
    customTime: input.customTime,
    summaryUrdu,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  logActivity({
    type: 'assign',
    message: `لائحۂ عمل منظور: ${summaryUrdu}`,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignmentId: input.assignmentId,
    actor: 'Rukn',
    severity: 'INFO',
  })

  return plan
}

export function cancelExecutionPlan(planId: string): ExecutionPlan | undefined {
  return updateExecutionPlanStatus(planId, 'cancelled')
}

export { getActiveExecutionPlansForRukn, getActivePlanForKarkun, buildPlanSummaryUrdu as summarizePlanDraft }
