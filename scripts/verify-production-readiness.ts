/**
 * P1 — Production operational readiness verification.
 * Run: npm run verify:production
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function readProjectFile(relativePath: string): string {
  const fullPath = path.join(projectRoot, relativePath)
  assert.ok(existsSync(fullPath), `Missing required file: ${relativePath}`)
  return readFileSync(fullPath, 'utf8')
}

console.log('▶ operational documentation')
{
  const requiredDocs = [
    'docs/operations/README.md',
    'docs/operations/deployment-guide.md',
    'docs/operations/production-checklist.md',
    'docs/operations/security-audit.md',
    'docs/operations/firebase-production-audit.md',
    'docs/operations/backup-guide.md',
    'docs/operations/monitoring.md',
    'docs/operations/smoke-test.md',
    'docs/operations/release-candidate.md',
  ]
  for (const doc of requiredDocs) {
    assert.ok(existsSync(path.join(projectRoot, doc)), `Missing ${doc}`)
  }
}

console.log('▶ environment template')
{
  const envExample = readProjectFile('.env.example')
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_REPOSITORY_PROVIDER',
  ]
  for (const variable of requiredVars) {
    assert.ok(envExample.includes(variable), `.env.example must document ${variable}`)
  }
}

console.log('▶ firestore security rules')
{
  const rules = readProjectFile('firestore.rules')
  assert.ok(rules.includes('allow read, write: if false'), 'Rules must default deny')
  assert.ok(!rules.includes('allow read, write: if true'), 'Rules must not allow public write')
  assert.ok(rules.includes('request.auth != null') || rules.includes('isSignedIn()'), 'Rules require auth')
}

console.log('▶ firestore indexes')
{
  const indexes = readProjectFile('firestore.indexes.json')
  const parsed = JSON.parse(indexes) as { indexes: unknown[] }
  assert.ok(Array.isArray(parsed.indexes) && parsed.indexes.length > 0, 'Indexes must be defined')
}

console.log('▶ no demo auth in production path')
{
  assert.ok(!existsSync(path.join(projectRoot, 'src/constants/mockAuth.ts')), 'mockAuth must be removed')
}

console.log('▶ repository provider configuration')
{
  const provider = readProjectFile('src/repositories/provider.ts')
  assert.ok(provider.includes('VITE_REPOSITORY_PROVIDER'), 'Provider must read env config')
  assert.ok(provider.includes('firestore'), 'Provider must support firestore mode')
}

console.log('▶ authentication service present')
{
  assert.ok(
    existsSync(path.join(projectRoot, 'src/services/authenticationService.ts')),
    'authenticationService required',
  )
}

console.log('▶ migration utility present')
{
  assert.ok(
    existsSync(path.join(projectRoot, 'src/lib/migration/firestoreMigrationService.ts')),
    'firestore migration service required',
  )
}

console.log('▶ P3 pilot documentation present')
{
  const p3Docs = [
    'docs/operations/pilot-runbook.md',
    'docs/operations/administrator-manual.md',
    'docs/operations/rukn-quick-guide.md',
    'docs/operations/troubleshooting-guide.md',
    'docs/operations/known-limitations.md',
    'docs/operations/release-notes.md',
    'docs/pilot/administrator-test-report.md',
    'docs/pilot/rukn-test-report.md',
    'docs/pilot/campaign-simulation-report.md',
    'docs/pilot/smoke-test-report.md',
    'docs/pilot/performance-report.md',
    'docs/pilot/security-report.md',
    'docs/pilot/go-live-approval.md',
    'docs/pilot/known-issues.md',
  ]
  for (const doc of p3Docs) {
    assert.ok(existsSync(path.join(projectRoot, doc)), `Missing ${doc}`)
  }
}

console.log('Production operational readiness verification passed.')
