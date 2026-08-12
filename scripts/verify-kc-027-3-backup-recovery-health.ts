/**
 * KC-027.3 — Backup/Recovery Health Visibility documentation gate.
 * Run: npm run verify:kc-027.3
 *
 * Docs/ops only — asserts canonical health contract + AC markers.
 * Does not call GCP or mutate Firestore.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath: string): string {
  const fullPath = path.join(projectRoot, relativePath)
  assert.ok(existsSync(fullPath), `Missing required file: ${relativePath}`)
  return readFileSync(fullPath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

console.log('▶ KC-027.1 + KC-027.2 still green')
{
  for (const script of ['verify:kc-027.1', 'verify:kc-027.2'] as const) {
    const result = spawnSync('npm', ['run', script], {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: true,
      env: process.env,
    })
    if (result.status !== 0) {
      const tail = [result.stdout, result.stderr].filter(Boolean).join('\n').split('\n').slice(-30).join('\n')
      throw new Error(`${script} failed\n${tail}`)
    }
  }
}

console.log('▶ KC-027.3 artifacts present')
{
  assert.ok(existsSync(path.join(projectRoot, 'docs/architecture/kc-027-3-arch009-gate.md')))
  assert.ok(existsSync(path.join(projectRoot, 'docs/operations/firestore-backup-recovery-health.md')))
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.equal(typeof pkg.scripts['verify:kc-027.3'], 'string', 'verify:kc-027.3 script missing')
}

console.log('▶ health states + schema fields')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  for (const state of ['unknown', 'verified', 'stale', 'failed'] as const) {
    assertIncludes(health, state, `health state ${state}`)
  }
  assertIncludes(health, 'asOf', 'asOf')
  assertIncludes(health, 'curated-ops-snapshot', 'curated source')
  assertIncludes(health, 'asia-south1', 'production location')
  assertIncludes(health, '(default)', 'production database')
  assertIncludes(health, 'PITR', 'PITR section')
  assertIncludes(health, 'scheduled', 'scheduled backup')
  assertIncludes(health, 'READY', 'READY backup state')
  assert.ok(
    health.includes('knownLimitations') || health.includes('Known limitations'),
    'known limitations must be documented',
  )
}

console.log('▶ domain separation (GCP DR ≠ Settings Backup Status)')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  assertIncludes(health, 'GCP managed DR', 'GCP DR domain')
  assertIncludes(health, 'Backup Status', 'Settings Backup Status callout')
  assert.ok(
    /not[^\n]*Firestore DR|NOT[^\n]*Firestore DR|Is Firestore DR health\?/i.test(health),
    'must reject Settings Backup Status as DR',
  )
  assert.ok(
    /do not invent|Do \*\*not\*\* invent|Do not invent/i.test(health),
    'must forbid inventing next backup time',
  )
  assertIncludes(health, 'Not claimed', 'next execution not claimed')
}

console.log('▶ KC-027.2 verified evidence recorded')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  assertIncludes(health, 'e58615a2-d8d7-428e-b5e5-55bf7b278f07', 'backup id')
  assertIncludes(health, '2026-08-12T00:43:48.982318Z', 'snapshot time')
  assertIncludes(health, 'kc0272-restore-20260812', 'restore target')
  assertIncludes(health, 'SUCCESSFUL', 'restore result')
  assertIncludes(health, 'RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS', 'drill certification')
  assertIncludes(health, '678', 'karkuns count')
  assertIncludes(health, '10/10', 'collection parity')
  assertIncludes(health, 'zero', 'document-ID parity')
}

console.log('▶ known limitations + security boundary')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  assertIncludes(health, 'application-level connectivity', 'limitation connectivity')
  assertIncludes(health, 'destructive production recovery', 'limitation prod recovery')
  assertIncludes(health, 'byte-level', 'limitation byte equality')
  assertIncludes(health, 'credentials', 'no client credentials')
  assertIncludes(health, 'Admin-authenticated', 'future API Admin auth')
  assertIncludes(health, 'read-only', 'future API read-only')
  assert.ok(/no restore|No restore/i.test(health), 'no restore on health endpoint')
}

console.log('▶ ARCH-009 gate + AC-1…AC-8')
{
  const gate = read('docs/architecture/kc-027-3-arch009-gate.md')
  assertIncludes(gate, 'Phase 0', 'gate Phase 0')
  assertIncludes(gate, 'Go / No-Go', 'gate Go/No-Go')
  assertIncludes(gate, 'GO', 'gate GO')
  for (const id of ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8']) {
    assertIncludes(gate, id, `acceptance ${id}`)
  }
  assert.ok(/no `src\/`|No `src\/`/i.test(gate), 'no src constraint')
  assertIncludes(gate, 'deferred', 'API/UI deferred')
}

console.log('▶ ops index links health doc')
{
  const opsReadme = read('docs/operations/README.md')
  assertIncludes(opsReadme, 'firestore-backup-recovery-health.md', 'ops README health link')
  const baseline = read('docs/operations/firestore-backup-recovery-baseline.md')
  assertIncludes(baseline, 'firestore-backup-recovery-health.md', 'baseline health pointer')
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'firestore-backup-recovery-health.md', 'runbook health pointer')
}

console.log('✅ KC-027.3 backup/recovery health verification passed')
