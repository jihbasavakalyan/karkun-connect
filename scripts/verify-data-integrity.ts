/**
 * Sprint 13 — data integrity audit for RC1 masters and post-migration registry.
 * Run: npx vite-node scripts/verify-data-integrity.ts
 */
import { DEMO_RUKN_ACCOUNTS } from '@/constants/demoRukn'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import { getAllKarkuns, getPeopleStatistics } from '@/lib/peopleStore'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getAllBaitulMaalSummaries } from '@/services/baitulMaalService'
import { getAllIjtemaAttendanceSummaries } from '@/services/ijtemaAttendanceService'
import { getAllJihWebPortalSummaries } from '@/services/jihWebPortalService'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { getAllAssignments } from '@/stores/assignmentStore'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const summary = runProductionDataMigration()

assert(ruknMaster.length === 49, 'Rukn master must contain 49 records')
assert(
  new Set(ruknMaster.map((rukn) => rukn.id)).size === ruknMaster.length,
  'Rukn IDs must be unique',
)
assert(
  new Set(ruknMaster.map((rukn) => rukn.name)).size === ruknMaster.length,
  'Rukn names must be unique',
)
assert(
  ruknMaster.every((rukn) => /^R\d{3}$/.test(rukn.id)),
  'Rukn IDs must follow R001 format',
)
assert(
  ruknMaster.every((rukn) => rukn.status === 'active'),
  'All Rukns must be active for RC1 pilot',
)

const ruknMobiles = ruknMaster
  .map((rukn) => normalizeMobile(rukn.mobile))
  .filter(Boolean)
assert(
  new Set(ruknMobiles).size === ruknMobiles.length,
  'Verified Rukn mobiles must be unique',
)

assert(summary.migrationVersion === 3, 'Production migration version must be 3')
assert(summary.dashboardVerified.totalRukns === 49, 'Dashboard Rukn count must be 49')

const stats = getPeopleStatistics()
assert(stats.totalRukns === 49, 'People statistics must report 49 Rukns')
assert(
  MOCK_KARKUN_REGISTRY.length === stats.totalMaleKarkuns + stats.totalFemaleKarkuns,
  'Registry length must match gender totals',
)
assert(
  MOCK_KARKUN_REGISTRY.every((karkun) => karkun.assignmentStatus === 'Available'),
  'Fresh boot must leave all Karkuns available',
)
assert(
  MOCK_KARKUN_REGISTRY.every((karkun) => karkun.assignedRuknId === ''),
  'Fresh boot must leave no assigned Rukn on Karkuns',
)
assert(
  MOCK_KARKUN_REGISTRY.every((karkun) => !karkun.isArchived),
  'Production migration must not archive Karkuns',
)
assert(
  MOCK_KARKUN_REGISTRY.every((karkun) => isValidMobileFormat(normalizeMobile(karkun.mobile))),
  'All imported Karkuns must have valid mobiles',
)

const karkunMobiles = MOCK_KARKUN_REGISTRY.map((karkun) => normalizeMobile(karkun.mobile))
assert(
  new Set(karkunMobiles).size === karkunMobiles.length,
  'Karkun mobiles must be unique in registry',
)

const crossDomainMobiles = [...ruknMobiles, ...karkunMobiles]
assert(
  new Set(crossDomainMobiles).size === crossDomainMobiles.length,
  'Rukn and Karkun mobiles must not overlap',
)

assert(getAllAssignments().length === 0, 'Assignment store must start empty')
assert(stats.assignedKarkuns === 0, 'No Karkuns may be assigned before workflows run')

const metrics = getAssignmentDashboardMetrics()
assert(metrics.activeAssignments === 0, 'Dashboard must show zero active assignments at boot')
assert(
  metrics.unassignedRukns === ruknMaster.filter((rukn) => rukn.status === 'active').length,
  'All active Rukns must be unassigned at boot',
)

const karkuns = getAllKarkuns()
assert(
  getAllIjtemaAttendanceSummaries().length === karkuns.length,
  'Ijtema records must exist for every Karkun',
)
assert(
  getAllJihWebPortalSummaries().length === karkuns.length,
  'JIH portal records must exist for every Karkun',
)
assert(
  getAllBaitulMaalSummaries().length === karkuns.length,
  'Bait-ul-Maal records must exist for every Karkun',
)

assert(DEMO_RUKN_ACCOUNTS.length >= 4, 'Pilot requires at least four demo Rukn accounts')
for (const account of DEMO_RUKN_ACCOUNTS) {
  const rukn = getRuknById(account.ruknId)
  assert(Boolean(rukn), `Demo account must map to a Rukn: ${account.email}`)
  assert(rukn!.name === account.ruknName, `Demo account name must match master: ${account.email}`)
  assert(rukn!.status === 'active', `Demo Rukn must be active: ${account.email}`)
}

console.log('Data integrity verification passed.')
