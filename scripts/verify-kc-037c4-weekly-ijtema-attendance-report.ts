/**
 * KC-037C4 / KC-038C — Weekly Ijtema report verification (delegates to KC-038C executive model).
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync('npx', ['vite-node', 'scripts/verify-kc-038c-weekly-ijtema-executive-report.ts'], {
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)
