/**
 * KC-027.4 — Backup monitoring & alerting policy documentation gate (Stage A).
 * Run: npm run verify:kc-027.4
 *
 * Docs/ops only — does not call GCP or mutate Firestore.
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

console.log('▶ KC-027.1 … KC-027.3 still green')
{
  for (const script of ['verify:kc-027.1', 'verify:kc-027.2', 'verify:kc-027.3'] as const) {
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

console.log('▶ KC-027.4 artifacts present')
{
  assert.ok(existsSync(path.join(projectRoot, 'docs/architecture/kc-027-4-arch009-gate.md')))
  assert.ok(existsSync(path.join(projectRoot, 'docs/operations/firestore-backup-recovery-monitoring.md')))
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.equal(typeof pkg.scripts['verify:kc-027.4'], 'string', 'verify:kc-027.4 script missing')
}

console.log('▶ signals, states, composite severity')
{
  const mon = read('docs/operations/firestore-backup-recovery-monitoring.md')
  for (const signal of [
    'PITR',
    'daily',
    'weekly',
    'READY',
    'backup age',
    'Health snapshot',
    'Recovery drill',
    'configuration gap',
  ] as const) {
    assert.ok(new RegExp(signal, 'i').test(mon), `signal mention: ${signal}`)
  }
  for (const state of ['healthy', 'warning', 'stale', 'failed', 'unknown'] as const) {
    assertIncludes(mon, state, `state ${state}`)
  }
  assertIncludes(mon, 'failed > stale > warning > unknown > healthy', 'composite severity')
}

console.log('▶ three layers + derived thresholds (OUR policy)')
{
  const mon = read('docs/operations/firestore-backup-recovery-monitoring.md')
  assertIncludes(mon, 'Google / platform', 'layer A')
  assertIncludes(mon, 'operational policy', 'layer B')
  assertIncludes(mon, 'Derived monitoring thresholds', 'layer C')
  assert.ok(/not a Google SLA|not a Google SLA/i.test(mon), 'not Google SLA label')
  assertIncludes(mon, '> 36 h', '36h warning')
  assertIncludes(mon, '> 72 h', '72h failed')
  assertIncludes(mon, 'No READY', 'no READY failed')
  assertIncludes(mon, 'daily', 'daily schedule')
  assertIncludes(mon, '> 7 d', '7d stale')
  assertIncludes(mon, '> 14 d', '14d failed')
  assertIncludes(mon, '> 90 d', '90d drill warning')
  assertIncludes(mon, '> 180 d', '180d drill failed')
  assertIncludes(mon, 'GCS', 'GCS warning-only')
}

console.log('▶ prohibitions + incident mapping + security')
{
  const mon = read('docs/operations/firestore-backup-recovery-monitoring.md')
  assertIncludes(mon, 'next backup execution', 'forbid next-run')
  assertIncludes(mon, 'backup-age SLA', 'forbid backup-age SLA')
  assertIncludes(mon, 'Backup Status', 'Settings Backup Status')
  assertIncludes(mon, 'proof of recovery', 'backup ≠ recovery')
  assertIncludes(mon, 'P2', 'P2 mapping')
  assertIncludes(mon, 'P3', 'P3 mapping')
  assertIncludes(mon, 'P4', 'P4 mapping')
  assertIncludes(mon, 'credentials', 'no client credentials')
  assertIncludes(mon, 'read-only', 'read-only future')
  assert.ok(/no restore|No restore/i.test(mon), 'no restore on monitor path')
}

console.log('▶ Stage A/B/C + current evidence')
{
  const mon = read('docs/operations/firestore-backup-recovery-monitoring.md')
  assertIncludes(mon, 'Stage A', 'Stage A')
  assertIncludes(mon, 'Stage B', 'Stage B')
  assertIncludes(mon, 'Stage C', 'Stage C')
  assertIncludes(mon, 'Deferred', 'deferred stages')
  assertIncludes(mon, '(default)', 'prod database')
  assertIncludes(mon, 'asia-south1', 'location')
  assertIncludes(mon, 'e58615a2-d8d7-428e-b5e5-55bf7b278f07', 'backup id')
  assertIncludes(mon, 'kc0272-restore-20260812', 'restore target')
  assertIncludes(mon, 'SUCCESSFUL', 'restore result')
  assertIncludes(mon, 'RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS', 'drill cert')
}

console.log('▶ ARCH-009 gate + AC-1…AC-9')
{
  const gate = read('docs/architecture/kc-027-4-arch009-gate.md')
  assertIncludes(gate, 'Phase 0', 'Phase 0')
  assertIncludes(gate, 'Go / No-Go', 'Go/No-Go')
  assertIncludes(gate, 'GO', 'GO')
  for (const id of ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8', 'AC-9']) {
    assertIncludes(gate, id, id)
  }
}

console.log('▶ ops index + health/baseline/runbook pointers')
{
  assertIncludes(read('docs/operations/README.md'), 'firestore-backup-recovery-monitoring.md', 'README')
  assertIncludes(
    read('docs/operations/firestore-backup-recovery-health.md'),
    'firestore-backup-recovery-monitoring.md',
    'health pointer',
  )
  assertIncludes(
    read('docs/operations/firestore-backup-recovery-baseline.md'),
    'firestore-backup-recovery-monitoring.md',
    'baseline pointer',
  )
  assertIncludes(
    read('docs/operations/firestore-nonprod-recovery-runbook.md'),
    'firestore-backup-recovery-monitoring.md',
    'runbook pointer',
  )
}

console.log('✅ KC-027.4 backup monitoring policy verification passed')
