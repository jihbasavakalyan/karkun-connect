/**
 * Same five numbers Admin Home displays for جماعت کی موجودہ صورتحال.
 * Delegates to jamaatSituationMetrics (shared with the trusted server publisher).
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import {
  type JamaatCurrentSituation,
  type JamaatCurrentSituationCounts,
} from '@/lib/jamaat/jamaatCurrentSituation'
import { computeJamaatSituationCountsFromRecords } from '@/lib/jamaat/jamaatSituationMetrics'
import { getAllRukns } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'

export function computeJamaatCurrentSituationCounts(): JamaatCurrentSituationCounts {
  return computeJamaatSituationCountsFromRecords({
    officers: getAllRukns(),
    people: MOCK_KARKUN_REGISTRY,
    connections: getAllAssignments(),
  })
}

export function computeJamaatCurrentSituation(generatedAt = new Date().toISOString()): JamaatCurrentSituation {
  return {
    ...computeJamaatCurrentSituationCounts(),
    generatedAt,
  }
}
