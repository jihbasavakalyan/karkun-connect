import { ruknMaster, type Rukn } from '@/data/ruknMaster'

/** Admin عازمِ رکن registry — officers marked `officerKind: 'a_rukn'` only. */
export function listARuknOfficers(officers: readonly Rukn[] = ruknMaster): Rukn[] {
  return officers.filter((officer) => officer.officerKind === 'a_rukn')
}

export function isNormalRuknOfficer(officer: Pick<Rukn, 'officerKind'>): boolean {
  return officer.officerKind !== 'a_rukn'
}
