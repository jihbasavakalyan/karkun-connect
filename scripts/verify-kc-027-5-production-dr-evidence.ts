/**
 * KC-027.5 — Production DR evidence reconciliation documentation gate.
 * Run: npm run verify:kc-027.5
 *
 * Docs/ops only — asserts reconciled health facts. Does not call GCP.
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

console.log('▶ KC-027.1 … KC-027.4 still green')
{
  const result = spawnSync('npm', ['run', 'verify:kc-027.4'], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })
  if (result.status !== 0) {
    const tail = [result.stdout, result.stderr].filter(Boolean).join('\n').split('\n').slice(-40).join('\n')
    throw new Error(`verify:kc-027.4 failed\n${tail}`)
  }
}

console.log('▶ KC-027.5 artifacts present')
{
  assert.ok(existsSync(path.join(projectRoot, 'docs/architecture/kc-027-5-arch009-gate.md')))
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.equal(typeof pkg.scripts['verify:kc-027.5'], 'string', 'verify:kc-027.5 script missing')
}

console.log('▶ reconciled PITR + daily schedule (no longer unknown)')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  assertIncludes(health, 'POINT_IN_TIME_RECOVERY_ENABLED', 'PITR enabled')
  assertIncludes(health, '013be81e-21d8-4d7b-a94f-8251414d4adc', 'daily schedule id')
  assertIncludes(health, '8467200s', 'retention seconds')
  assertIncludes(health, '98 days', 'retention days')
  assertIncludes(health, 'gcloud read-only', 'evidence source')
  assert.ok(!/PITR[\s\S]{0,200}status \| \*\*unknown\*\*/i.test(health), 'PITR must not remain unknown')
  assertIncludes(health, 'NOT OBSERVED', 'weekly not observed')
  assert.ok(!/Weekly schedule \| \*\*yes\*\*/i.test(health), 'must not claim weekly exists')
}

console.log('▶ backup / restore / drill evidence + age assessment')
{
  const health = read('docs/operations/firestore-backup-recovery-health.md')
  assertIncludes(health, 'e58615a2-d8d7-428e-b5e5-55bf7b278f07', 'backup id')
  assertIncludes(health, '2026-08-12T00:43:48.982318Z', 'snapshot')
  assertIncludes(health, '2026-11-18T00:43:48.982318Z', 'expiry')
  assertIncludes(health, 'kc0272-restore-20260812', 'restore target')
  assertIncludes(health, 'SUCCESSFUL', 'restore result')
  assertIncludes(health, 'RECOVERY DRILL VERIFIED — NON-PRODUCTION PASS', 'drill cert')
  assertIncludes(health, 'operationally healthy', 'overall wording')
  assertIncludes(health, 'well under 36h', 'age vs KC-027.4')
  assertIncludes(health, 'Not claimed', 'no next-run invention')
}

console.log('▶ monitoring + baseline aligned; thresholds not rewritten')
{
  const mon = read('docs/operations/firestore-backup-recovery-monitoring.md')
  assertIncludes(mon, '013be81e-21d8-4d7b-a94f-8251414d4adc', 'monitoring schedule id')
  assertIncludes(mon, 'POINT_IN_TIME_RECOVERY_ENABLED', 'monitoring PITR')
  assertIncludes(mon, 'NOT OBSERVED', 'monitoring weekly gap')
  assertIncludes(mon, 'KC-027.4 thresholds unchanged', 'thresholds intact note')
  assertIncludes(mon, '> 36 h', '36h threshold preserved')
  assertIncludes(mon, '> 72 h', '72h threshold preserved')

  const baseline = read('docs/operations/firestore-backup-recovery-baseline.md')
  assertIncludes(baseline, '013be81e-21d8-4d7b-a94f-8251414d4adc', 'baseline schedule id')
  assertIncludes(baseline, 'POINT_IN_TIME_RECOVERY_ENABLED', 'baseline PITR')
  assertIncludes(baseline, 'NOT OBSERVED', 'baseline weekly gap')
}

console.log('▶ ARCH-009 reconciliation gate')
{
  const gate = read('docs/architecture/kc-027-5-arch009-gate.md')
  assertIncludes(gate, 'Phase 0', 'Phase 0')
  assertIncludes(gate, 'Reconciliation record', 'reconciliation section')
  assertIncludes(gate, 'Go / No-Go', 'Go/No-Go')
  assertIncludes(gate, 'GO', 'GO')
  assertIncludes(gate, '013be81e-21d8-4d7b-a94f-8251414d4adc', 'gate schedule id')
}

console.log('▶ ops README points at reconciled health')
{
  const readme = read('docs/operations/README.md')
  assertIncludes(readme, 'firestore-backup-recovery-health.md', 'health link')
  assertIncludes(readme, 'KC-027.5', '027.5 mention')
}

console.log('✅ KC-027.5 production DR evidence reconciliation verification passed')
