import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import type { MuttafiqRelationshipRepository } from '@/repositories/interfaces/MuttafiqRelationshipRepository'
import { tryRepository, type RepositoryResult } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadRows(): MuttafiqRuknRelationship[] {
  return loadJsonFromStorage<MuttafiqRuknRelationship[]>(STORAGE_KEYS.muttafiqRelationships, [])
}

function saveRows(rows: MuttafiqRuknRelationship[]): void {
  saveJsonToStorage(STORAGE_KEYS.muttafiqRelationships, rows)
}

export class MuttafiqRelationshipLocalRepository implements MuttafiqRelationshipRepository {
  loadAll(): RepositoryResult<MuttafiqRuknRelationship[]> {
    return tryRepository(() => [...loadRows()])
  }

  saveAll(rows: MuttafiqRuknRelationship[]): RepositoryResult<void> {
    return tryRepository(() => {
      saveRows([...rows])
      return undefined
    })
  }

  async upsertActiveDurable(
    relationship: MuttafiqRuknRelationship,
  ): Promise<RepositoryResult<MuttafiqRuknRelationship>> {
    return tryRepository(() => {
      const existing = loadRows()
      const index = existing.findIndex((row) => row.id === relationship.id)
      if (index >= 0) {
        const current = existing[index]!
        if (current.status === 'Active') {
          return current
        }
        const revived: MuttafiqRuknRelationship = {
          ...current,
          ...relationship,
          status: 'Active',
          createdAt: current.createdAt,
          updatedAt: relationship.updatedAt,
        }
        const next = [...existing]
        next[index] = revived
        saveRows(next)
        return revived
      }
      saveRows([relationship, ...existing])
      return relationship
    })
  }
}

export function clearLocalMuttafiqRelationshipsForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveRows([])
    return undefined
  })
}
