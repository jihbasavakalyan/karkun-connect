#!/usr/bin/env node
/**
 * Approved production cleanup: End four Active muttafiqRelationships.
 * Mirrors MuttafiqRelationshipRepository.endDurable:
 * - status Active → Ended
 * - document retained (no delete)
 * - identifiers and audit fields preserved
 * - only status + updatedAt/_updatedAt/_revision written
 *
 * Usage:
 *   node scripts/admin/end-approved-muttafiq-relationship-cleanup.mjs
 *   node scripts/admin/end-approved-muttafiq-relationship-cleanup.mjs --apply
 */
import { initFirebaseAdmin } from './_firebase-init.mjs'

const APPLY = process.argv.includes('--apply')
const APPROVED_END_IDS = [
  'mr_R006_kr-669',
  'mr_R002_kr-699',
  'mr_R006_kr-698',
  'mr_R026_kr-700',
]

function nowIso() {
  return new Date().toISOString()
}

function isSoftRemoved(person) {
  if (!person?.isArchived) return false
  return person.archiveKind === 'duplicate_merge' || person.archiveKind === 'admin_delete'
}

function getPersonCategory(person) {
  if (person?.category === 'Karkun' || person?.category === 'Muttafiq') return person.category
  if (person?.isArchived && !isSoftRemoved(person)) return 'Muttafiq'
  return 'Karkun'
}

function isCurrentValid(rel, person) {
  if (rel.status !== 'Active') return false
  if (!person) return false
  return getPersonCategory(person) === 'Muttafiq' && !isSoftRemoved(person)
}

function fingerprint(docSnap) {
  if (!docSnap.exists) return { id: docSnap.id, exists: false }
  const data = docSnap.data()
  return {
    id: docSnap.id,
    exists: true,
    personId: data.personId ?? null,
    ruknId: data.ruknId ?? null,
    status: data.status ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    establishedBy: data.establishedBy ?? null,
    requestId: data.requestId ?? null,
    personName: data.personName ?? null,
    ruknName: data.ruknName ?? null,
    _revision: data._revision ?? null,
  }
}

function pairKey(row) {
  return `${row.ruknId}::${row.personId}`
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const col = db.collection('muttafiqRelationships')
  const uniquePlan = [...new Set(APPROVED_END_IDS)]
  if (uniquePlan.length !== 4 || uniquePlan.some((id) => !APPROVED_END_IDS.includes(id))) {
    throw new Error('Mutation plan is not exactly the four approved IDs')
  }
  if (uniquePlan.sort().join('|') !== [...APPROVED_END_IDS].sort().join('|')) {
    throw new Error('Mutation plan drifted from the approved ID list')
  }

  const [relSnap, karkunSnap] = await Promise.all([col.get(), db.collection('karkuns').get()])
  const people = new Map()
  for (const doc of karkunSnap.docs) {
    people.set(doc.id, { id: doc.id, ...doc.data() })
  }

  const allRels = relSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const currentValidBefore = allRels
    .filter((row) => isCurrentValid(row, people.get(row.personId)))
    .map((row) => ({ id: row.id, ruknId: row.ruknId, personId: row.personId }))
    .sort((a, b) => a.id.localeCompare(b.id))

  if (currentValidBefore.length !== 38) {
    throw new Error(
      `Abort: current-valid Active baseline is ${currentValidBefore.length}, expected 38`,
    )
  }

  const targetRefs = APPROVED_END_IDS.map((id) => col.doc(id))
  const targetSnaps = await Promise.all(targetRefs.map((ref) => ref.get()))
  const targetsBefore = targetSnaps.map(fingerprint)

  for (const snap of targetSnaps) {
    if (!snap.exists) throw new Error(`Abort: target missing ${snap.id}`)
    const row = snap.data()
    if (row.status !== 'Active') {
      throw new Error(`Abort: ${snap.id} status is ${row.status}, expected Active`)
    }
  }

  const overlap = currentValidBefore.filter((row) => APPROVED_END_IDS.includes(row.id))
  if (overlap.length !== 0) {
    throw new Error(`Abort: approved Ends intersect current-valid set: ${overlap.map((r) => r.id).join(',')}`)
  }

  const mutationPlan = APPROVED_END_IDS.slice()
  if (mutationPlan.length !== 4) throw new Error('Abort: mutation plan size')
  const extra = mutationPlan.filter((id) => !APPROVED_END_IDS.includes(id))
  if (extra.length) throw new Error(`Abort: extra IDs ${extra.join(',')}`)

  const persons = {}
  for (const snap of targetSnaps) {
    const row = snap.data()
    const person = people.get(row.personId) ?? null
    persons[snap.id] = person
      ? {
          id: person.id,
          name: person.name ?? null,
          category: person.category ?? null,
          resolvedCategory: getPersonCategory(person),
          isArchived: Boolean(person.isArchived),
          archiveKind: person.archiveKind ?? null,
        }
      : null
    if (!person) throw new Error(`Abort: person missing for ${snap.id}`)
  }

  const updatedAt = nowIso()
  const writes = []
  if (APPLY) {
    for (const snap of targetSnaps) {
      const row = snap.data()
      const nextRevision = typeof row._revision === 'number' ? row._revision + 1 : 1
      await snap.ref.update({
        status: 'Ended',
        updatedAt,
        _updatedAt: updatedAt,
        _revision: nextRevision,
      })
      writes.push({
        id: snap.id,
        action: 'endDurable',
        mutated: true,
        fields: { status: 'Ended', updatedAt, _updatedAt: updatedAt, _revision: nextRevision },
      })
    }
  } else {
    for (const snap of targetSnaps) {
      writes.push({ id: snap.id, action: 'endDurable', mutated: false, dryRun: true })
    }
  }

  const afterSnap = await col.get()
  const afterRels = afterSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const currentValidAfter = afterRels
    .filter((row) => isCurrentValid(row, people.get(row.personId)))
    .map((row) => ({ id: row.id, ruknId: row.ruknId, personId: row.personId }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const beforeKeys = currentValidBefore.map(pairKey).sort()
  const afterKeys = currentValidAfter.map(pairKey).sort()
  const lost = beforeKeys.filter((key) => !afterKeys.includes(key))
  const gained = afterKeys.filter((key) => !beforeKeys.includes(key))

  const afterTargets = await Promise.all(targetRefs.map((ref) => ref.get()))
  const unexpectedStatus = afterRels.filter((row) => {
    if (APPROVED_END_IDS.includes(row.id)) return false
    const before = allRels.find((item) => item.id === row.id)
    if (!before) return true
    return before.status !== row.status
  })

  if (APPLY) {
    if (currentValidAfter.length !== 38) {
      throw new Error(`Post-write current-valid count ${currentValidAfter.length}, expected 38`)
    }
    if (lost.length || gained.length) {
      throw new Error(`Unexplained current-valid drift lost=${lost.join(',')} gained=${gained.join(',')}`)
    }
    for (const snap of afterTargets) {
      if (!snap.exists) throw new Error(`Post-write missing ${snap.id}`)
      if (snap.data().status !== 'Ended') throw new Error(`Post-write ${snap.id} not Ended`)
    }
    if (unexpectedStatus.length) {
      throw new Error(
        `Unexpected status change on ${unexpectedStatus.map((row) => row.id).join(',')}`,
      )
    }
  }

  console.log(
    JSON.stringify(
      {
        mutated: APPLY,
        projectId,
        collection: 'muttafiqRelationships',
        mutationPlan,
        currentValidBeforeCount: currentValidBefore.length,
        currentValidAfterCount: currentValidAfter.length,
        currentValidBefore,
        targetsBefore,
        persons,
        writes,
        targetsAfter: afterTargets.map(fingerprint),
        lost,
        gained,
        unexpectedStatusIds: unexpectedStatus.map((row) => row.id),
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
