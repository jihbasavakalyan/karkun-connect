import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import type { MuttafiqRelationshipRepository } from '@/repositories/interfaces/MuttafiqRelationshipRepository'
import { tryRepository, repositoryErr, type RepositoryResult } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'
import {
  findOtherActiveMuttafiqRelationship,
  MUTTAFIQ_ALREADY_HAS_ACTIVE_RUKN_MESSAGE,
} from '@/lib/connections/muttafiqConnectionView'

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
    const existing = loadRows()
    const otherActive = findOtherActiveMuttafiqRelationship(
      existing,
      relationship.personId,
      relationship.id,
    )
    if (otherActive) {
      return repositoryErr('Duplicate', MUTTAFIQ_ALREADY_HAS_ACTIVE_RUKN_MESSAGE)
    }
    return tryRepository(() => {
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

  async endDurable(
    relationship: MuttafiqRuknRelationship,
  ): Promise<RepositoryResult<MuttafiqRuknRelationship>> {
    return tryRepository(() => {
      const existing = loadRows()
      const index = existing.findIndex((row) => row.id === relationship.id)
      if (index < 0) {
        throw new Error('Muttafiq–Rukn relationship not found.')
      }
      const current = existing[index]!
      const ended: MuttafiqRuknRelationship = {
        ...current,
        status: 'Ended',
        updatedAt: relationship.updatedAt,
      }
      const next = [...existing]
      next[index] = ended
      saveRows(next)
      return ended
    })
  }
}

export function clearLocalMuttafiqRelationshipsForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveRows([])
    return undefined
  })
}
