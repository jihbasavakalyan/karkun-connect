/**
 * P2 — Staging validation artifact verification (no live Firebase required).
 * Run: npm run verify:p2
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function requireFile(relativePath: string): void {
  assert.ok(existsSync(path.join(projectRoot, relativePath)), `Missing required file: ${relativePath}`)
}

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

console.log('▶ P2 operational documentation')
{
  const docs = [
    'docs/operations/p2-staging-validation.md',
    'docs/operations/vercel-configuration.md',
    'docs/operations/go-live-report.md',
  ]
  for (const doc of docs) {
    requireFile(doc)
  }
}

console.log('▶ P2 admin scripts')
{
  const scripts = [
    'scripts/admin/README.md',
    'scripts/admin/_firebase-init.mjs',
    'scripts/admin/set-custom-claims.mjs',
    'scripts/admin/import-dataset-backup.mjs',
    'scripts/admin/verify-firestore-production.mjs',
    'scripts/admin/export-seed-backup.ts',
  ]
  for (const script of scripts) {
    requireFile(script)
  }
}

console.log('▶ P2 configuration templates')
{
  requireFile('.env.staging.example')
  requireFile('.firebaserc.example')
  requireFile('vercel.json')
  requireFile('config/claims/administrators.example.csv')
  requireFile('config/claims/rukn.example.csv')
}

console.log('▶ custom claims use administrator role (not admin)')
{
  const claimsScript = readProjectFile('scripts/admin/set-custom-claims.mjs')
  assert.ok(claimsScript.includes('administrator'), 'Claims script must document administrator role')
  const rules = readProjectFile('firestore.rules')
  assert.ok(rules.includes("role == 'administrator'"), 'Rules must use administrator role')
}

console.log('P2 staging validation artifact verification passed.')
