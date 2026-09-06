/**
 * In-memory Rukn ↔ Muttafiq relationship store (reload from repository cache).
 */

import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import { pickUniqueNewestActive } from '@/lib/connections/oneActiveRukn'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const relationships: MuttafiqRuknRelationship[] = unwrapRepository(
  getRepositories().muttafiqRelationship.loadAll(),
  [],
)

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeToMuttafiqRelationshipStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAllMuttafiqRelationships(): MuttafiqRuknRelationship[] {
  return [...relationships]
}

export function getActiveMuttafiqRelationshipsForPerson(
  personId: string,
): MuttafiqRuknRelationship[] {
  const id = personId.trim()
  return relationships.filter((row) => row.personId === id && row.status === 'Active')
}

export function getActiveMuttafiqRelationshipsForRukn(
  ruknId: string,
): MuttafiqRuknRelationship[] {
  const id = ruknId.trim()
  return relationships.filter((row) => {
    if (row.ruknId !== id || row.status !== 'Active') return false
    const pick = pickUniqueNewestActive(
      relationships.filter((candidate) => candidate.personId === row.personId && candidate.status === 'Active'),
    )
    return pick.status === 'one' && pick.current.id === row.id
  })
}

/**
 * Increment A follow-up — one in-memory pass for registry rows (no N+1).
 * Only Active relationships are included; Pending inbox requests are never here.
 */
export function getActiveMuttafiqRelationshipsByPersonId(): Map<
  string,
  MuttafiqRuknRelationship[]
> {
  const byPerson = new Map<string, MuttafiqRuknRelationship[]>()
  for (const row of relationships) {
    if (row.status !== 'Active') continue
    const personId = row.personId.trim()
    if (!personId) continue
    const list = byPerson.get(personId)
    if (list) {
      list.push(row)
    } else {
      byPerson.set(personId, [row])
    }
  }
  return byPerson
}

export function getMuttafiqRelationshipById(
  id: string,
): MuttafiqRuknRelationship | undefined {
  return relationships.find((row) => row.id === id)
}

export function reloadMuttafiqRelationshipStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().muttafiqRelationship.loadAll(), [])
  relationships.length = 0
  relationships.push(...loaded)
  notify()
}

export function clearMuttafiqRelationshipStore(): void {
  relationships.length = 0
  notify()
}
