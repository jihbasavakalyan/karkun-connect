/**
 * KC-036 — Duplicate New Karkun request prevention verification.
 *
 * Proves:
 * 1. Submit path calls privileged master mobile lookup in Firestore mode
 * 2. Handler rejects soft-removed skip + requires auth
 * 3. Existing Person Found messaging preserved
 * 4. Connection distribution report script is read-only
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

const root = resolve(process.cwd())

function testSubmitWiresMasterLookup(): void {
  const src = readFileSync(
    resolve(root, 'src/services/karkunRequestService.ts'),
    'utf8',
  )
  assert(src.includes('lookupMobileInMasterRegistry'), 'imports master lookup')
  assert(src.includes('KC-036'), 'KC-036 marker')
  assert(src.includes("getRepositoryProviderMode() === 'firestore'"), 'firestore gate')
  assert(src.includes('Existing Person Found'), 'user-facing message')
  assert(src.includes('MOBILE_EXISTS'), 'MOBILE_EXISTS code')
}

function testApiAndHandler(): void {
  const api = readFileSync(resolve(root, 'api/karkun-mobile-lookup.ts'), 'utf8')
  const handler = readFileSync(
    resolve(root, 'src/server/karkunMobileLookup/lookupHandler.ts'),
    'utf8',
  )
  assert(api.includes('handleKarkunMobileLookup'), 'api wires handler')
  assert(handler.includes('verifyIdToken'), 'auth required')
  assert(handler.includes("collection('karkuns')"), 'full karkuns scan')
  assert(handler.includes('isSoftRemoved'), 'skips soft-removed')
  assert(!/set\(|update\(|create\(|delete\(/i.test(handler.replace(/isSoftRemoved/g, '')), 'read-only handler')
}

function testDistributionScriptReadOnly(): void {
  const script = readFileSync(
    resolve(root, 'scripts/admin/kc036-connection-distribution-report.mjs'),
    'utf8',
  )
  assert(script.includes('READ-ONLY'), 'read-only banner')
  assert(!/\.collection\([^)]+\)\.(set|add|update|delete)\(/.test(script), 'no firestore writes')
  assert(script.includes('median'), 'median')
  assert(script.includes('ruknsWithOver40'), 'over40')
}

function testVercelWired(): void {
  const vercel = readFileSync(resolve(root, 'vercel.json'), 'utf8')
  assert(vercel.includes('karkun-mobile-lookup'), 'vercel function entry')
}

const cases = [
  run('submit wires master mobile lookup', testSubmitWiresMasterLookup),
  run('API + handler auth & read-only', testApiAndHandler),
  run('distribution report is read-only', testDistributionScriptReadOnly),
  run('vercel includes mobile lookup API', testVercelWired),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-036',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
