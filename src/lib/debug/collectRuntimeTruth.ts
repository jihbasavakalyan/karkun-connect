/**
 * KC-029 — Observe-only runtime truth collectors.
 * Calls existing getters / read-only Firestore getDocs.
 * Does not mutate stores, repositories, or business rules.
 */

import { collection, getDocs } from 'firebase/firestore'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  getCanonicalConnectedAssignments,
  getCanonicalConnectedKarkunCount,
  getConnectedKarkunCountForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { getStartupTimingMarks } from '@/lib/startupDiagnostics'
import {
  getStartupLifecycleTrace,
  summarizeStartupLifecycle,
} from '@/lib/startupLifecycleTrace'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import { isFirebaseConfigured, readFirebaseConfigFromEnv } from '@/lib/firebase/firebase'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
} from '@/repositories/provider'
import { isRepositoryHydrationReady } from '@/repositories/hydrationReady'
import {
  getAssignmentDashboardMetrics,
  getRuknAssignmentSummary,
} from '@/services/assignmentService'
import { getAdminCommandCenterSnapshot } from '@/services/campaignAutomationEngine'
import { getActiveCampaign } from '@/services/campaignService'
import { getAllAssignments } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { AuthUser } from '@/types/auth.types'

export type CountLayer = {
  layer: string
  count: number | null
  functionName: string
  file: string
  source: string
  note?: string
  error?: string
}

export type ConnectionTraceLayer = {
  layer: string
  documentId: string | null
  connectionId: string | null
  karkunId: string | null
  ruknId: string | null
  lastUpdated: string | null
  source: string
  status?: string | null
  assignmentNumber?: string | null
}

export type RuntimeTruthSnapshot = {
  capturedAt: string
  environment: {
    buildSha: string
    buildTimestamp: string
    viteMode: string
    isDev: boolean
    firebaseProjectId: string
    repositoryProvider: string
    firebaseConfigured: boolean
    authStatus: string
    currentUser: { uid: string; email: string | null; role: string } | null
    campaign: { id: string; name: string } | null
    diagnosticsFlag: boolean
  }
  startup: {
    firebaseInitialized: boolean
    repositoryReady: boolean
    assignmentStoreReady: boolean
    peopleStoreReady: boolean
    automationReady: boolean
    dashboardReady: boolean
    startupDurationMs: number | null
    hydrationDurationMs: number | null
    snapshotActive: boolean
    lastSnapshotTimestamp: string | null
    repositoryVersion: string | null
    storeVersion: string | null
    lifecycle: ReturnType<typeof summarizeStartupLifecycle>
    timingMarks: ReturnType<typeof getStartupTimingMarks>
  }
  counts: CountLayer[]
  divergences: Array<{
    layerA: string
    layerB: string
    valueA: number | null
    valueB: number | null
  }>
  connectionTrace: ConnectionTraceLayer[] | null
  selectedConnectionId: string | null
  ruknParity: Array<{
    ruknId: string
    profileCount: number
    connectedPageCount: number
    canonicalCount: number
    diverge: boolean
  }>
  createRefresh: {
    baseline: RuntimeTruthBaseline | null
    comparison: Array<{ layer: string; before: number | null; after: number | null; match: boolean }> | null
  }
}

export type RuntimeTruthBaseline = {
  capturedAt: string
  counts: Array<{ layer: string; count: number | null }>
  selectedConnectionId: string | null
  manualMarks: Array<{ label: string; at: string }>
}

const BASELINE_KEY = 'kc029-runtime-baseline'
const MANUAL_MARKS_KEY = 'kc029-runtime-manual-marks'

function buildSha(): string {
  try {
    return typeof __KC_BUILD_SHA__ !== 'undefined' ? __KC_BUILD_SHA__ : 'unknown'
  } catch {
    return 'unknown'
  }
}

function buildTimestamp(): string {
  try {
    return typeof __KC_BUILD_TIME__ !== 'undefined' ? __KC_BUILD_TIME__ : 'unknown'
  } catch {
    return 'unknown'
  }
}

async function readFirestoreConnectionCount(): Promise<{
  count: number | null
  error?: string
  docs: AssignmentRecord[]
}> {
  if (getRepositoryProviderMode() !== 'firestore' || !isFirebaseConfigured()) {
    return { count: null, error: 'Firestore provider not active', docs: [] }
  }
  try {
    const snap = await getDocs(collection(getFirestoreDb(), FIRESTORE_COLLECTIONS.connections))
    const docs = snap.docs.map((d) => {
      const data = d.data() as AssignmentRecord
      return {
        ...data,
        assignmentId: data.assignmentId || d.id,
      }
    })
    return { count: snap.size, docs }
  } catch (error) {
    return {
      count: null,
      error: error instanceof Error ? error.message : String(error),
      docs: [],
    }
  }
}

function lifecycleMs(labelIncludes: string): number | null {
  const events = getStartupLifecycleTrace()
  const hit = events.find((e) => e.label.includes(labelIncludes))
  return hit ? hit.t : null
}

function loadBaseline(): RuntimeTruthBaseline | null {
  try {
    const raw = sessionStorage.getItem(BASELINE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as RuntimeTruthBaseline
  } catch {
    return null
  }
}

export function saveRuntimeTruthBaseline(
  snapshot: Pick<RuntimeTruthSnapshot, 'capturedAt' | 'counts' | 'selectedConnectionId'>,
): RuntimeTruthBaseline {
  const baseline: RuntimeTruthBaseline = {
    capturedAt: snapshot.capturedAt,
    counts: snapshot.counts.map((c) => ({ layer: c.layer, count: c.count })),
    selectedConnectionId: snapshot.selectedConnectionId,
    manualMarks: loadManualMarks(),
  }
  sessionStorage.setItem(BASELINE_KEY, JSON.stringify(baseline))
  return baseline
}

export function addRuntimeManualMark(label: string): void {
  const marks = loadManualMarks()
  marks.push({ label, at: new Date().toISOString() })
  sessionStorage.setItem(MANUAL_MARKS_KEY, JSON.stringify(marks))
}

function loadManualMarks(): Array<{ label: string; at: string }> {
  try {
    const raw = sessionStorage.getItem(MANUAL_MARKS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Array<{ label: string; at: string }>
  } catch {
    return []
  }
}

export function clearRuntimeTruthBaseline(): void {
  sessionStorage.removeItem(BASELINE_KEY)
}

function buildTrace(
  firestoreDoc: AssignmentRecord | null,
  storeRecord: AssignmentRecord | null,
  canonical: AssignmentRecord | null,
  dashboardConnected: number,
): ConnectionTraceLayer[] {
  const layers: ConnectionTraceLayer[] = [
    {
      layer: 'Firestore Document',
      documentId: firestoreDoc?.assignmentId ?? null,
      connectionId: firestoreDoc?.assignmentId ?? null,
      karkunId: firestoreDoc?.karkunId ?? null,
      ruknId: firestoreDoc?.ruknId ?? null,
      lastUpdated: firestoreDoc?.updatedAt ?? null,
      source: 'getDocs(connections)',
      status: firestoreDoc?.status ?? null,
      assignmentNumber: firestoreDoc?.assignmentNumber ?? null,
    },
    {
      layer: 'Repository Entity',
      documentId: null,
      connectionId: null,
      karkunId: null,
      ruknId: null,
      lastUpdated: null,
      source: 'connection.loadState().assignments',
      status: null,
      assignmentNumber: null,
    },
    {
      layer: 'assignmentStore Object',
      documentId: storeRecord?.assignmentId ?? null,
      connectionId: storeRecord?.assignmentId ?? null,
      karkunId: storeRecord?.karkunId ?? null,
      ruknId: storeRecord?.ruknId ?? null,
      lastUpdated: storeRecord?.updatedAt ?? null,
      source: 'getAllAssignments() / getAssignmentById',
      status: storeRecord?.status ?? null,
      assignmentNumber: storeRecord?.assignmentNumber ?? null,
    },
    {
      layer: 'Canonical Helper',
      documentId: canonical?.assignmentId ?? null,
      connectionId: canonical?.assignmentId ?? null,
      karkunId: canonical?.karkunId ?? null,
      ruknId: canonical?.ruknId ?? null,
      lastUpdated: canonical?.updatedAt ?? null,
      source: 'getCanonicalConnectedAssignments()',
      status: canonical?.status ?? null,
      assignmentNumber: canonical?.assignmentNumber ?? null,
    },
    {
      layer: 'Dashboard Model Connected KPI',
      documentId: null,
      connectionId: null,
      karkunId: null,
      ruknId: null,
      lastUpdated: null,
      source: 'buildAdminMissionControl().kpis[connected].value',
      status: String(dashboardConnected),
    },
    {
      layer: 'Rendered KPI (model value)',
      documentId: null,
      connectionId: null,
      karkunId: null,
      ruknId: null,
      lastUpdated: null,
      source: 'MissionControlKpiGrid receives model.kpis',
      status: String(dashboardConnected),
    },
  ]

  const repoState = getRepositories().connection.loadState()
  if (repoState.ok) {
    const match = repoState.data.assignments.find(
      (r) =>
        r.assignmentId === (storeRecord?.assignmentId ?? firestoreDoc?.assignmentId ?? ''),
    )
    layers[1] = {
      layer: 'Repository Entity',
      documentId: match?.assignmentId ?? null,
      connectionId: match?.assignmentId ?? null,
      karkunId: match?.karkunId ?? null,
      ruknId: match?.ruknId ?? null,
      lastUpdated: match?.updatedAt ?? null,
      source: 'connection.loadState().assignments',
      status: match?.status ?? null,
      assignmentNumber: match?.assignmentNumber ?? null,
    }
  }

  return layers
}

export async function collectRuntimeTruth(input: {
  authStatus: string
  user: AuthUser | null
  diagnosticsFlag: boolean
}): Promise<RuntimeTruthSnapshot> {
  const capturedAt = new Date().toISOString()
  const firebaseConfig = readFirebaseConfigFromEnv()
  const campaign = getActiveCampaign()
  const lifecycle = summarizeStartupLifecycle()
  const timingMarks = getStartupTimingMarks()

  const firestoreRead = await readFirestoreConnectionCount()
  const repoState = getRepositories().connection.loadState()
  const repoAssignments = repoState.ok ? repoState.data.assignments : []
  const storeAssignments = getAllAssignments()
  const canonicalAssignments = getCanonicalConnectedAssignments()
  const people = getPeopleStatistics()
  const assignmentMetrics = getAssignmentDashboardMetrics()

  const automationSnapshot = getAdminCommandCenterSnapshot()
  const dashboardModel = buildAdminMissionControl(automationSnapshot)
  const dashboardConnectedKpi = dashboardModel.kpis.find((k) => k.id === 'connected')
  const automationConnectedKpi = automationSnapshot.kpis.find((k) => k.id === 'assigned-karkuns')

  const storeActive = storeAssignments.filter((r) => r.status === 'Active')
  const firstRuknId =
    canonicalAssignments[0]?.ruknId ?? storeActive[0]?.ruknId ?? null

  const profileCount = firstRuknId
    ? getRuknAssignmentSummary(firstRuknId).assignedKarkunCount
    : null
  const connectedPageCount = firstRuknId
    ? getAssignedKarkunanForRukn(firstRuknId).length
    : null

  const counts: CountLayer[] = [
    {
      layer: 'Firestore connection count',
      count: firestoreRead.count,
      functionName: 'getDocs(collection(db, connections))',
      file: 'src/lib/debug/collectRuntimeTruth.ts',
      source: 'Live Firestore read (diagnostics only)',
      error: firestoreRead.error,
      note: 'Raw document count (pre-canonicalize)',
    },
    {
      layer: 'Repository count',
      count: repoState.ok ? repoAssignments.length : null,
      functionName: 'connection.loadState()',
      file: 'src/repositories/interfaces/ConnectionRepository.ts',
      source: 'Repository cache / local state',
      error: repoState.ok ? undefined : repoState.error.message,
      note: 'All assignment rows in repository state',
    },
    {
      layer: 'assignmentStore count',
      count: storeAssignments.length,
      functionName: 'getAllAssignments()',
      file: 'src/stores/assignmentStore.ts',
      source: 'In-memory assignment store',
      note: 'All statuses',
    },
    {
      layer: 'assignmentStore Active row count',
      count: storeActive.length,
      functionName: "getAllAssignments().filter(status==='Active')",
      file: 'src/stores/assignmentStore.ts',
      source: 'In-memory assignment store',
      note: 'Raw Active rows (not canonical)',
    },
    {
      layer: 'Canonical Connected Count',
      count: getCanonicalConnectedKarkunCount(),
      functionName: 'getCanonicalConnectedKarkunCount()',
      file: 'src/lib/connections/getConnectedKarkunsForRukn.ts',
      source: 'Canonical helper',
    },
    {
      layer: 'People Registry Connected Count',
      count: people.assignedKarkuns,
      functionName: 'getPeopleStatistics().assignedKarkuns',
      file: 'src/lib/peopleStore.ts',
      source: 'People statistics (uses canonical count)',
    },
    {
      layer: 'Dashboard Connected KPI',
      count:
        typeof dashboardConnectedKpi?.value === 'number'
          ? dashboardConnectedKpi.value
          : Number(dashboardConnectedKpi?.value ?? NaN) || null,
      functionName: 'buildAdminMissionControl → kpis[connected]',
      file: 'src/lib/missionControl/buildAdminMissionControl.ts',
      source: 'Admin Mission Control model',
    },
    {
      layer: 'Automation Engine Count',
      count:
        typeof automationConnectedKpi?.value === 'number'
          ? automationConnectedKpi.value
          : Number(automationConnectedKpi?.value ?? NaN) || null,
      functionName: 'getAdminCommandCenterSnapshot → kpis[assigned-karkuns]',
      file: 'src/services/campaignAutomationEngine.ts',
      source: 'Automation snapshot KPI',
      note: `getAssignmentDashboardMetrics().activeAssignments=${assignmentMetrics.activeAssignments}`,
    },
    {
      layer: 'Rukn Profile Connected Count',
      count: profileCount,
      functionName: 'getRuknAssignmentSummary(ruknId).assignedKarkunCount',
      file: 'src/services/assignmentService.ts',
      source: firstRuknId ? `Sample ruknId=${firstRuknId}` : 'No rukn with connections',
    },
    {
      layer: 'Connected Page Count',
      count: connectedPageCount,
      functionName: 'getAssignedKarkunanForRukn(ruknId).length',
      file: 'src/lib/assignmentEngine.ts',
      source: firstRuknId ? `Sample ruknId=${firstRuknId}` : 'No rukn with connections',
    },
  ]

  const parityLayers = [
    'Canonical Connected Count',
    'People Registry Connected Count',
    'Dashboard Connected KPI',
    'Automation Engine Count',
  ]
  const divergences: RuntimeTruthSnapshot['divergences'] = []
  for (let i = 0; i < parityLayers.length; i += 1) {
    for (let j = i + 1; j < parityLayers.length; j += 1) {
      const a = counts.find((c) => c.layer === parityLayers[i])
      const b = counts.find((c) => c.layer === parityLayers[j])
      if (!a || !b) continue
      if (a.count !== b.count) {
        divergences.push({
          layerA: a.layer,
          layerB: b.layer,
          valueA: a.count,
          valueB: b.count,
        })
      }
    }
  }

  if (
    profileCount !== null &&
    connectedPageCount !== null &&
    profileCount !== connectedPageCount
  ) {
    divergences.push({
      layerA: 'Rukn Profile Connected Count',
      layerB: 'Connected Page Count',
      valueA: profileCount,
      valueB: connectedPageCount,
    })
  }

  const ruknIds = [...new Set(canonicalAssignments.map((r) => r.ruknId))]
  const ruknParity = ruknIds.map((ruknId) => {
    const profile = getRuknAssignmentSummary(ruknId).assignedKarkunCount
    const page = getAssignedKarkunanForRukn(ruknId).length
    const canonical = getConnectedKarkunCountForRukn(ruknId)
    return {
      ruknId,
      profileCount: profile,
      connectedPageCount: page,
      canonicalCount: canonical,
      diverge: profile !== page || page !== canonical,
    }
  })

  const selected =
    canonicalAssignments[0] ??
    storeActive[0] ??
    storeAssignments[0] ??
    firestoreRead.docs[0] ??
    null

  const selectedId = selected?.assignmentId ?? null
  const storeRecord = selectedId
    ? storeAssignments.find((r) => r.assignmentId === selectedId) ?? null
    : null
  const firestoreDoc = selectedId
    ? firestoreRead.docs.find((r) => r.assignmentId === selectedId) ?? null
    : null
  const canonical = selectedId
    ? canonicalAssignments.find((r) => r.assignmentId === selectedId) ?? null
    : null

  const dashboardConnected =
    typeof dashboardConnectedKpi?.value === 'number'
      ? dashboardConnectedKpi.value
      : Number(dashboardConnectedKpi?.value ?? 0)

  const hydrateStart = lifecycleMs('firestore.hydrate.start')
  const hydrateComplete = lifecycleMs('firestore.hydrate.complete')
  const startupDurationMs =
    lifecycle.events.length > 0 ? lifecycle.events[lifecycle.events.length - 1]!.t : null

  const maxStoreUpdated = storeAssignments.reduce<string | null>((max, r) => {
    if (!r.updatedAt) return max
    if (!max || r.updatedAt > max) return r.updatedAt
    return max
  }, null)

  const baseline = loadBaseline()
  const comparison = baseline
    ? baseline.counts.map((before) => {
        const after = counts.find((c) => c.layer === before.layer)?.count ?? null
        return {
          layer: before.layer,
          before: before.count,
          after,
          match: before.count === after,
        }
      })
    : null

  const snapshot: RuntimeTruthSnapshot = {
    capturedAt,
    environment: {
      buildSha: buildSha(),
      buildTimestamp: buildTimestamp(),
      viteMode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      firebaseProjectId: firebaseConfig.projectId || '(unset)',
      repositoryProvider: getRepositoryProviderMode(),
      firebaseConfigured: isFirebaseConfigured(),
      authStatus: input.authStatus,
      currentUser: input.user
        ? {
            uid: input.user.uid,
            email: input.user.email,
            role: input.user.role,
          }
        : null,
      campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
      diagnosticsFlag: input.diagnosticsFlag,
    },
    startup: {
      firebaseInitialized: isFirebaseConfigured() && getRepositoryProviderMode() === 'firestore',
      repositoryReady: isRepositoryHydrationReady(),
      assignmentStoreReady: true,
      peopleStoreReady: true,
      automationReady: Boolean(automationSnapshot),
      dashboardReady: Boolean(dashboardModel),
      startupDurationMs,
      hydrationDurationMs:
        hydrateStart !== null && hydrateComplete !== null
          ? hydrateComplete - hydrateStart
          : null,
      snapshotActive: lifecycle.snapshotListenerFires > 0 || lifecycle.events.some((e) =>
        e.label.includes('snapshot'),
      ),
      lastSnapshotTimestamp: capturedAt,
      repositoryVersion: repoState.ok
        ? `assignments=${repoAssignments.length};nextSequence=${repoState.data.nextSequence}`
        : null,
      storeVersion: `assignments=${storeAssignments.length};maxUpdatedAt=${maxStoreUpdated ?? 'n/a'}`,
      lifecycle,
      timingMarks,
    },
    counts,
    divergences,
    connectionTrace: selected ? buildTrace(firestoreDoc, storeRecord, canonical, dashboardConnected) : null,
    selectedConnectionId: selectedId,
    ruknParity,
    createRefresh: {
      baseline,
      comparison,
    },
  }

  try {
    if (typeof window !== 'undefined') {
      window.__KC029_RUNTIME_TRUTH__ = snapshot
    }
  } catch {
    // ignore
  }

  return snapshot
}
