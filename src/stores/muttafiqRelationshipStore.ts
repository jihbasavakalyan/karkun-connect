/**
 * In-memory Rukn ↔ Muttafiq relationship store (reload from repository cache).
 */

import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import type { MuttafiqConnectionView } from '@/lib/connections/muttafiqConnectionView'
import {
  presentActiveMuttafiqRowsForRukn,
  presentConnectedRuknRow,
  presentMuttafiqConnectionViewWithLiveNames,
  type MuttafiqRuknConnectionDisplayRow,
} from '@/lib/connections/muttafiqRelationshipDisplay'
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
    const personActives = relationships.filter(
      (candidate) => candidate.personId === row.personId && candidate.status === 'Active',
    )
    return personActives.length === 1 && personActives[0]!.id === row.id
  })
}

export function getMuttafiqConnectionViewForPerson(
  personId: string,
  options?: { hasPendingLink?: boolean },
): MuttafiqConnectionView {
  return presentMuttafiqConnectionViewWithLiveNames({
    activeLinks: getActiveMuttafiqRelationshipsForPerson(personId),
    hasPendingLink: options?.hasPendingLink,
  })
}

export function getConnectedMuttafiqDisplayRowsForRukn(
  ruknId: string,
): MuttafiqRuknConnectionDisplayRow[] {
  return presentActiveMuttafiqRowsForRukn(getActiveMuttafiqRelationshipsForRukn(ruknId))
}

export function getMuttafiqConnectedRuknDisplayForPerson(
  personId: string,
  options?: { hasPendingLink?: boolean },
): {
  view: MuttafiqConnectionView
  row: MuttafiqRuknConnectionDisplayRow | null
} {
  const view = getMuttafiqConnectionViewForPerson(personId, options)
  return {
    view,
    row: view.status === 'one' && view.current ? presentConnectedRuknRow(view.current) : null,
  }
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
  const byPerson = new Map<string, string[]>()
  for (const row of relationships) {
    if (row.status !== 'Active') continue
    const personId = row.personId.trim()
    if (!personId) continue
    const ruknIds = byPerson.get(personId) ?? []
    ruknIds.push(row.ruknId)
    byPerson.set(personId, ruknIds)
  }
  const duplicates = [...byPerson.entries()]
    .filter(([, ruknIds]) => ruknIds.length > 1)
    .map(([personId, ruknIds]) => ({
      personId,
      kind: 'muttafiq' as const,
      activeCount: ruknIds.length,
      ruknIds: [...new Set(ruknIds)],
    }))
  if (duplicates.length > 0) {
    console.warn('[muttafiqRelationships] duplicate active Rukn relationships (not deleted)', duplicates)
  }
  notify()
}

export function clearMuttafiqRelationshipStore(): void {
  relationships.length = 0
  notify()
}
