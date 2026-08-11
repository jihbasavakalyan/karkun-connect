/**
 * KC-027.2 — Non-production recovery readiness documentation gate.
 * Run: npm run verify:kc-027.2
 *
 * Docs/ops only — asserts runbook strategy/validation/acceptance/cleanup.
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

console.log('▶ KC-027.1 baseline still green')
{
  const result = spawnSync('npm', ['run', 'verify:kc-027.1'], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })
  if (result.status !== 0) {
    const tail = [result.stdout, result.stderr].filter(Boolean).join('\n').split('\n').slice(-30).join('\n')
    throw new Error(`verify:kc-027.1 failed\n${tail}`)
  }
}

console.log('▶ KC-027.2 artifacts present')
{
  assert.ok(existsSync(path.join(projectRoot, 'docs/architecture/kc-027-2-arch009-gate.md')))
  assert.ok(existsSync(path.join(projectRoot, 'docs/operations/firestore-nonprod-recovery-runbook.md')))
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  assert.equal(typeof pkg.scripts['verify:kc-027.2'], 'string', 'verify:kc-027.2 script missing')
}

console.log('▶ restore target strategy documented')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Non-production restore target strategy', 'strategy section')
  assertIncludes(runbook, 'Path A', 'Path A preference')
  assertIncludes(runbook, 'recovery-drill-', 'drill naming')
  assertIncludes(runbook, 'Decision matrix', 'decision matrix')
}

console.log('▶ pre-restore and post-restore verification')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Pre-restore verification', 'pre-restore section')
  assertIncludes(runbook, 'Post-restore validation', 'post-restore section')
  assertIncludes(runbook, 'Domain matrix', 'domain matrix')
}

console.log('▶ acceptance criteria AC-1…AC-7')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Recovery acceptance criteria', 'acceptance section')
  for (const id of ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7']) {
    assertIncludes(runbook, id, `acceptance ${id}`)
  }
}

console.log('▶ safe cleanup constraints')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Safe cleanup', 'cleanup section')
  assert.ok(/never[^\n]*\(default\)/i.test(runbook), 'cleanup never default')
  assert.ok(runbook.includes('recovery-drill-'), 'cleanup whitelist drill prefix')
}

console.log('▶ validated domains aligned with collections.ts (no invented names)')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
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
    assertIncludes(runbook, `\`${name}\``, `runbook collection ${name}`)
  }
  for (const docId of ['karkunCounter', 'connectionMeta', 'migrationVersion', 'backupIndex']) {
    assertIncludes(collections, `${docId}:`, `FIRESTORE_DOCS ${docId}`)
    assertIncludes(runbook, docId, `runbook settings doc ${docId}`)
  }
}

console.log('▶ unresolved prerequisites called out')
{
  const runbook = read('docs/operations/firestore-nonprod-recovery-runbook.md')
  assertIncludes(runbook, 'Unresolved prerequisites', 'prereq section')
  assertIncludes(runbook, 'locationId', 'location prerequisite')
}

console.log('▶ ARCH-009 gate present')
{
  const gate = read('docs/architecture/kc-027-2-arch009-gate.md')
  assertIncludes(gate, 'Phase 0', 'gate Phase 0')
  assertIncludes(gate, 'Go / No-Go', 'gate Go/No-Go')
  assertIncludes(gate, 'GO', 'gate GO')
  assertIncludes(gate, 'No production Firestore changes', 'gate prod constraint')
}

console.log('✅ KC-027.2 non-production recovery readiness verification passed')
