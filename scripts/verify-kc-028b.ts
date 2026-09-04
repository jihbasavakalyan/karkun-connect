/**
 * KC-028B — Firestore write lifecycle stabilization verify.
 * Run: npm run verify:kc-028b
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import {
  WRITE_ERROR_URDU,
  WRITE_PROGRESS_URDU,
  WRITE_SLOW_URDU,
  classifyWriteError,
  clearRecentWriteTimings,
  getRecentWriteTimings,
  isRetryableWriteError,
  runWriteLifecycle,
  writeProgressMessage,
} from '@/lib/reliability/writeLifecycle'
import { isExclusiveInFlight } from '@/lib/reliability/singleActionGuard'
import {
  commitRepositoryWrite,
  REPOSITORY_QUEUE,
} from '@/lib/reliability/repositoryWrite'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-kc-028b: start')

assert(WRITE_PROGRESS_URDU.includes('محفوظ'), 'progress Urdu')
assert(WRITE_SLOW_URDU.includes('معمول سے زیادہ'), 'slow Urdu')
assert(writeProgressMessage(true, false) === WRITE_PROGRESS_URDU, 'busy progress')
assert(writeProgressMessage(true, true) === WRITE_SLOW_URDU, 'slow progress')
assert(writeProgressMessage(false, true) === '', 'idle empty')
console.log('  OK  Urdu progress + slow copy constants')

assert(
  classifyWriteError({ code: 'permission-denied', message: 'x' }).code === 'permission_denied',
  'permission',
)
assert(
  classifyWriteError({
    code: 'ALREADY_PROCESSED',
    message: 'This request has already been processed.',
  }).code === 'already_processed',
  'already processed',
)
assert(classifyWriteError({ code: 'timeout', message: 'timed out' }).code === 'timeout', 'timeout')
assert(
  classifyWriteError({ code: 'StorageFailure', message: 'network blip' }).code === 'network',
  'network',
)
assert(
  classifyWriteError({ code: 'unavailable', message: 'offline' }).code === 'offline',
  'offline',
)
assert(
  classifyWriteError({ code: 'cancelled', message: 'aborted' }).code === 'cancelled',
  'cancelled',
)
assert(
  classifyWriteError({ code: 'not-found', message: 'missing document' }).code === 'not_found',
  'not_found',
)
assert(
  classifyWriteError({ code: 'invalid-argument', message: 'bad' }).code === 'validation',
  'validation',
)
assert(classifyWriteError({ code: 'duplicate', message: 'dup' }).code === 'duplicate', 'duplicate')
assert(classifyWriteError({ code: 'conflict', message: 'conflict' }).code === 'conflict', 'conflict')
assert(WRITE_ERROR_URDU.already_processed.includes('پہلے ہی'), 'already processed Urdu')
assert(WRITE_ERROR_URDU.offline.includes('آف لائن'), 'offline Urdu')
assert(isRetryableWriteError({ code: 'timeout' }), 'timeout retryable')
assert(isRetryableWriteError({ code: 'unavailable', message: 'offline' }), 'offline retryable')
assert(isRetryableWriteError({ code: 'StorageFailure', message: 'network' }), 'network retryable')
assert(!isRetryableWriteError({ code: 'permission-denied' }), 'permission not retryable')
assert(!isRetryableWriteError({ code: 'not-found' }), 'not_found not retryable')
assert(!isRetryableWriteError({ code: 'invalid-argument' }), 'validation not retryable')
console.log('  OK  Error classification + retry policy')

{
  clearRecentWriteTimings()
  let starts = 0
  const key = 'verify-kc-028b-dup'
  const work = () =>
    runWriteLifecycle({
      key,
      operation: 'DupTest',
      work: async () => {
        starts += 1
        await new Promise((r) => setTimeout(r, 40))
        return 'ok'
      },
    })
  const [a, b] = await Promise.all([work(), work()])
  assert(a.ok && b.ok, 'both ok')
  assert(starts === 1, `expected 1 start, got ${starts}`)
  assert(!isExclusiveInFlight(key), 'cleared after settle')
  console.log('  OK  Duplicate click prevention (runExclusive coalesce)')
}

{
  clearRecentWriteTimings()
  let attempts = 0
  const result = await runWriteLifecycle({
    key: 'verify-kc-028b-retry',
    operation: 'RetryTest',
    maxAttempts: 3,
    retryBaseMs: 10,
    timeoutMs: 5_000,
    work: async () => {
      attempts += 1
      if (attempts < 3) {
        throw Object.assign(new Error('network blip'), { code: 'unavailable' })
      }
      return 'recovered'
    },
  })
  assert(result.ok, 'retry eventually ok')
  assert(attempts === 3, `expected 3 attempts, got ${attempts}`)
  assert(result.timings.attempts === 3, 'timings attempts')
  console.log('  OK  Exponential backoff retry for transient failures')
}

{
  clearRecentWriteTimings()
  let attempts = 0
  const result = await runWriteLifecycle({
    key: 'verify-kc-028b-no-retry-perm',
    operation: 'PermTest',
    maxAttempts: 3,
    work: async () => {
      attempts += 1
      throw Object.assign(new Error('denied'), { code: 'permission-denied' })
    },
  })
  assert(!result.ok, 'permission fails')
  assert(result.code === 'permission_denied', 'permission code')
  assert(attempts === 1, 'permission not retried')
  console.log('  OK  Permission denied — no retry')
}

{
  clearRecentWriteTimings()
  let slowFired = false
  const result = await runWriteLifecycle({
    key: 'verify-kc-028b-slow',
    operation: 'SlowTest',
    slowAfterMs: 20,
    work: async () => {
      await new Promise((r) => setTimeout(r, 50))
      return true
    },
    onSlow: () => {
      slowFired = true
    },
  })
  assert(result.ok, 'slow path ok')
  assert(result.slowWarned || slowFired, 'slow warned')
  console.log('  OK  Slow network warning path')
}

{
  clearRecentWriteTimings()
  const result = await runWriteLifecycle({
    key: 'verify-kc-028b-timeout',
    operation: 'TimeoutTest',
    timeoutMs: 30,
    maxAttempts: 1,
    work: async () => {
      await new Promise((r) => setTimeout(r, 80))
      return true
    },
  })
  assert(!result.ok, 'timeout fails')
  assert(result.code === 'timeout', 'timeout code')
  assert(result.message === WRITE_ERROR_URDU.timeout, 'timeout Urdu')
  console.log('  OK  Timeout handling')
}

{
  clearRecentWriteTimings()
  const phases: string[] = []
  let refreshedRepos = false
  let refreshedCounters = false
  let refreshedUi = false
  const result = await runWriteLifecycle({
    key: 'verify-kc-028b-refresh',
    operation: 'Visit',
    repository: 'executions.annexure',
    documentId: 'doc-1',
    work: async () => 'saved',
    onPhase: (phase) => {
      phases.push(phase)
    },
    refreshRepos: () => {
      refreshedRepos = true
    },
    refreshCounters: () => {
      refreshedCounters = true
    },
    refreshUi: () => {
      refreshedUi = true
    },
  })
  assert(result.ok, 'refresh path ok')
  assert(refreshedRepos && refreshedCounters && refreshedUi, 'refresh hooks ran')
  assert(phases.includes('validating') || phases.includes('submitting'), 'validating')
  assert(phases.includes('writing'), 'writing')
  assert(phases.includes('committed') || phases.includes('server_ack'), 'committed/ACK')
  assert(phases.includes('completed'), 'completed')
  const timings = getRecentWriteTimings()
  assert(timings.length >= 1, 'timings recorded')
  assert(
    timings[timings.length - 1]!.stages.some((s) => s.stage === 'user_click'),
    'user_click stage',
  )
  assert(
    timings[timings.length - 1]!.stages.some((s) => s.stage === 'firestore_ack'),
    'firestore_ack stage — ACK before success',
  )
  assert(timings[timings.length - 1]!.diagnostics?.operation === 'Visit', 'diagnostics op')
  console.log('  OK  ACK before success + repository / counter / UI refresh')
}

{
  clearRecentWriteTimings()
  const result = await commitRepositoryWrite({
    key: 'verify-kc-028b-repo-helper',
    operation: 'Assignment Save',
    repository: REPOSITORY_QUEUE.connections,
    documentId: 'asn-1',
    queueLabels: REPOSITORY_QUEUE.connections,
    work: async () => ({ saved: true }),
  })
  assert(result.ok, 'repo helper ok')
  console.log('  OK  Shared commitRepositoryWrite helper')
}

{
  const lifecycle = read('src/lib/reliability/writeLifecycle.ts')
  assert(lifecycle.includes('runWriteLifecycle'), 'runWriteLifecycle')
  assert(lifecycle.includes('[WRITE]'), '[WRITE] instrumentation')
  assert(lifecycle.includes('isRetryableWriteError'), 'retry helper')
  assert(lifecycle.includes('exponential') || lifecycle.includes('2 **'), 'backoff')
  const repoWrite = read('src/lib/reliability/repositoryWrite.ts')
  assert(repoWrite.includes('commitRepositoryWrite'), 'repo helper module')
  const hook = read('src/hooks/useWriteLifecycle.ts')
  assert(hook.includes('useWriteLifecycle'), 'hook')
  assert(hook.includes('writeProgressMessage'), 'progress')
  assert(hook.includes('slowFired'), 'slow warning is latched once per run')
  assert(hook.includes('runGenerationRef.current += 1'), 'unmount invalidates in-flight UI callbacks')
  const index = read('src/lib/reliability/index.ts')
  assert(index.includes('runWriteLifecycle'), 're-exported')
  assert(index.includes('commitRepositoryWrite'), 'repo helper exported')
  console.log('  OK  Lifecycle module + hook + [WRITE] logs present')
}

{
  const inbox = read('src/pages/admin/AdminInboxPage.tsx')
  assert(inbox.includes('useWriteLifecycle'), 'inbox hook')
  assert(inbox.includes('inbox:approve:'), 'approve key')
  assert(inbox.includes('inbox:reject:'), 'reject key')
  assert(inbox.includes('settings.karkunRequests'), 'queue label')

  const queue = read('src/components/forms/people/PendingKarkunRequestQueue.tsx')
  assert(queue.includes('useWriteLifecycle'), 'pending queue hook')

  const service = read('src/services/karkunRequestService.ts')
  assert(service.includes('return inflight'), 'join inflight approve')
  assert(
    !/if \(inflight\) \{\s*return alreadyProcessedResult\(\)/.test(service),
    'no fake already processed',
  )
  assert(service.includes('await awaitKarkunRequestsPersist()'), 'reject awaits persist')
  assert(service.includes('export async function rejectNewKarkunRequest'), 'reject async')
  console.log('  OK  Inbox approve/reject + concurrent-admin ready wiring')
}

{
  const qa = read('src/components/execution/ConnectionQuickActionsPanel.tsx')
  assert(qa.includes('useWriteLifecycle'), 'quick actions')
  assert(qa.includes('qa:${karkunId}:jih'), 'jih key')

  const ijtema = read('src/pages/rukn/WeeklyIjtemaRegisterPage.tsx')
  assert(ijtema.includes('useWriteLifecycle'), 'ijtema')
  assert(ijtema.includes('compliance.weeklyIjtemaSubmissions'), 'ijtema label')

  const baitul = read('src/pages/rukn/RuknMonthlyBaitulMaalPage.tsx')
  assert(baitul.includes('useWriteLifecycle'), 'baitul')
  assert(baitul.includes('compliance.monthlyBaitulMaalSubmissions'), 'baitul label')

  const comm = read('src/services/communicationService.ts')
  assert(comm.includes("awaitQueuedWrite('communications')"), 'comm await')

  const composer = read('src/components/communication/MessageComposerModal.tsx')
  assert(composer.includes('useWriteLifecycle'), 'composer')

  const guidance = read('src/components/guidance/CommitmentPanel.tsx')
  assert(guidance.includes('useWriteLifecycle'), 'guidance')
  assert(guidance.includes('executions.guidance'), 'guidance label')

  const assignment = read('src/services/assignmentService.ts')
  assert(assignment.includes('withConnectionsAck'), 'assignment ACK wrapper')
  assert(assignment.includes('REPOSITORY_QUEUE.connections'), 'connections queue')
  console.log('  OK  Visit / Ijtema / Baitul / JIH / Communication / Guidance / Assignment ACK')
}

{
  const gate = read('docs/architecture/kc-028b-arch009-gate.md')
  assert(gate.includes('KC-028B'), 'gate')
  assert(gate.includes('**GO**'), 'go decision')
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert(typeof pkg.scripts['verify:kc-028b'] === 'string', 'script registered')
  console.log('  OK  Gate + package script')
}

execSync('npm run verify:reliability', { cwd: root, stdio: 'pipe' })
console.log('  OK  npm run verify:reliability')

console.log('verify-kc-028b: OK')
