import { ruknMaster, type Rukn } from '@/data/ruknMaster'
import { isActiveOfficerForRuknClaims } from '@/lib/officerIdentity'

/** Admin عازمِ رکن registry — officers marked `officerKind: 'a_rukn'` only. */
export function listARuknOfficers(officers: readonly Rukn[] = ruknMaster): Rukn[] {
  return officers.filter((officer) => officer.officerKind === 'a_rukn')
}

/** Active registry list — excludes soft-archived / inactive officers. */
export function listActiveARuknOfficers(officers: readonly Rukn[] = ruknMaster): Rukn[] {
  return listARuknOfficers(officers).filter((officer) => isActiveOfficerForRuknClaims(officer))
}

export function isNormalRuknOfficer(officer: Pick<Rukn, 'officerKind'>): boolean {
  return officer.officerKind !== 'a_rukn'
}
