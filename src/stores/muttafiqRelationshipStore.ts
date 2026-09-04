/**
 * In-memory Rukn ↔ Muttafiq relationship store (reload from repository cache).
 */

import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
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
  return relationships.filter((row) => row.ruknId === id && row.status === 'Active')
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
