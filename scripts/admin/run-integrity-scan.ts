/**
 * KC-0058 — Run IntegrityScanner against current in-memory/local state.
 * For production Firestore health, prefer Admin SDK scripts after hydrate.
 *
 * Run: npm run admin:integrity-scan
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { IntegrityScanner } from '../../src/services/integrityScanner'

const report = IntegrityScanner.run()
const dir = resolve('production-data/exports')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const out = resolve(dir, `kc0058-integrity-scan-${Date.now()}.json`)
writeFileSync(out, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
console.log(`Wrote ${out}`)
process.exitCode = report.summary.healthy ? 0 : 2
