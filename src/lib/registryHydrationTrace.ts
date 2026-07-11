/**
 * TEMPORARY RC1 diagnostics — people-registry hydration runtime trace.
 * Logs actual values only; does not change business logic.
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRepositoryProviderMode, getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

export type RegistryTraceSnapshot = {
  stage: string
  at: string
  host: string
  mode: string
  mockLength: number
  getAllKarkunsLength: number
  maleCount: number
  femaleCount: number
  peopleVersion: number | null
  hydrated: boolean | null
  migrationCompleted: boolean | null
  karkunRepoCount: number | null
  karkunRepoExists: boolean | null
}

type TraceState = {
  snapshots: RegistryTraceSnapshot[]
  migrationCompleted: boolean | null
  hydrated: boolean | null
  peopleVersion: number | null
}

declare global {
  interface Window {
    __KC_REGISTRY_TRACE__?: TraceState
  }
}

function ensureTraceState(): TraceState {
  if (typeof window === 'undefined') {
    return {
      snapshots: [],
      migrationCompleted: null,
      hydrated: null,
      peopleVersion: null,
    }
  }
  if (!window.__KC_REGISTRY_TRACE__) {
    window.__KC_REGISTRY_TRACE__ = {
      snapshots: [],
      migrationCompleted: null,
      hydrated: null,
      peopleVersion: null,
    }
  }
  return window.__KC_REGISTRY_TRACE__
}

export function setRegistryTraceMigrationCompleted(value: boolean): void {
  ensureTraceState().migrationCompleted = value
}

export function setRegistryTraceHydrated(value: boolean | null): void {
  ensureTraceState().hydrated = value
}

export function setRegistryTracePeopleVersion(value: number): void {
  ensureTraceState().peopleVersion = value
}

function readKarkunRepoMeta(): { count: number | null; exists: boolean | null } {
  try {
    const repos = getRepositories()
    const exists = unwrapRepository(repos.karkun.exists(), null)
    const state = unwrapRepository(repos.karkun.loadState(), null)
    return {
      exists,
      count: state ? state.karkuns.length : null,
    }
  } catch {
    return { count: null, exists: null }
  }
}

export function traceRegistryStage(
  stage: string,
  extras?: { peopleVersion?: number; migrationCompleted?: boolean; hydrated?: boolean },
): RegistryTraceSnapshot {
  const state = ensureTraceState()
  if (typeof extras?.peopleVersion === 'number') {
    state.peopleVersion = extras.peopleVersion
  }
  if (typeof extras?.migrationCompleted === 'boolean') {
    state.migrationCompleted = extras.migrationCompleted
  }
  if (typeof extras?.hydrated === 'boolean') {
    state.hydrated = extras.hydrated
  }

  const repo = readKarkunRepoMeta()
  // Mirror getAllKarkuns(true) without importing peopleStore (avoid circular deps).
  const nonArchived = MOCK_KARKUN_REGISTRY.filter((k) => !k.isArchived)
  const snapshot: RegistryTraceSnapshot = {
    stage,
    at: new Date().toISOString(),
    host: typeof window !== 'undefined' ? window.location.host : 'ssr',
    mode: getRepositoryProviderMode(),
    mockLength: MOCK_KARKUN_REGISTRY.length,
    getAllKarkunsLength: nonArchived.length,
    maleCount: nonArchived.filter((k) => k.gender === 'Male').length,
    femaleCount: nonArchived.filter((k) => k.gender === 'Female').length,
    peopleVersion: state.peopleVersion,
    hydrated: state.hydrated,
    migrationCompleted: state.migrationCompleted,
    karkunRepoCount: repo.count,
    karkunRepoExists: repo.exists,
  }

  state.snapshots.push(snapshot)
  // Exact runtime values — do not interpret.
  console.info('[KC-REGISTRY-TRACE]', JSON.stringify(snapshot))
  return snapshot
}

export function getRegistryTraceSnapshots(): RegistryTraceSnapshot[] {
  return [...ensureTraceState().snapshots]
}
