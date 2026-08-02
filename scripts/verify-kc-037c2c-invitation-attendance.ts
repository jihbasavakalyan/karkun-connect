/**
 * KC-037C2C — superseded by KC-037C2D for Matrix auto-invite coupling.
 * Retains a thin smoke that Reminder counts remain on the single helper path.
 * Full C2D assertions: npm run verify:kc-037c2d
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite-node', 'scripts/verify-kc-037c2d-commitment-reminder.ts'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)

process.exit(result.status === null ? 1 : result.status)
