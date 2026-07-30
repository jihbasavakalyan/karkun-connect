/**
 * KC-028B — Unified Firestore write-operation lifecycle.
 *
 * idle → validating → writing → committed → refreshing → completed
 * Failure: writing → failed
 *
 * Reuses KC-0098 singleActionGuard + KC-ARCH-001 awaitQueuedWrite.
 * Never report success before Firestore commit ACK.
 */

import { runExclusive } from '@/lib/reliability/singleActionGuard'

export const WRITE_PROGRESS_URDU = 'محفوظ کیا جا رہا ہے...'
export const WRITE_SLOW_URDU =
  'کارروائی مکمل ہونے میں معمول سے زیادہ وقت لگ رہا ہے...'

/** Canonical KC-028B phases (+ aliases kept for existing call sites). */
export type WritePhase =
  | 'idle'
  | 'validating'
  | 'submitting' // alias of validating (compat)
  | 'writing'
  | 'committed'
  | 'server_ack' // alias of committed (compat)
  | 'refreshing'
  | 'refreshing_repos'
  | 'refreshing_counters'
  | 'refreshing_ui'
  | 'completed'
  | 'failed'
  | 'error' // alias of failed (compat)

export type WriteLifecycleErrorCode =
  | 'permission_denied'
  | 'already_processed'
  | 'conflict'
  | 'duplicate'
  | 'network'
  | 'timeout'
  | 'offline'
  | 'cancelled'
  | 'not_found'
  | 'validation'
  | 'unknown'

export const WRITE_ERROR_URDU: Record<WriteLifecycleErrorCode, string> = {
  permission_denied: 'آپ کو یہ تبدیلی محفوظ کرنے کی اجازت نہیں ہے۔',
  already_processed: 'یہ درخواست پہلے ہی نمٹائی جا چکی ہے۔',
  conflict: 'ڈیٹا میں تضاد ہے۔ صفحہ تازہ کریں اور دوبارہ کوشش کریں۔',
  duplicate: 'یہ اندراج پہلے سے موجود ہے۔',
  network: 'نیٹ ورک کی خرابی۔ دوبارہ کوشش کریں۔',
  timeout: 'وقت ختم ہو گیا۔ دوبارہ کوشش کریں۔',
  offline: 'آپ آف لائن ہیں۔ کنکشن بحال کر کے دوبارہ کوشش کریں۔',
  cancelled: 'کارروائی منسوخ ہو گئی۔',
  not_found: 'مطلوبہ ریکارڈ نہیں ملا۔',
  validation: 'درج کردہ معلومات درست نہیں۔',
  unknown: 'محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
}

export type WriteStageTiming = {
  stage: string
  at: number
  msFromClick: number
}

export type WriteDiagnostics = {
  operation: string
  repository?: string
  documentId?: string
}

export type WriteTimings = {
  key: string
  userClickAt: number
  stages: WriteStageTiming[]
  completedMs?: number
  diagnostics?: WriteDiagnostics
  attempts?: number
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
  /** Human-readable operation name for [WRITE] logs (e.g. Visit, Approve). */
  operation?: string
  repository?: string
  documentId?: string
  /** Firestore queue label(s) to await after work (Server ACK). */
  queueLabels?: string[]
  /** Show slow Urdu copy after this many ms (default 3000). */
  slowAfterMs?: number
  /** Fail the whole operation after this many ms (default 30000). */
  timeoutMs?: number
  /**
   * Max attempts including the first try (default 3).
   * Only transient errors retry (timeout / network / unavailable / offline).
   */
  maxAttempts?: number
  /** Base delay ms for exponential backoff (default 250). */
  retryBaseMs?: number
  onPhase?: (phase: WritePhase, message: string) => void
  onSlow?: () => void
  refreshRepos?: () => void | Promise<void>
  refreshCounters?: () => void | Promise<void>
  refreshUi?: () => void | Promise<void>
  /** Optional explicit validation step before work. */
  validate?: () => void | Promise<void>
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

  if (
    code === 'not-found' ||
    code === 'not_found' ||
    /missing document|not found|no document/i.test(raw)
  ) {
    return { code: 'not_found', message: WRITE_ERROR_URDU.not_found }
  }

  if (
    code === 'cancelled' ||
    code === 'canceled' ||
    /cancelled|canceled|منسوخ/i.test(raw)
  ) {
    return { code: 'cancelled', message: WRITE_ERROR_URDU.cancelled }
  }

  if (
    code === 'invalid-argument' ||
    code === 'failed-precondition' ||
    code === 'validation' ||
    /validation|invalid|درج کردہ/i.test(raw)
  ) {
    return { code: 'validation', message: WRITE_ERROR_URDU.validation }
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

  if (code === 'timeout' || /timeout|timed out|وقت ختم/i.test(raw)) {
    return { code: 'timeout', message: WRITE_ERROR_URDU.timeout }
  }

  if (code === 'unavailable' || /offline|آف لائن/i.test(raw)) {
    return { code: 'offline', message: WRITE_ERROR_URDU.offline }
  }

  if (
    code === 'storagefailure' ||
    /network|unavailable|deadline|نیٹ ورک/i.test(raw)
  ) {
    return { code: 'network', message: WRITE_ERROR_URDU.network }
  }

  if (raw.trim() && raw.length <= 160 && !/[{\[]/.test(raw)) {
    return { code: 'unknown', message: raw }
  }

  return { code: 'unknown', message: WRITE_ERROR_URDU.unknown }
}

/** Transient failures eligible for automatic retry. */
export function isRetryableWriteError(error: unknown): boolean {
  const { code } = classifyWriteError(error)
  return code === 'timeout' || code === 'network' || code === 'offline'
}

function writeLog(
  event: string,
  details: Record<string, unknown>,
): void {
  // Development / non-production diagnostics only (KC-028B).
  const isProd =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD)
  if (isProd && !/Fail|Error|Timeout/i.test(event)) return
  console.info(`[WRITE] ${event}`, details)
}

function markStage(
  timings: WriteTimings,
  stage: string,
  extra?: Record<string, unknown>,
): void {
  const msFromClick = performance.now() - timings.userClickAt
  timings.stages.push({ stage, at: Date.now(), msFromClick })
  const op = timings.diagnostics?.operation ?? timings.key
  writeLog(stageLabel(stage, op), {
    operation: op,
    repository: timings.diagnostics?.repository,
    documentId: timings.diagnostics?.documentId,
    stage,
    ms: Math.round(msFromClick * 10) / 10,
    attempts: timings.attempts,
    ...extra,
  })
}

function stageLabel(stage: string, operation: string): string {
  switch (stage) {
    case 'user_click':
    case 'validating':
    case 'submitting':
      return `${operation} Started`
    case 'writing':
    case 'repository_start':
    case 'firestore_start':
      return `${operation} Writing`
    case 'work_done':
      return `Commit Success`
    case 'firestore_ack':
      return `ACK Received`
    case 'repository_refresh':
      return `Repository Refreshed`
    case 'counter_refresh':
    case 'ui_refresh':
      return `Dashboard Updated`
    case 'completed':
      return `Completed`
    case 'error':
    case 'failed':
      return `${operation} Failed`
    case 'retry':
      return `${operation} Retry`
    default:
      return `${operation} ${stage}`
  }
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3)
  const retryBaseMs = options.retryBaseMs ?? 250
  const operation = options.operation ?? options.key
  const timings: WriteTimings = {
    key: options.key,
    userClickAt: performance.now(),
    stages: [],
    diagnostics: {
      operation,
      repository: options.repository,
      documentId: options.documentId,
    },
    attempts: 0,
  }
  let slowWarned = false
  let slowTimer: ReturnType<typeof setTimeout> | undefined

  const setPhase = (phase: WritePhase) => {
    const message =
      phase === 'idle' || phase === 'completed'
        ? ''
        : phase === 'error' || phase === 'failed'
          ? ''
          : slowWarned
            ? WRITE_SLOW_URDU
            : WRITE_PROGRESS_URDU
    options.onPhase?.(phase, message)
  }

  markStage(timings, 'user_click')
  setPhase('validating')
  setPhase('submitting')
  markStage(timings, 'validating')
  markStage(timings, 'submitting')

  slowTimer = setTimeout(() => {
    slowWarned = true
    options.onSlow?.()
    options.onPhase?.('writing', WRITE_SLOW_URDU)
  }, slowAfterMs)

  try {
    if (options.validate) {
      await options.validate()
    }

    const value = await withTimeout(
      (async () => {
        let lastError: unknown
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          timings.attempts = attempt
          setPhase('writing')
          markStage(timings, 'repository_start')
          markStage(timings, 'firestore_start')
          markStage(timings, 'writing')
          try {
            const result = await options.work()
            markStage(timings, 'work_done')

            setPhase('committed')
            setPhase('server_ack')
            markStage(timings, 'firestore_ack_start')
            await awaitQueueLabels(options.queueLabels ?? [])
            markStage(timings, 'firestore_ack')

            setPhase('refreshing')
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
          } catch (error) {
            lastError = error
            const retryable = isRetryableWriteError(error) && attempt < maxAttempts
            if (!retryable) throw error
            const delay = retryBaseMs * 2 ** (attempt - 1)
            markStage(timings, 'retry', {
              attempt,
              nextDelayMs: delay,
              code: classifyWriteError(error).code,
            })
            writeLog(`${operation} Retry`, {
              operation,
              attempt,
              maxAttempts,
              delayMs: delay,
              code: classifyWriteError(error).code,
            })
            await sleep(delay)
          }
        }
        throw lastError
      })(),
      timeoutMs,
    )

    setPhase('completed')
    markStage(timings, 'completed', {
      durationMs: Math.round((performance.now() - timings.userClickAt) * 10) / 10,
    })
    timings.completedMs =
      timings.stages[timings.stages.length - 1]?.msFromClick
    recordTimings(timings)
    writeLog(`Completed (${Math.round(timings.completedMs ?? 0)} ms)`, {
      operation,
      repository: options.repository,
      documentId: options.documentId,
      durationMs: timings.completedMs,
      success: true,
    })

    return { ok: true, value, timings, slowWarned }
  } catch (error) {
    const classified = classifyWriteError(error)
    setPhase('failed')
    setPhase('error')
    markStage(timings, 'failed')
    markStage(timings, 'error')
    timings.completedMs =
      timings.stages[timings.stages.length - 1]?.msFromClick
    recordTimings(timings)
    writeLog(`${operation} Failed`, {
      operation,
      repository: options.repository,
      documentId: options.documentId,
      code: classified.code,
      durationMs: timings.completedMs,
      success: false,
    })
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
