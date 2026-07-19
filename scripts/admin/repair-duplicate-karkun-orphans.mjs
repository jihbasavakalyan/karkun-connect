#!/usr/bin/env node
/**
 * KC-004D — One-time repair for duplicate/orphan Karkun docs from the KC-004C race.
 *
 * Deterministic keep rule per normalized mobile:
 * 1. Prefer id referenced by an Active assignment
 * 2. Else oldest createdAt
 * 3. Else lowest kr-* numeric id
 *
 *   node scripts/admin/repair-duplicate-karkun-orphans.mjs --dry-run
 *   node scripts/admin/repair-duplicate-karkun-orphans.mjs --apply
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.
 */

import { initFirebaseAdmin } from './_firebase-init.mjs'

const apply = process.argv.includes('--apply')
const dryRun = !apply

function normalizeMobileKey(mobile) {
  return String(mobile ?? '').replace(/\D/g, '')
}

function karkunSortKey(record) {
  const match = /^kr-(\d+)$/i.exec(record.id)
  if (match) {
    return `0:${match[1].padStart(8, '0')}`
  }
  return `1:${record.id}`
}

function pickKeeper(group, referencedIds) {
  const referenced = group.filter((record) => referencedIds.has(record.id))
  if (referenced.length === 1) {
    return { keep: referenced[0], reason: 'referenced-by-active-assignment' }
  }
  if (referenced.length > 1) {
    const ordered = [...referenced].sort((a, b) => {
      const byCreated = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      if (byCreated !== 0) return byCreated
      return karkunSortKey(a).localeCompare(karkunSortKey(b))
    })
    return { keep: ordered[0], reason: 'oldest-among-active-referenced' }
  }
  const ordered = [...group].sort((a, b) => {
    const byCreated = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    if (byCreated !== 0) return byCreated
    return karkunSortKey(a).localeCompare(karkunSortKey(b))
  })
  return { keep: ordered[0], reason: 'oldest-created-then-lowest-id' }
}

function planRepair(karkuns, assignments) {
  const referencedIds = new Set(
    assignments.filter((a) => a.status === 'Active').map((a) => a.karkunId),
  )
  const byMobile = new Map()
  const noMobile = []

  for (const record of karkuns) {
    const key = normalizeMobileKey(record.mobile)
    if (!key) {
      noMobile.push(record)
      continue
    }
    const list = byMobile.get(key) ?? []
    list.push(record)
    byMobile.set(key, list)
  }

  const groups = []
  const keepIds = new Set()
  const deleteIds = new Set()

  for (const [mobileKey, group] of byMobile) {
    if (group.length === 1) {
      keepIds.add(group[0].id)
      continue
    }
    const { keep, reason } = pickKeeper(group, referencedIds)
    keepIds.add(keep.id)
    const losers = group.filter((r) => r.id !== keep.id).map((r) => r.id)
    for (const id of losers) deleteIds.add(id)
    groups.push({ mobileKey, keepId: keep.id, deleteIds: losers, reason })
  }

  for (const record of noMobile) {
    keepIds.add(record.id)
  }

  const afterRecords = karkuns.filter((r) => keepIds.has(r.id))
  const maxNum = afterRecords.reduce((max, record) => {
    const num = Number.parseInt(String(record.id).replace(/^kr-/i, ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)

  return {
    groups,
    keepIds: [...keepIds].sort(),
    deleteIds: [...deleteIds].sort(),
    beforeCount: karkuns.length,
    afterCount: afterRecords.length,
    nextKarkunNum: maxNum + 1,
  }
}

async function main() {
  const { db } = initFirebaseAdmin()
  console.log(`[KC-004D] repair-duplicate-karkun-orphans dryRun=${dryRun}`)

  const [karkunSnap, connectionSnap, counterSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('connections').get(),
    db.collection('settings').doc('karkunCounter').get(),
  ])

  const karkuns = karkunSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const assignments = connectionSnap.docs.map((doc) => ({
    assignmentId: doc.id,
    ...doc.data(),
  }))
  const plan = planRepair(karkuns, assignments)

  console.log(
    JSON.stringify(
      {
        beforeCount: plan.beforeCount,
        afterCount: plan.afterCount,
        duplicateGroups: plan.groups.length,
        deleteCount: plan.deleteIds.length,
        nextKarkunNum: plan.nextKarkunNum,
        previousNextKarkunNum: counterSnap.data()?.nextKarkunNum ?? null,
        sampleGroups: plan.groups.slice(0, 15),
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('[KC-004D] dry-run complete — no writes. Re-run with --apply to delete orphans.')
    return
  }

  if (plan.deleteIds.length === 0) {
    console.log('[KC-004D] nothing to delete')
    return
  }

  const BATCH_LIMIT = 400
  for (let i = 0; i < plan.deleteIds.length; i += BATCH_LIMIT) {
    const slice = plan.deleteIds.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()
    for (const id of slice) {
      batch.delete(db.collection('karkuns').doc(id))
    }
    await batch.commit()
    console.log(`[KC-004D] deleted batch ${Math.floor(i / BATCH_LIMIT) + 1} (${slice.length} docs)`)
  }

  await db.collection('settings').doc('karkunCounter').set(
    { nextKarkunNum: plan.nextKarkunNum },
    { merge: true },
  )
  await db.collection('settings').doc('migrationVersion').set({ version: 3 }, { merge: true })

  console.log('[KC-004D] repair applied', {
    deleted: plan.deleteIds.length,
    remaining: plan.afterCount,
    nextKarkunNum: plan.nextKarkunNum,
  })
}

main().catch((error) => {
  console.error('[KC-004D] repair failed', error)
  process.exitCode = 1
})
