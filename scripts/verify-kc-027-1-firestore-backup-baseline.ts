/**
 * KC-027.1 — Firestore Backup & Recovery Baseline documentation gate.
 * Run: npm run verify:kc-027.1
 *
 * Docs/ops only — asserts artifacts and hard prohibitions. Does not call GCP.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath: string): string {
  const fullPath = path.join(projectRoot, relativePath)
  assert.ok(existsSync(fullPath), `Missing required file: ${relativePath}`)
  return readFileSync(fullPath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

console.log('▶ KC-027.1 artifacts present')
{
  const required = [
    'docs/architecture/kc-027-1-arch009-gate.md',
    'docs/operations/firestore-backup-recovery-baseline.md',
    'docs/operations/firestore-nonprod-recovery-runbook.md',
    'docs/operations/backup-guide.md',
    'docs/operations/recovery-guide.md',
  ]
  for (const file of required) {
    assert.ok(existsSync(path.join(projectRoot, file)), `Missing ${file}`)
  }
}

console.log('▶ package script registered')
{
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.equal(
    typeof pkg.scripts['verify:kc-027.1'],
    'string',
    'verify:kc-027.1 script missing',
  )
}

console.log('▶ production inventory documented')
{
  const baseline = read('docs/operations/firestore-backup-recovery-baseline.md')
  assertIncludes(baseline, 'karkun-connect-75c68', 'baseline project id')
  assertIncludes(baseline, '(default)', 'baseline database id')
  assertIncludes(baseline, 'Critical collections', 'baseline critical collections section')
  assertIncludes(baseline, 'Retention expectations', 'baseline retention section')
  assertIncludes(baseline, 'Required IAM permissions', 'baseline IAM section')
  assertIncludes(baseline, 'Production recovery precautions', 'baseline precautions section')
  assertIncludes(baseline, 'scheduled backups', 'baseline managed backups')
  assertIncludes(baseline, 'PITR', 'baseline PITR')
  assertIncludes(baseline, 'Never', 'baseline never-prod language')
}

console.log('▶ critical collections aligned with code')
{
  const baseline = read('docs/operations/firestore-backup-recovery-baseline.md')
  const collections = read('src/repositories/firestore/collections.ts')
  const names = [
    'campaigns',
    'rukns',
    'karkuns',
    'connections',
    'executions',
    'communications',
    'compliance',
    'settings',
    'activityLogs',
    'followUps',
    'connectionLedger',
  ]
  for (const name of names) {
    assertIncludes(collections, `${name}:`, `collections.ts ${name}`)
    assertIncludes(baseline, name, `baseline collection ${name}`)
  }
}

console.log('▶ non-prod runbook prohibitions')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Hard prohibitions', 'runbook prohibitions')
  assert.ok(/\bnever\b/i.test(runbook), 'runbook never language')
  assertIncludes(runbook, '(default)', 'runbook default db')
  assertIncludes(runbook, 'karkun-connect-75c68', 'runbook prod project')
  assertIncludes(runbook, 'Preview', 'runbook preview isolation')
  assertIncludes(runbook, 'recovery-drill', 'runbook drill database naming')
  assert.ok(
    /non-production|NON-PRODUCTION|non-prod/i.test(runbook),
    'runbook must emphasize non-production',
  )
}

console.log('▶ ARCH-009 gate present')
{
  const gate = read('docs/architecture/kc-027-1-arch009-gate.md')
  assertIncludes(gate, 'Phase 0', 'gate Phase 0')
  assertIncludes(gate, 'Go / No-Go', 'gate Go/No-Go')
  assertIncludes(gate, 'GO', 'gate GO decision')
  assertIncludes(gate, 'Do **not** modify Connect', 'gate Connect constraint')
}

console.log('▶ ops index + known limitation updated')
{
  const opsReadme = read('docs/operations/README.md')
  assertIncludes(
    opsReadme,
    'firestore-backup-recovery-baseline.md',
    'ops README baseline link',
  )
  assertIncludes(
    opsReadme,
    'firestore-nonprod-recovery-runbook.md',
    'ops README runbook link',
  )
  const limitations = read('docs/operations/known-limitations.md')
  assertIncludes(limitations, 'KC-027.1', 'KL-D04 KC-027.1 pointer')
}

console.log('▶ no application runtime surface changed by this ticket scope')
{
  // Guardrail: verify script itself must not imply src/ edits for KC-027.1.
  // Presence of collections.ts is used for alignment only.
  assert.ok(existsSync(path.join(projectRoot, 'src/repositories/firestore/collections.ts')))
}

console.log('✅ KC-027.1 Firestore backup/recovery baseline verification passed')
