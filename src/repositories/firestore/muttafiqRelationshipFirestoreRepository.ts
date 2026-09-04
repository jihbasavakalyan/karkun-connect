/**
 * Firestore Rukn ↔ Muttafiq relationships — one doc per pair (not connections).
 * Admin create/update only; soft-hydrate for Admin (all) and Rukn (own ruknId).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { MuttafiqRelationshipRepository } from '@/repositories/interfaces/MuttafiqRelationshipRepository'
import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  mapFirestoreError,
  sanitizeForFirestore,
  stripMeta,
  withMeta,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const WRITE_LABEL = 'muttafiqRelationships'

type ClientAuthScope = {
  role: string | null
  ruknId: string | null
}

const muttafiqRelationshipCache = new SyncCache<MuttafiqRuknRelationship[]>([])

export function getMuttafiqRelationshipWriteLabel(): string {
  return WRITE_LABEL
}

export function peekMuttafiqRelationshipCache(): MuttafiqRuknRelationship[] {
  return [...muttafiqRelationshipCache.get()]
}

export function applyMuttafiqRelationshipHydrate(rows: MuttafiqRuknRelationship[]): void {
  muttafiqRelationshipCache.set([...rows])
}

export function resetMuttafiqRelationshipCacheForTests(): void {
  muttafiqRelationshipCache.reset([])
}

export function subscribeMuttafiqRelationshipCache(listener: () => void): () => void {
  return muttafiqRelationshipCache.subscribe(listener)
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === 'permission-denied' || code.includes('permission-denied')
}

async function resolveClientAuthScope(): Promise<ClientAuthScope> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return { role: null, ruknId: null }
    const token = await user.getIdTokenResult()
    const role = typeof token.claims.role === 'string' ? token.claims.role : null
    const ruknId = typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null
    return { role, ruknId }
  } catch {
    return { role: null, ruknId: null }
  }
}

function parseRelationshipDoc(data: DocumentData): MuttafiqRuknRelationship | null {
  const stripped = stripMeta<Record<string, unknown>>(data)
  if (typeof stripped.id !== 'string' || !stripped.id) return null
  if (typeof stripped.ruknId !== 'string' || typeof stripped.personId !== 'string') return null
  if (stripped.status !== 'Active' && stripped.status !== 'Ended') return null
  return stripped as MuttafiqRuknRelationship
}

function upsertCache(row: MuttafiqRuknRelationship): void {
  const current = muttafiqRelationshipCache.get()
  const without = current.filter((item) => item.id !== row.id)
  muttafiqRelationshipCache.set([row, ...without])
}

export async function readMuttafiqRelationshipsForClient(): Promise<MuttafiqRuknRelationship[]> {
  const db = getFirestoreDb()
  const scope = await resolveClientAuthScope()

  if (scope.role === 'rukn' && !scope.ruknId) {
    return []
  }

  try {
    if (scope.role === 'rukn' && scope.ruknId) {
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.muttafiqRelationships),
          where('ruknId', '==', scope.ruknId),
        ),
      )
      return snap.docs
        .map((item) => parseRelationshipDoc(item.data()))
        .filter((row): row is MuttafiqRuknRelationship => row != null)
    }

    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.muttafiqRelationships))
    return snap.docs
      .map((item) => parseRelationshipDoc(item.data()))
      .filter((row): row is MuttafiqRuknRelationship => row != null)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn('[firestore:hydrate] soft-skip muttafiqRelationships (permission-denied)')
      return []
    }
    throw error
  }
}

export async function refreshMuttafiqRelationshipCacheFromServer(): Promise<void> {
  const rows = await readMuttafiqRelationshipsForClient()
  applyMuttafiqRelationshipHydrate(rows)
}

export class MuttafiqRelationshipFirestoreRepository implements MuttafiqRelationshipRepository {
  loadAll(): RepositoryResult<MuttafiqRuknRelationship[]> {
    return repositoryOk([...muttafiqRelationshipCache.get()])
  }

  saveAll(rows: MuttafiqRuknRelationship[]): RepositoryResult<void> {
    muttafiqRelationshipCache.set([...rows])
    return repositoryOk(undefined)
  }

  async upsertActiveDurable(
    relationship: MuttafiqRuknRelationship,
  ): Promise<RepositoryResult<MuttafiqRuknRelationship>> {
    try {
      const db = getFirestoreDb()
      const ref = doc(db, FIRESTORE_COLLECTIONS.muttafiqRelationships, relationship.id)
      const direct = await getDoc(ref)
      if (direct.exists()) {
        const parsed = parseRelationshipDoc(direct.data() as DocumentData)
        if (parsed?.status === 'Active') {
          upsertCache(parsed)
          return repositoryOk(parsed)
        }
      }

      const createdAt =
        direct.exists() && typeof direct.data()?.createdAt === 'string'
          ? String(direct.data()?.createdAt)
          : relationship.createdAt

      const payload: MuttafiqRuknRelationship = {
        ...relationship,
        status: 'Active',
        createdAt,
        updatedAt: relationship.updatedAt,
      }

      await setDoc(ref, {
        ...withMeta(sanitizeForFirestore(payload)),
      })
      upsertCache(payload)
      return repositoryOk(payload)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }
}
