/**
 * Diagnostic: Available Karkuns pipeline counts for a selected Rukn.
 * Run: npx vite-node scripts/diagnose-available-karkuns.ts
 *
 * Stages mirror the Connect panel eligibility chain before search.
 */
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { getAllKarkuns, getCompatibleKarkunsForRukn } from '@/lib/peopleStore'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { getKarkunsForRuknAssignment } from '@/services/assignmentService'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'

runProductionDataMigration()

const rukn =
  ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male') ??
  ruknMaster.find((r) => r.status === 'active')

if (!rukn) {
  throw new Error('No active Rukn found')
}

const all = getAllKarkuns(true)
const nonArchived = getAllKarkuns(false)
const active = nonArchived.filter((k) => k.status === 'active')
const matchingGender = active.filter((k) => k.gender === rukn.gender)
const availableStatus = matchingGender.filter((k) => k.assignmentStatus === 'Available')
const statusDist = Object.fromEntries(
  [...new Set(matchingGender.map((k) => String(k.assignmentStatus)))].map((status) => [
    status,
    matchingGender.filter((k) => String(k.assignmentStatus) === status).length,
  ]),
)
const validMobile = availableStatus.filter((k) => isValidMobileFormat(normalizeMobile(k.mobile)))
const compatible = getCompatibleKarkunsForRukn(rukn.id)
const finalBeforeSearch = getKarkunsForRuknAssignment(rukn.id)
const afterEmpty = finalBeforeSearch.filter((k) => matchesKarkunRegistrySearch(k, ''))
const afterBroad = finalBeforeSearch.filter((k) => matchesKarkunRegistrySearch(k, 'a'))

console.log(
  JSON.stringify(
    {
      rukn: {
        id: rukn.id,
        name: rukn.name,
        gender: rukn.gender,
        resolved: Boolean(getRuknById(rukn.id)),
      },
      stages: {
        '1_totalRegistry': all.length,
        '2_activeNonArchived': active.length,
        '3_matchingGender': matchingGender.length,
        '4_notAlreadyConnected': availableStatus.length,
        '4_statusDistribution': statusDist,
        '5_campaignEligible_validMobile': validMobile.length,
        '6_finalBeforeSearch': finalBeforeSearch.length,
        '6_compatibleHelper': compatible.length,
        '7_searchEmpty': afterEmpty.length,
        '7_searchBroad_a': afterBroad.length,
      },
    },
    null,
    2,
  ),
)
