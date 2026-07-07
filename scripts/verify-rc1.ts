/**
 * Sprint 13 — RC1 regression gate. Runs all verification scripts in sequence.
 * Run: npx vite-node scripts/verify-rc1.ts
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(scriptsDir, '..')

const VERIFICATION_SCRIPTS = [
  'verify-routes.ts',
  'verify-auth-session.ts',
  'verify-data-integrity.ts',
  'verify-inline-assignment.ts',
  'verify-compliance-module.ts',
] as const

for (const script of VERIFICATION_SCRIPTS) {
  const scriptPath = path.join(scriptsDir, script)
  console.log(`\n▶ ${script}`)
  execSync(`npx vite-node "${scriptPath}"`, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  })
}

console.log('\nRC1 verification suite passed.')
