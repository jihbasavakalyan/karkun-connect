/**
 * Reliability layer — shared persist error mapping + guidance merge + queue await.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRIENDLY_DATA_ACCESS_ERROR } from '@/repositories/errors'
import {
  FRIENDLY_PERSIST_PERMISSION_ERROR,
  toOperatorPersistError,
} from '@/lib/reliability/persistErrors'
import { mergeGuidanceState } from '@/lib/reliability/guidanceStateMerge'
import type { GuidanceState } from '@/repositories/interfaces/ExecutionRepository'
import type { Commitment, JourneyTimelineEvent } from '@/types/guidance'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

const persistErrors = readFileSync(resolve(root, 'src/lib/reliability/persistErrors.ts'), 'utf8')
assert(persistErrors.includes('FRIENDLY_PERSIST_ERROR'), 'persist error constants present')
assert(
  !toOperatorPersistError('executions.guidance', {
    code: 'Permission',
    message: FRIENDLY_DATA_ACCESS_ERROR,
  }).includes('Unable to load additional information'),
  'persist mapper must not reuse read-path FRIENDLY_DATA_ACCESS_ERROR',
)
assert(
  toOperatorPersistError('executions.guidance', {
    code: 'Permission',
    message: FRIENDLY_DATA_ACCESS_ERROR,
  }) === FRIENDLY_PERSIST_PERMISSION_ERROR,
  'permission denials map to persist permission copy',
)

const events = readFileSync(resolve(root, 'src/lib/executionPersistEvents.ts'), 'utf8')
assert(events.includes('toOperatorPersistError'), 'persist events use shared mapper')

const firestore = readFileSync(
  resolve(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
assert(firestore.includes('awaitQueuedWrite'), 'shared awaitQueuedWrite present')
assert(firestore.includes('writeMergedGuidanceState'), 'guidance merge write present')
assert(firestore.includes('mergeGuidanceState'), 'guidance merge helper wired')

const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8')
assert(rules.includes("docId == 'guidance'"), 'rules allow shared guidance blob for Rukn')

const remote: GuidanceState = {
  commitments: [
    {
      id: 'c-remote',
      karkunId: 'kr-1',
      ruknId: 'R001',
      text: 'remote',
      targetDate: '2026-07-01',
      reminderEnabled: false,
      status: 'pending',
      createdAt: '2026-07-01T00:00:00.000Z',
      createdBy: 'Rukn',
      source: 'manual',
    } satisfies Commitment,
  ],
  timelineEvents: [
    {
      id: 't-remote',
      karkunId: 'kr-1',
      title: 'Remote event',
      occurredAt: '2026-07-01T00:00:00.000Z',
      source: 'system',
    } satisfies JourneyTimelineEvent,
  ],
}

const local: GuidanceState = {
  commitments: [
    {
      id: 'c-local',
      karkunId: 'kr-2',
      ruknId: 'R002',
      text: 'local',
      targetDate: '2026-07-02',
      reminderEnabled: false,
      status: 'pending',
      createdAt: '2026-07-02T00:00:00.000Z',
      createdBy: 'Rukn',
      source: 'manual',
    } satisfies Commitment,
  ],
  timelineEvents: [],
}

const merged = mergeGuidanceState(remote, local)
assert(merged.commitments.some((c) => c.id === 'c-remote'), 'merge keeps remote commitment')
assert(merged.commitments.some((c) => c.id === 'c-local'), 'merge keeps local commitment')
assert(merged.timelineEvents.some((t) => t.id === 't-remote'), 'merge keeps remote timeline')

console.log('verify-reliability-layer: OK', {
  mergedCommitments: merged.commitments.length,
  persistPermissionCopy: FRIENDLY_PERSIST_PERMISSION_ERROR.slice(0, 40),
})
