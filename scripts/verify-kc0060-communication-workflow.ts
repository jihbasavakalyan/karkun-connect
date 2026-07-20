/**
 * KC-0060 — Communication workflow completion checks.
 * Run: npx vite-node scripts/verify-kc0060-communication-workflow.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ARKAAN_GROUP_ID,
  ARKAAN_GROUP_NAME,
  getArkaanRecipientGroup,
  resolveArkaanRecipients,
} from '../src/lib/communication/arkaanRecipientGroup'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const panelSource = readFileSync(
  resolve('src/components/communication/DailyReportsPanel.tsx'),
  'utf8',
)
const broadcastSource = readFileSync(
  resolve('src/components/communication/BroadcastComposerPanel.tsx'),
  'utf8',
)
const initializeSource = readFileSync(
  resolve('src/repositories/firestore/initialize.ts'),
  'utf8',
)
const metricsSource = readFileSync(resolve('src/services/metricsService.ts'), 'utf8')
const adminHomeSource = readFileSync(resolve('src/pages/admin/AdminHomePage.tsx'), 'utf8')

assert(panelSource.includes('handleGenerate'), 'Generate handler required')
assert(panelSource.includes('generateDailyReportPreview(templateId)'), 'Generate must call service')
assert(panelSource.includes('setPreview(next)'), 'Generate must refresh preview state')
assert(panelSource.includes('disabled={!actionsEnabled}'), 'Copy/Export must gate on Generate')
assert(panelSource.includes('Send to Arkaan Group'), 'Send Daily Reports required')
assert(panelSource.includes('Coming in next release'), 'unimplemented features must say coming soon')
assert(
  !panelSource.includes('generationTick'),
  'Generate must not rely on a no-op tick bump',
)

assert(broadcastSource.includes('getArkaanRecipientGroup'), 'Broadcast must use Arkaan group')
assert(
  !broadcastSource.includes('No recipients selected yet'),
  'Broadcast must not require daily manual selection',
)

assert(ARKAAN_GROUP_ID === 'system-arkaan', 'stable Arkaan group id')
assert(ARKAAN_GROUP_NAME === 'Arkaan', 'Arkaan group name')

const group = getArkaanRecipientGroup()
assert(group.permanent === true, 'Arkaan group is permanent')
assert(group.source === 'rukn-master', 'Arkaan group source is Rukn Master')
const recipients = resolveArkaanRecipients()
assert(Array.isArray(recipients), 'Arkaan recipients resolve to an array')
assert(
  recipients.every((r) => r.personKind === 'rukn' && r.mobile.trim().length > 0),
  'Arkaan recipients must be Rukns with mobile',
)

assert(!initializeSource.includes('arkaan'), 'hydration/init untouched')
assert(!metricsSource.includes('arkaan'), 'MetricsService untouched')
assert(!adminHomeSource.includes('arkaan'), 'AdminHomePage untouched')

console.log('KC-0060 verify OK', {
  generateExplicit: true,
  arkaanRecipients: recipients.length,
  sendDailyReports: true,
})
