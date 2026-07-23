/**
 * KC-0099 — Verify Official Communication library language + auto-population keys.
 * Run: npx vite-node scripts/verify-kc0099-official-communications.ts
 */

import {
  buildOfficialCommunicationVariables,
  listOfficialCommunications,
  verifyOfficialCommunicationLibraryLanguage,
} from '../src/lib/communication/officialCommunicationEngine'
import { OFFICIAL_COMMUNICATION_LIBRARY } from '../src/lib/communication/officialCommunicationLibrary'
import { applyTemplateVariables } from '../src/services/templateService'
import { getAllRukns } from '../src/lib/peopleStore'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function main() {
  console.log('KC-0099 Official Communications verification')
  console.log('==========================================')

  const language = verifyOfficialCommunicationLibraryLanguage()
  for (const row of language.results) {
    console.log(
      `${row.ok ? '✓' : '✗'} ${row.name} (${row.id})` +
        (row.forbiddenHits.length ? ` — forbidden: ${row.forbiddenHits.join(', ')}` : ''),
    )
  }
  assert(language.ok, 'Library failed language compliance')

  assert(
    OFFICIAL_COMMUNICATION_LIBRARY.length >= 12,
    `Expected at least 12 Official Communications, got ${OFFICIAL_COMMUNICATION_LIBRARY.length}`,
  )

  const rukn = getAllRukns()[0]
  if (rukn) {
    const vars = buildOfficialCommunicationVariables({
      personId: rukn.id,
      personKind: 'rukn',
      name: rukn.name,
      mobile: rukn.mobile,
      whatsapp: rukn.whatsapp,
    })
    const required = [
      'RuknName',
      'CampaignName',
      'AssignedKarkunCount',
      'ConnectedCount',
      'AssignedKarkunList',
      'KarkunWord',
      'PendingCount',
      'PendingObjectives',
      'CampaignProgress',
      'DaysSinceAssignment',
      'LastActivity',
    ]
    for (const key of required) {
      assert(key in vars, `Missing auto variable: ${key}`)
    }
    console.log('✓ Auto-population keys present for Rukn recipient')
    console.log(`  KarkunWord=${vars.KarkunWord} Assigned=${vars.AssignedKarkunCount}`)

    const sample = OFFICIAL_COMMUNICATION_LIBRARY[0]!
    const filled = applyTemplateVariables(sample.body, vars)
    assert(!filled.includes('{{'), 'Unresolved {{placeholders}} remain after merge')
    console.log('✓ Sample Official Communication merges without raw placeholders')
  } else {
    console.log('⚠ No Rukn in store — skipped live merge sample (library language still verified)')
  }

  const listed = listOfficialCommunications()
  assert(listed.length > 0, 'listOfficialCommunications returned empty')
  console.log(`✓ Library list size: ${listed.length}`)
  console.log('KC-0099 verification OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
