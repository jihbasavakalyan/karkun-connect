/**
 * KC-028B — Unified write-operation lifecycle.
 *
 * Idle → Submitting → Writing → Server ACK → Refresh repos/counters/UI → Completed
 *
 * Reuses KC-0098 singleActionGuard + KC-ARCH-001 awaitQueuedWrite.
 * Do not duplicate busy/timeout/ACK logic in screens.
 */

import { runExclusive } from '@/lib/reliability/singleActionGuard'

export const WRITE_PROGRESS_URDU = 'محفوظ کیا جا رہا ہے...'
export const WRITE_SLOW_URDU =
  'کارروائی مکمل ہونے میں معمول سے زیادہ وقت لگ رہا ہے...'

export type WritePhase =
  | 'idle'
  | 'submitting'
  | 'writing'
  | 'server_ack'
  | 'refreshing_repos'
  | 'refreshing_counters'
  | 'refreshing_ui'
  | 'completed'
  | 'error'

export type WriteLifecycleErrorCode =
  | 'permission_denied'
  | 'already_processed'
  | 'conflict'
  | 'duplicate'
  | 'network'
  | 'timeout'
  | 'unknown'

export const WRITE_ERROR_URDU: Record<WriteLifecycleErrorCode, string> = {
  permission_denied: 'آپ کو یہ تبدیلی محفوظ کرنے کی اجازت نہیں ہے۔',
  already_processed: 'یہ درخواست پہلے ہی نمٹائی جا چکی ہے۔',
  conflict: 'ڈیٹا میں تضاد ہے۔ صفحہ تازہ کریں اور دوبارہ کوشش کریں۔',
  duplicate: 'یہ اندراج پہلے سے موجود ہے۔',
  network: 'نیٹ ورک کی خرابی۔ دوبارہ کوشش کریں۔',
  timeout: 'وقت ختم ہو گیا۔ دوبارہ کوشش کریں۔',
  unknown: 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
}

export type WriteStageTiming = {
  stage: string
  at: number
  msFromClick: number
}

export type WriteTimings = {
  key: string
  userClickAt: number
  stages: WriteStageTiming[]
  completedMs?: number
}

export type WriteLifecycleOk<T> = {
  ok: true
  value: T
  timings: WriteTimings
  slowWarned: boolean
}

export type WriteLifecycleFail = {
  ok: false
  code: WriteLifecycleErrorCode
  message: string
  timings: WriteTimings
  slowWarned: boolean
  error?: unknown
}

export type WriteLifecycleResult<T> = WriteLifecycleOk<T> | WriteLifecycleFail

export type RunWriteLifecycleOptions<T> = {
  /** Unique key — duplicate clicks coalesce onto one in-flight Promise. */
  key: string
  /** Firestore queue label(s) to await after work (Server ACK). */
  queueLabels?: string[]
  /** Show slow Urdu copy after this many ms (default 3000). */
  slowAfterMs?: number
  /** Fail the whole operation after this many ms (default 30000). */
  timeoutMs?: number
  onPhase?: (phase: WritePhase, message: string) => void
  onSlow?: () => void
  refreshRepos?: () => void | Promise<void>
  refreshCounters?: () => void | Promise<void>
  refreshUi?: () => void | Promise<void>
  work: () => Promise<T>
}

const recentTimings: WriteTimings[] = []
const MAX_RECENT = 100

function recordTimings(timings: WriteTimings): void {
  recentTimings.push(timings)
  if (recentTimings.length > MAX_RECENT) {
    recentTimings.splice(0, recentTimings.length - MAX_RECENT)
  }
}

export function getRecentWriteTimings(): readonly WriteTimings[] {
  return recentTimings
}

export function clearRecentWriteTimings(): void {
  recentTimings.length = 0
}

export function writeProgressMessage(busy: boolean, slow: boolean): string {
  if (!busy) return ''
  return slow ? WRITE_SLOW_URDU : WRITE_PROGRESS_URDU
}

function extractRaw(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return String(error ?? '')
}

function extractCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return undefined
}

/**
 * Map raw failures / service codes to KC-028B Urdu operator messages.
 */
export function classifyWriteError(error: unknown): {
  code: WriteLifecycleErrorCode
  message: string
} {
  const raw = extractRaw(error)
  const code = extractCode(error)?.toLowerCase() ?? ''

  if (
    code === 'already_processed' ||
    /already processed|پہلے ہی نمٹائی/i.test(raw)
  ) {
    return {
      code: 'already_processed',
      message: WRITE_ERROR_URDU.already_processed,
    }
  }

  if (
    code === 'permission' ||
    code === 'permission-denied' ||
    /permission|insufficient|اجازت نہیں/i.test(raw)
  ) {
    return {
      code: 'permission_denied',
      message: WRITE_ERROR_URDU.permission_denied,
    }
  }

  if (code === 'conflict' || /conflict|version|stale/i.test(raw)) {
    return { code: 'conflict', message: WRITE_ERROR_URDU.conflict }
  }

  if (
    code === 'duplicate' ||
    code === 'mobile_exists' ||
    code === 'pending_exists' ||
    /duplicate|already exists|پہلے سے موجود/i.test(raw)
  ) {
    return { code: 'duplicate', message: WRITE_ERROR_URDU.duplicate }
  }

  if (
    code === 'timeout' ||
    /timeout|timed out|وقت ختم/i.test(raw)
  ) {
    return { code: 'timeout', message: WRITE_ERROR_URDU.timeout }
  }

  if (
    code === 'storagefailure' ||
    /offline|network|unavailable|deadline|نیٹ ورک/i.test(raw)
  ) {
    return { code: 'network', message: WRITE_ERROR_URDU.network }
  }

  if (raw.trim() && raw.length <= 160 && !/[{\[]/.test(raw)) {
    return { code: 'unknown', message: raw }
  }

  return { code: 'unknown', message: WRITE_ERROR_URDU.unknown }
}

function markStage(timings: WriteTimings, stage: string): void {
  const msFromClick = performance.now() - timings.userClickAt
  timings.stages.push({ stage, at: Date.now(), msFromClick })
  console.info('[KC-028B]', {
    key: timings.key,
    stage,
    ms: Math.round(msFromClick * 10) / 10,
  })
}

async function awaitQueueLabels(labels: string[]): Promise<void> {
  if (labels.length === 0) return
  try {
    const { awaitQueuedWrite } = await import(
      '@/repositories/firestore/firestoreRepositories'
    )
    for (const label of labels) {
      await awaitQueuedWrite(label)
    }
  } catch {
    // local provider / non-browser may lack queue
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return promise
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error('Write operation timed out'), { code: 'timeout' }))
    }, timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * Run one durable write through the shared lifecycle.
 * Duplicate clicks for the same key receive the same in-flight result.
 */
export function runWriteLifecycle<T>(
  options: RunWriteLifecycleOptions<T>,
): Promise<WriteLifecycleResult<T>> {
  return runExclusive(options.key, () => executeWriteLifecycle(options))
}

async function executeWriteLifecycle<T>(
  options: RunWriteLifecycleOptions<T>,
): Promise<WriteLifecycleResult<T>> {
  const slowAfterMs = options.slowAfterMs ?? 3_000
  const timeoutMs = options.timeoutMs ?? 30_000
  const timings: WriteTimings = {
    key: options.key,
    userClickAt: performance.now(),
    stages: [],
  }
  let slowWarned = false
  let slowTimer: ReturnType<typeof setTimeout> | undefined

  const setPhase = (phase: WritePhase) => {
    const message =
      phase === 'idle' || phase === 'completed'
        ? ''
        : phase === 'error'
          ? ''
          : slowWarned
            ? WRITE_SLOW_URDU
            : WRITE_PROGRESS_URDU
    options.onPhase?.(phase, message)
  }

  markStage(timings, 'user_click')
  setPhase('submitting')
  markStage(timings, 'submitting')

  slowTimer = setTimeout(() => {
    slowWarned = true
    options.onSlow?.()
    options.onPhase?.('writing', WRITE_SLOW_URDU)
  }, slowAfterMs)

  try {
    const value = await withTimeout(
      (async () => {
        setPhase('writing')
        markStage(timings, 'repository_start')
        markStage(timings, 'firestore_start')
        const result = await options.work()
        markStage(timings, 'work_done')

        setPhase('server_ack')
        markStage(timings, 'firestore_ack_start')
        await awaitQueueLabels(options.queueLabels ?? [])
        markStage(timings, 'firestore_ack')

        if (options.refreshRepos) {
          setPhase('refreshing_repos')
          markStage(timings, 'repository_refresh_start')
          await options.refreshRepos()
          markStage(timings, 'repository_refresh')
        }

        if (options.refreshCounters) {
          setPhase('refreshing_counters')
          markStage(timings, 'counter_refresh_start')
          await options.refreshCounters()
          markStage(timings, 'counter_refresh')
        }

        if (options.refreshUi) {
          setPhase('refreshing_ui')
          markStage(timings, 'ui_refresh_start')
          await options.refreshUi()
          markStage(timings, 'ui_refresh')
        }

        return result
      })(),
      timeoutMs,
    )

    setPhase('completed')
    markStage(timings, 'completed')
    timings.completedMs =
      timings.stages[timings.stages.length - 1]?.msFromClick
    recordTimings(timings)

    return { ok: true, value, timings, slowWarned }
  } catch (error) {
    const classified = classifyWriteError(error)
    setPhase('error')
    markStage(timings, 'error')
    timings.completedMs =
      timings.stages[timings.stages.length - 1]?.msFromClick
    recordTimings(timings)
    return {
      ok: false,
      code: classified.code,
      message: classified.message,
      timings,
      slowWarned,
      error,
    }
  } finally {
    if (slowTimer !== undefined) clearTimeout(slowTimer)
  }
}
