/** No-op stubs — investigation instrumentation removed for production. */

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

export function setRegistryTraceMigrationCompleted(_value: boolean): void {}

export function setRegistryTraceHydrated(_value: boolean | null): void {}

export function setRegistryTracePeopleVersion(_value: number): void {}

export function traceRegistryStage(
  stage: string,
  _extras?: { peopleVersion?: number; migrationCompleted?: boolean; hydrated?: boolean },
): RegistryTraceSnapshot {
  return {
    stage,
    at: '',
    host: '',
    mode: '',
    mockLength: 0,
    getAllKarkunsLength: 0,
    maleCount: 0,
    femaleCount: 0,
    peopleVersion: null,
    hydrated: null,
    migrationCompleted: null,
    karkunRepoCount: null,
    karkunRepoExists: null,
  }
}

export function getRegistryTraceSnapshots(): RegistryTraceSnapshot[] {
  return []
}
