/**
 * RC1 — Release Candidate certification documentation verification.
 * Run: npm run verify:rc1-cert
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

console.log('▶ RC1 release package documents')
{
  const required = [
    'docs/release/README.md',
    'docs/release/RC1-CERTIFICATE.md',
    'docs/release/VERSION-1.0.md',
    'docs/release/CHANGELOG-1.0.md',
    'docs/release/KNOWN-LIMITATIONS.md',
    'docs/release/DEPLOYMENT-SIGNOFF.md',
    'docs/release/SUPPORT-HANDBOOK.md',
  ]
  for (const doc of required) {
    assertFile(doc)
  }
}

console.log('▶ certificate acceptance criteria')
{
  const cert = readProjectFile('docs/release/RC1-CERTIFICATE.md')
  for (const phrase of [
    '1.0.0-rc.1',
    'v1.0.0-rc1',
    'Zero Critical',
    'Zero High',
    'Rollback',
    'Freeze',
    'Basavakalyan',
  ]) {
    assert.ok(cert.includes(phrase), `RC1-CERTIFICATE.md must include: ${phrase}`)
  }
}

console.log('▶ documentation consistency — architecture / operations / pilot')
{
  const requiredDocs = [
    'docs/architecture/authentication.md',
    'docs/architecture/rukn-authentication.md',
    'docs/architecture/firestore.md',
    'docs/architecture/repository-layer.md',
    'docs/operations/pilot-runbook.md',
    'docs/operations/recovery-guide.md',
    'docs/operations/deployment-guide.md',
    'docs/operations/release-notes.md',
    'docs/operations/known-limitations.md',
    'docs/pilot/go-live-approval.md',
    'docs/pilot/known-issues.md',
  ]
  for (const doc of requiredDocs) {
    assertFile(doc)
  }
}

console.log('▶ package version matches RC1')
{
  const pkg = JSON.parse(readProjectFile('package.json')) as { version: string }
  assert.equal(pkg.version, '1.0.0-rc.1', 'package.json version must be 1.0.0-rc.1')
}

console.log('▶ freeze policy documented')
{
  const version = readProjectFile('docs/release/VERSION-1.0.md')
  assert.ok(version.includes('Frozen') || version.includes('frozen') || version.includes('Freeze'), 'VERSION-1.0 must document freeze')
  assert.ok(version.includes('1.1'), 'VERSION-1.0 must reference 1.1 backlog')
}

console.log('RC1 release certification documentation verification passed.')
