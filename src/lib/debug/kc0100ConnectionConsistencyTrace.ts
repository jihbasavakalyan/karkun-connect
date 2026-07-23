/**
 * KC-0100 — Rukn connection data consistency tracer.
 *
 * Temporary investigation logs: Auth → Rukn ID → assignments → connected → UI counts.
 * Enable with `window.__KC0100_TRACE__ = true` or always log compact summaries in production
 * when counts diverge.
 */

import { getAvailableKarkunan, getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  getConnectedAssignmentsForRukn,
  getConnectedKarkunCountForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { getAllAssignments, getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import type { AuthUser } from '@/types/auth.types'

export type Kc0100TraceSnapshot = {
  ticket: 'KC-0100'
  at: string
  stage: string
  auth: {
    uid: string | null
    role: string | null
    ruknId: string | null
  }
  claims: {
    role: unknown
    ruknId: unknown
  } | null
  resolvedRuknId: string | null
  assignmentIds: string[]
  activeAssignmentIds: string[]
  connectedIds: string[]
  repositoryAssignmentCount: number
  registryCount: number
  dashboardAssigned: number
  connectReady: number
  connectedPage: number
  divergence: string[]
}

function isTraceEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true
    const w = window as Window & { __KC0100_TRACE__?: boolean }
    return w.__KC0100_TRACE__ !== false
  } catch {
    return true
  }
}

function publish(snapshot: Kc0100TraceSnapshot): void {
  try {
    if (typeof window === 'undefined') return
    const w = window as Window & { __KC0100_LAST__?: Kc0100TraceSnapshot }
    w.__KC0100_LAST__ = snapshot
  } catch {
    // ignore
  }
}

export function traceKc0100ConnectionConsistency(input: {
  stage: string
  authUser?: AuthUser | null
  claimRole?: unknown
  claimRuknId?: unknown
  resolvedRuknId?: string | null
}): Kc0100TraceSnapshot {
  const ruknId = input.resolvedRuknId ?? input.authUser?.ruknId ?? null
  const all = getAllAssignments()
  const activeForRukn = ruknId ? getActiveAssignmentsForRukn(ruknId) : []
  const connectedAssignments = ruknId ? getConnectedAssignmentsForRukn(ruknId) : []
  const connectedIds = connectedAssignments.map((row) => row.karkunId)
  const dashboardAssigned = ruknId ? getConnectedKarkunCountForRukn(ruknId) : 0
  const connectReady = ruknId ? getAvailableKarkunan(ruknId).length : 0
  const connectedPage = ruknId ? getAssignedKarkunanForRukn(ruknId).length : 0

  const divergence: string[] = []
  if (ruknId && activeForRukn.length > 0 && connectedPage === 0) {
    divergence.push('active_assignments_present_but_connected_page_empty')
  }
  if (dashboardAssigned !== connectedPage) {
    divergence.push(`dashboard(${dashboardAssigned})!=connected_page(${connectedPage})`)
  }
  if (ruknId && activeForRukn.length !== connectedAssignments.length) {
    divergence.push(
      `active_raw(${activeForRukn.length})!=canonical_connected(${connectedAssignments.length})`,
    )
  }

  const snapshot: Kc0100TraceSnapshot = {
    ticket: 'KC-0100',
    at: new Date().toISOString(),
    stage: input.stage,
    auth: {
      uid: input.authUser?.uid ?? null,
      role: input.authUser?.role ?? null,
      ruknId: input.authUser?.ruknId ?? null,
    },
    claims:
      input.claimRole !== undefined || input.claimRuknId !== undefined
        ? { role: input.claimRole ?? null, ruknId: input.claimRuknId ?? null }
        : null,
    resolvedRuknId: ruknId,
    assignmentIds: all.map((row) => row.assignmentId),
    activeAssignmentIds: activeForRukn.map((row) => row.assignmentId),
    connectedIds,
    repositoryAssignmentCount: all.length,
    registryCount: MOCK_KARKUN_REGISTRY.length,
    dashboardAssigned,
    connectReady,
    connectedPage,
    divergence,
  }

  publish(snapshot)

  if (isTraceEnabled()) {
    const line = {
      stage: snapshot.stage,
      resolvedRuknId: snapshot.resolvedRuknId,
      claims: snapshot.claims,
      repositoryAssignmentCount: snapshot.repositoryAssignmentCount,
      active: snapshot.activeAssignmentIds.length,
      connected: snapshot.connectedIds.length,
      dashboardAssigned: snapshot.dashboardAssigned,
      connectReady: snapshot.connectReady,
      connectedPage: snapshot.connectedPage,
      registryCount: snapshot.registryCount,
      divergence: snapshot.divergence,
    }
    if (snapshot.divergence.length > 0) {
      console.warn('[KC-0100] connection consistency divergence', line)
    } else {
      console.info('[KC-0100] connection consistency', line)
    }
  }

  return snapshot
}
