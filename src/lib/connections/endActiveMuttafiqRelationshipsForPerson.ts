/**
 * End Active Muttafiq relationships when the person is no longer a current Muttafiq.
 * Documents are retained (status Ended). Does not recreate or consult campaign connections.
 */

import { getRepositories } from '@/repositories/provider'
import {
  getActiveMuttafiqRelationshipsForPerson,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'

export async function endActiveMuttafiqRelationshipsForPerson(personId: string): Promise<
  { ok: true; endedIds: string[] } | { ok: false; error: string }
> {
  const id = personId.trim()
  if (!id) return { ok: true, endedIds: [] }

  const rows = getActiveMuttafiqRelationshipsForPerson(id)
  if (rows.length === 0) return { ok: true, endedIds: [] }

  const updatedAt = new Date().toISOString()
  const repo = getRepositories().muttafiqRelationship
  const endedIds: string[] = []

  for (const row of rows) {
    const result = await repo.endDurable({ ...row, updatedAt })
    if (!result.ok) {
      return { ok: false, error: result.error.message }
    }
    endedIds.push(row.id)
  }

  reloadMuttafiqRelationshipStoreFromPersistence()
  return { ok: true, endedIds }
}
