/**
 * KC-0098 — Measured profiling of critical sync workflows (no estimates).
 * Run: npx vite-node scripts/kc0098-profile.ts
 */

import {
  clearActionProfileSamples,
  getActionProfileSamples,
  isActionLocked,
  runExclusive,
  tryBeginAction,
  endAction,
} from '../src/lib/reliability/singleActionGuard'
import { buildCampaignMatrixRows } from '../src/lib/campaignExecutionMatrix'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import { getAllRukns } from '../src/lib/peopleStore'

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]!
}

function measure(label: string, iterations: number, fn: () => void) {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) fn()
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    fn()
    samples.push(performance.now() - t0)
  }
  const sum = samples.reduce((a, b) => a + b, 0)
  return {
    label,
    iterations,
    avgMs: Math.round((sum / samples.length) * 1000) / 1000,
    p50Ms: Math.round(percentile(samples, 50) * 1000) / 1000,
    p95Ms: Math.round(percentile(samples, 95) * 1000) / 1000,
    maxMs: Math.round(Math.max(...samples) * 1000) / 1000,
  }
}

async function main() {
  clearActionProfileSamples()
  const rukns = getAllRukns()
  const ruknId = rukns[0]?.id ?? 'rukn-profile-fallback'

  const assigned = getAssignedKarkunanForRukn(ruknId)
  console.log('KC-0098 Profile')
  console.log('===============')
  console.log(`Rukn: ${ruknId}`)
  console.log(`Assigned Karkuns: ${assigned.length}`)
  console.log('')

  const matrixBuild = measure('buildCampaignMatrixRows', 50, () => {
    buildCampaignMatrixRows(ruknId)
  })

  const key = 'profile:double-click'
  const first = tryBeginAction(key, 400)
  const secondImmediate = tryBeginAction(key, 400)
  const lockedWhileHeld = isActionLocked(key)
  endAction(key)
  await new Promise((r) => setTimeout(r, 10))
  const afterEnd = tryBeginAction(key, 50)
  endAction(key)

  let exclusiveRuns = 0
  const exclusiveWork = () =>
    runExclusive('profile:exclusive', async () => {
      exclusiveRuns += 1
      await new Promise((r) => setTimeout(r, 30))
      return exclusiveRuns
    })
  const [a, b, c] = await Promise.all([exclusiveWork(), exclusiveWork(), exclusiveWork()])

  const ackSamples: number[] = []
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now()
    const ok = tryBeginAction(`ack:${i}`, 1)
    if (ok) endAction(`ack:${i}`)
    ackSamples.push(performance.now() - t0)
  }
  const ackAvg = ackSamples.reduce((x, y) => x + y, 0) / ackSamples.length

  console.log('Measured timings (ms)')
  console.log(JSON.stringify({ matrixBuild, ackAvgMs: Math.round(ackAvg * 1000) / 1000 }, null, 2))
  console.log('')
  console.log('Single-action lock')
  console.log(
    JSON.stringify(
      {
        firstAcquire: first,
        secondImmediateAcquire: secondImmediate,
        lockedWhileHeld,
        acquireAfterEnd: afterEnd,
      },
      null,
      2,
    ),
  )
  console.log('')
  console.log('Request de-duplication (runExclusive)')
  console.log(
    JSON.stringify(
      {
        exclusiveRuns,
        results: [a, b, c],
        note: 'All callers should share one run (exclusiveRuns === 1)',
      },
      null,
      2,
    ),
  )
  console.log('')
  console.log('Profile samples recorded:', getActionProfileSamples().length)

  if (!first || secondImmediate || !lockedWhileHeld || !afterEnd || exclusiveRuns !== 1) {
    console.error('KC-0098 profile assertions failed')
    process.exit(1)
  }

  console.log('KC-0098 profile OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
