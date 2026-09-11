/**
 * Authoritative Jamaat five-metric compute.
 * No stores, no Vite aliases — safe for Vercel/Admin SDK and the client.
 * Must stay aligned with Admin Home / computeJamaatCurrentSituationCounts().
 */

export type JamaatOfficerMetricRow = {
  id?: string
  name?: string
  officerKind?: string
}

export type JamaatPersonMetricRow = {
  id?: string
  category?: string
  isArchived?: boolean
  archiveKind?: string
  promotedToARuknId?: string
  aRuknPromotionInProgress?: boolean
}

export type JamaatConnectionMetricRow = {
  status?: string
  karkunId?: string
  createdAt?: string
  updatedAt?: string
}

export type JamaatSituationCounts = {
  rukns: number
  aRukns: number
  karkuns: number
  muttafiqeen: number
  connections: number
}

export type JamaatNameDirectoryEntry = {
  id: string
  name: string
}

function isSoftRemoved(person: JamaatPersonMetricRow): boolean {
  if (person.isArchived !== true) return false
  const kind = String(person.archiveKind || '')
  return kind === 'duplicate_merge' || kind === 'admin_delete'
}

function getPersonCategory(person: JamaatPersonMetricRow): string {
  if (person.category === 'Karkun' || person.category === 'Muttafiq') {
    return person.category
  }
  if (person.isArchived && !isSoftRemoved(person)) {
    return 'Muttafiq'
  }
  return 'Karkun'
}

function isUnavailableAsNormalKarkun(person: JamaatPersonMetricRow): boolean {
  return Boolean(person.promotedToARuknId?.trim()) || person.aRuknPromotionInProgress === true
}

/** Same filter as getAllKarkuns() (includeArchived = false). */
export function isCountedKarkun(person: JamaatPersonMetricRow): boolean {
  if (getPersonCategory(person) !== 'Karkun') return false
  if (isUnavailableAsNormalKarkun(person)) return false
  if (isSoftRemoved(person)) return false
  if (person.isArchived) return false
  return true
}

/** Same filter as getAllMuttafiqeen(). */
export function isCountedMuttafiq(person: JamaatPersonMetricRow): boolean {
  return getPersonCategory(person) === 'Muttafiq' && !isSoftRemoved(person)
}

/** Same as isCampaignEligible for canonical باہمی ربط. */
export function isCampaignEligiblePerson(person: JamaatPersonMetricRow): boolean {
  return (
    getPersonCategory(person) === 'Karkun' &&
    !isSoftRemoved(person) &&
    !person.isArchived &&
    !isUnavailableAsNormalKarkun(person)
  )
}

export function countOfficerPeopleByKind(
  officers: readonly JamaatOfficerMetricRow[],
): { rukns: number; aRukns: number } {
  let rukns = 0
  let aRukns = 0
  for (const officer of officers) {
    if (officer.officerKind === 'a_rukn') aRukns += 1
    else rukns += 1
  }
  return { rukns, aRukns }
}

function stamp(row: { createdAt?: string; updatedAt?: string }): number {
  const updated = Date.parse(row.updatedAt || '') || 0
  const created = Date.parse(row.createdAt || '') || 0
  return updated > 0 ? updated : created
}

function pickUniqueNewestActive<T extends { createdAt?: string; updatedAt?: string }>(
  rows: readonly T[],
): T | null {
  if (rows.length === 0) return null
  if (rows.length === 1) return rows[0] ?? null
  const ranked = [...rows].sort((a, b) => stamp(b) - stamp(a))
  const first = ranked[0]
  const second = ranked[1]
  if (!first || !second) return first ?? null
  if (stamp(first) === stamp(second)) return null
  return first
}

export function getCanonicalConnectedKarkunCountFromRecords(
  connections: readonly JamaatConnectionMetricRow[],
  people: readonly JamaatPersonMetricRow[],
): number {
  const peopleById = new Map<string, JamaatPersonMetricRow>()
  for (const person of people) {
    const id = String(person.id || '').trim()
    if (id) peopleById.set(id, person)
  }

  const byKarkun = new Map<string, JamaatConnectionMetricRow[]>()
  for (const record of connections) {
    if (record.status !== 'Active') continue
    const karkunId = String(record.karkunId || '').trim()
    if (!karkunId) continue
    const person = peopleById.get(karkunId)
    if (!person || !isCampaignEligiblePerson(person)) continue
    const list = byKarkun.get(karkunId) ?? []
    list.push(record)
    byKarkun.set(karkunId, list)
  }

  let count = 0
  for (const group of byKarkun.values()) {
    if (pickUniqueNewestActive(group)) count += 1
  }
  return count
}

export function computeJamaatSituationCountsFromRecords(input: {
  officers: readonly JamaatOfficerMetricRow[]
  people: readonly JamaatPersonMetricRow[]
  connections: readonly JamaatConnectionMetricRow[]
}): JamaatSituationCounts {
  const officersByKind = countOfficerPeopleByKind(input.officers)
  return {
    rukns: officersByKind.rukns,
    aRukns: officersByKind.aRukns,
    karkuns: input.people.filter(isCountedKarkun).length,
    muttafiqeen: input.people.filter(isCountedMuttafiq).length,
    connections: getCanonicalConnectedKarkunCountFromRecords(input.connections, input.people),
  }
}

export function computeRuknNameDirectoryEntriesFromOfficers(
  officers: readonly JamaatOfficerMetricRow[],
): JamaatNameDirectoryEntry[] {
  return officers
    .map((officer) => ({
      id: String(officer.id || '').trim(),
      name: String(officer.name || '').trim(),
    }))
    .filter((row) => Boolean(row.id) && Boolean(row.name))
    .sort((a, b) => a.id.localeCompare(b.id))
}
