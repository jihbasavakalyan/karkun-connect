/**
 * P3 — Pilot Operations & Launch Readiness verification.
 * Run: npm run verify:p3
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function assertFile(relativePath: string): void {
  assert.ok(existsSync(path.join(projectRoot, relativePath)), `Missing required file: ${relativePath}`)
}

function readProjectFile(relativePath: string): string {
  assertFile(relativePath)
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

console.log('▶ P3 operations documentation')
{
  const requiredOps = [
    'docs/operations/pilot-runbook.md',
    'docs/operations/administrator-manual.md',
    'docs/operations/rukn-quick-guide.md',
    'docs/operations/troubleshooting-guide.md',
    'docs/operations/known-limitations.md',
    'docs/operations/recovery-guide.md',
    'docs/operations/release-notes.md',
  ]
  for (const doc of requiredOps) {
    assertFile(doc)
  }
}

console.log('▶ P3 pilot acceptance reports')
{
  const requiredPilot = [
    'docs/pilot/README.md',
    'docs/pilot/administrator-test-report.md',
    'docs/pilot/rukn-test-report.md',
    'docs/pilot/campaign-simulation-report.md',
    'docs/pilot/smoke-test-report.md',
    'docs/pilot/performance-report.md',
    'docs/pilot/security-report.md',
    'docs/pilot/go-live-approval.md',
    'docs/pilot/known-issues.md',
    'docs/pilot/basavakalyan-pilot-checklist.md',
  ]
  for (const doc of requiredPilot) {
    assertFile(doc)
  }
}

console.log('▶ go-live acceptance criteria documented')
{
  const approval = readProjectFile('docs/pilot/go-live-approval.md')
  for (const phrase of [
    'No Critical defects',
    'No High severity defects',
    'Authentication stable',
    'Firestore stable',
    'Campaign simulation',
    'Multi-device sync',
    'Documentation complete',
    'Leadership sign-off',
  ]) {
    assert.ok(approval.includes(phrase), `go-live-approval.md must include: ${phrase}`)
  }
}

console.log('▶ M7.1 authentication constitution referenced')
{
  const ruknGuide = readProjectFile('docs/operations/rukn-quick-guide.md')
  assert.ok(ruknGuide.includes('registered mobile'), 'Rukn quick guide must describe mobile login')
  assert.ok(ruknGuide.includes('not registered'), 'Rukn quick guide must describe unregistered rejection')

  const authDoc = readProjectFile('docs/architecture/rukn-authentication.md')
  assert.ok(authDoc.includes('AUTH-01'), 'Rukn authentication architecture must document AUTH rules')
}

console.log('▶ operations README links P3 artifacts')
{
  const opsReadme = readProjectFile('docs/operations/README.md')
  assert.ok(opsReadme.includes('pilot-runbook.md'), 'operations README must link Pilot Runbook')
  assert.ok(opsReadme.includes('verify:p3'), 'operations README must document verify:p3')
}

console.log('P3 pilot operations readiness verification passed.')
