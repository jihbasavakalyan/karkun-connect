/**
 * In-memory execution plan store (KC-009 automation foundation).
 */

import type { ExecutionPlan, ExecutionPlanStatus } from '@/types/executionPlan.types'

const plans: ExecutionPlan[] = []

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeToExecutionPlanStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getAllExecutionPlans(): ExecutionPlan[] {
  return [...plans]
}

export function getActiveExecutionPlansForRukn(ruknId: string): ExecutionPlan[] {
  return plans.filter((plan) => plan.ruknId === ruknId && plan.status === 'active')
}

export function getExecutionPlanById(id: string): ExecutionPlan | undefined {
  return plans.find((plan) => plan.id === id)
}

export function getActivePlanForKarkun(karkunId: string): ExecutionPlan | undefined {
  return plans.find((plan) => plan.karkunId === karkunId && plan.status === 'active')
}

export function appendExecutionPlan(plan: ExecutionPlan): ExecutionPlan {
  plans.unshift(plan)
  notify()
  return plan
}

export function updateExecutionPlanStatus(
  id: string,
  status: ExecutionPlanStatus,
  patch?: Partial<Pick<ExecutionPlan, 'approvedAt' | 'summaryUrdu'>>,
): ExecutionPlan | undefined {
  const plan = plans.find((item) => item.id === id)
  if (!plan) return undefined
  plan.status = status
  plan.updatedAt = new Date().toISOString()
  if (patch?.approvedAt) plan.approvedAt = patch.approvedAt
  if (patch?.summaryUrdu) plan.summaryUrdu = patch.summaryUrdu
  notify()
  return plan
}

export function clearExecutionPlanStore(): void {
  plans.length = 0
  notify()
}
