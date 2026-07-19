#!/usr/bin/env node
/**
 * KC-0050 — One-time production repair for duplicate Karkun docs (same mobile).
 *
 * Default: DRY RUN (no writes). Review the report before applying.
 *
 *   node scripts/admin/repair-duplicate-karkun-orphans.mjs --dry-run
 *   node scripts/admin/repair-duplicate-karkun-orphans.mjs --apply
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS
 * with Firestore Admin read/write on the production project.
 *
 * Safety:
 * - Prefer any id referenced anywhere as canonical
 * - Else keep oldest createdAt, then lowest kr-* id
 * - If multiple ids in a group are referenced and refs cannot be migrated safely → SKIP
 * - Migrate known references to canonical before delete
 * - Never delete a connected/referenced id without migration
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const apply = process.argv.includes('--apply')
const dryRun = !apply
const REPORT_DIR = resolve('production-data/exports')
const REPORT_PATH = resolve(
  REPORT_DIR,
  `kc0050-duplicate-karkun-repair-${dryRun ? 'dry-run' : 'apply'}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`,
)

const KR_ID_RE = /^kr-\d+$/i

function normalizeMobileKey(mobile) {
  const digits = String(mobile ?? '').replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

function karkunSortKey(record) {
  const match = /^kr-(\d+)$/i.exec(record.id)
  if (match) return `0:${match[1].padStart(8, '0')}`
  return `1:${record.id}`
}

function walkForKarkunIds(value, path, out) {
  if (value == null) return
  if (typeof value === 'string') {
    if (KR_ID_RE.test(value)) {
      out.push({ path, id: value })
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForKarkunIds(item, `${path}[${index}]`, out))
    return
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (KR_ID_RE.test(key)) {
        out.push({ path: `${path}.${key}`, id: key, asMapKey: true })
      }
      walkForKarkunIds(child, path ? `${path}.${key}` : key, out)
    }
  }
}

function replaceIdDeep(value, fromId, toId) {
  if (value == null) return { value, changed: false }
  if (typeof value === 'string') {
    if (value === fromId) return { value: toId, changed: true }
    return { value, changed: false }
  }
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const result = replaceIdDeep(item, fromId, toId)
      if (result.changed) changed = true
      return result.value
    })
    return { value: next, changed }
  }
  if (typeof value === 'object') {
    let changed = false
    const next = {}
    for (const [key, child] of Object.entries(value)) {
      const nextKey = key === fromId ? toId : key
      if (nextKey !== key) changed = true
      const result = replaceIdDeep(child, fromId, toId)
      if (result.changed) changed = true
      // Prefer toId if both keys would collide
      if (Object.prototype.hasOwnProperty.call(next, nextKey) && nextKey === toId) {
        next[nextKey] = result.value
      } else {
        next[nextKey] = result.value
      }
    }
    return { value: next, changed }
  }
  return { value, changed: false }
}

async function loadCollectionDocs(db, name) {
  const snap = await db.collection(name).get()
  return snap.docs.map((doc) => ({
    collection: name,
    docId: doc.id,
    data: doc.data(),
    ref: doc.ref,
  }))
}

/**
 * Build id → [{ collection, docId, path, ... }] reference index across production collections.
 */
async function buildReferenceIndex(db) {
  const refsById = new Map()
  const add = (id, hit) => {
    if (!KR_ID_RE.test(id)) return
    const list = refsById.get(id) ?? []
    list.push(hit)
    refsById.set(id, list)
  }

  const collections = [
    'connections',
    'followUps',
    'activityLogs',
    'executions',
    'compliance',
    'communications',
    'settings',
  ]

  for (const name of collections) {
    const docs = await loadCollectionDocs(db, name)
    for (const doc of docs) {
      // Doc ids that embed karkun id (compliance baitulMaal_/ijtema_)
      const idEmbed = doc.docId.match(/(?:baitulMaal_|ijtema_)(kr-\d+)/i)
      if (idEmbed) {
        add(idEmbed[1], {
          collection: name,
          docId: doc.docId,
          path: '__docId__',
          kind: 'docId',
        })
      }

      const hits = []
      walkForKarkunIds(doc.data, '', hits)
      for (const hit of hits) {
        add(hit.id, {
          collection: name,
          docId: doc.docId,
          path: hit.path || '(root)',
          kind: hit.asMapKey ? 'mapKey' : 'field',
        })
      }
    }
  }

  return refsById
}

function pickCanonical(group, refsById) {
  const withRefs = group.filter((record) => (refsById.get(record.id) ?? []).length > 0)

  if (withRefs.length === 1) {
    return {
      keep: withRefs[0],
      reason: 'sole-referenced-id',
      referencedIds: withRefs.map((r) => r.id),
    }
  }

  if (withRefs.length > 1) {
    // Prefer Active connection refs among referenced ids
    const activePreferred = withRefs.find((record) =>
      (refsById.get(record.id) ?? []).some(
        (hit) =>
          hit.collection === 'connections' &&
          // status checked later via connection docs; treat any connection ref as campaign relationship
          true,
      ),
    )
    const pool = activePreferred ? [activePreferred, ...withRefs.filter((r) => r.id !== activePreferred.id)] : withRefs
    const ordered = [...pool].sort((a, b) => {
      const byCreated = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      if (byCreated !== 0) return byCreated
      return karkunSortKey(a).localeCompare(karkunSortKey(b))
    })
    return {
      keep: ordered[0],
      reason: 'oldest-among-referenced-ids',
      referencedIds: withRefs.map((r) => r.id),
      needsMigration: true,
    }
  }

  const ordered = [...group].sort((a, b) => {
    const byCreated = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    if (byCreated !== 0) return byCreated
    return karkunSortKey(a).localeCompare(karkunSortKey(b))
  })
  return {
    keep: ordered[0],
    reason: 'oldest-created-then-lowest-id',
    referencedIds: [],
    needsMigration: false,
  }
}

function planRepair(karkuns, refsById, connectionDocs) {
  const activeByKarkun = new Set(
    connectionDocs
      .filter((doc) => doc.data.status === 'Active' && KR_ID_RE.test(String(doc.data.karkunId || '')))
      .map((doc) => doc.data.karkunId),
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
  const skipped = []
  const keepIds = new Set()
  const deleteIds = new Set()
  const migrations = []

  for (const record of noMobile) {
    keepIds.add(record.id)
  }

  for (const [mobileKey, group] of byMobile) {
    if (group.length === 1) {
      keepIds.add(group[0].id)
      continue
    }

    const pick = pickCanonical(group, refsById)
    // Prefer Active-connected id if present and not conflicting with sole-referenced rule
    const activeInGroup = group.filter((r) => activeByKarkun.has(r.id))
    let keep = pick.keep
    let reason = pick.reason

    if (activeInGroup.length === 1) {
      keep = activeInGroup[0]
      reason =
        pick.referencedIds.length > 0 && !pick.referencedIds.includes(keep.id)
          ? 'active-connection-overrides-unreferenced'
          : 'active-connection-preferred'
    } else if (activeInGroup.length > 1) {
      // Multiple Active connections across duplicates — unsafe without careful migration
      const stillPick = pickCanonical(activeInGroup, refsById)
      keep = stillPick.keep
      reason = 'oldest-among-multiple-active-connected'
    }

    const losers = group.filter((r) => r.id !== keep.id)
    const loserRefs = []
    for (const loser of losers) {
      const refs = refsById.get(loser.id) ?? []
      if (refs.length > 0) {
        loserRefs.push({ id: loser.id, refs })
      }
    }

    // If keep is not Active-connected but a loser is Active-connected → force keep the Active one
    const activeLoser = losers.find((r) => activeByKarkun.has(r.id))
    if (activeLoser && !activeByKarkun.has(keep.id)) {
      keep = activeLoser
      reason = 'must-keep-active-connected'
      // recompute losers
    }
    const finalLosers = group.filter((r) => r.id !== keep.id)
    const finalLoserRefs = finalLosers
      .map((loser) => ({ id: loser.id, refs: refsById.get(loser.id) ?? [] }))
      .filter((entry) => entry.refs.length > 0)

    // Skip if any loser has Active connection and keep is different Active — should not happen after above
    const unsafeActive = finalLosers.some((r) => activeByKarkun.has(r.id))
    if (unsafeActive) {
      skipped.push({
        mobileKey,
        ids: group.map((r) => r.id),
        reason: 'skip-multiple-or-conflicting-active-connections',
        keepCandidate: keep.id,
      })
      for (const record of group) keepIds.add(record.id)
      continue
    }

    // Skip if loser refs include compliance docIds that collide with existing canonical docs
    // (handled at apply time too). For dry-run, mark migration required.
    keepIds.add(keep.id)
    const deleteList = []
    for (const loser of finalLosers) {
      deleteIds.add(loser.id)
      deleteList.push(loser.id)
      const refs = refsById.get(loser.id) ?? []
      if (refs.length > 0) {
        migrations.push({
          mobileKey,
          fromId: loser.id,
          toId: keep.id,
          referenceCount: refs.length,
          references: refs.slice(0, 50),
        })
      }
    }

    groups.push({
      mobileKey,
      keepId: keep.id,
      deleteIds: deleteList,
      reason,
      keepReferenced: (refsById.get(keep.id) ?? []).length > 0,
      keepActiveConnected: activeByKarkun.has(keep.id),
      loserReferenceCounts: Object.fromEntries(
        finalLosers.map((l) => [l.id, (refsById.get(l.id) ?? []).length]),
      ),
      members: group.map((r) => ({
        id: r.id,
        mobile: r.mobile,
        createdAt: r.createdAt ?? null,
        name: r.name ?? null,
        refCount: (refsById.get(r.id) ?? []).length,
        activeConnected: activeByKarkun.has(r.id),
      })),
    })
  }

  const afterCount = karkuns.length - deleteIds.size
  const maxNum = karkuns
    .filter((r) => keepIds.has(r.id) || !deleteIds.has(r.id))
    .reduce((max, record) => {
      const num = Number.parseInt(String(record.id).replace(/^kr-/i, ''), 10)
      return Number.isNaN(num) ? max : Math.max(max, num)
    }, 0)

  return {
    groups,
    skipped,
    migrations,
    keepIds: [...keepIds].sort(),
    deleteIds: [...deleteIds].sort(),
    beforeCount: karkuns.length,
    afterCount,
    nextKarkunNum: maxNum + 1,
    activeConnectedCount: activeByKarkun.size,
  }
}

async function migrateReferences(db, fromId, toId, refsById) {
  const refs = refsById.get(fromId) ?? []
  const touched = new Map() // collection/docId → true
  const actions = []

  for (const hit of refs) {
    const key = `${hit.collection}/${hit.docId}`
    if (touched.has(key)) continue
    touched.set(key, true)

    const ref = db.collection(hit.collection).doc(hit.docId)
    const snap = await ref.get()
    if (!snap.exists) {
      actions.push({ key, action: 'missing-skip' })
      continue
    }

    // Compliance docs with embedded id in document id: copy to new id then delete old
    if (hit.collection === 'compliance' && /^(baitulMaal_|ijtema_)/.test(hit.docId)) {
      const newDocId = hit.docId.replace(fromId, toId)
      if (newDocId === hit.docId) {
        actions.push({ key, action: 'compliance-id-unchanged-skip' })
        continue
      }
      const existingTarget = await db.collection('compliance').doc(newDocId).get()
      if (existingTarget.exists) {
        // Canonical already has this month/week — drop duplicate compliance doc with loser id
        await ref.delete()
        actions.push({ key, action: 'compliance-delete-duplicate-loser', newDocId })
        continue
      }
      const data = snap.data()
      const rewritten = replaceIdDeep(data, fromId, toId).value
      await db.collection('compliance').doc(newDocId).set(rewritten)
      await ref.delete()
      actions.push({ key, action: 'compliance-rewrite-doc', newDocId })
      continue
    }

    const data = snap.data()
    const { value: rewritten, changed } = replaceIdDeep(data, fromId, toId)
    if (!changed) {
      actions.push({ key, action: 'no-change' })
      continue
    }
    await ref.set(rewritten)
    actions.push({ key, action: 'field-rewrite' })
  }

  return actions
}

async function countModuleBaselines(db) {
  const [karkuns, connections, followUps, activityLogs, executions, compliance] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('connections').get(),
    db.collection('followUps').get(),
    db.collection('activityLogs').get(),
    db.collection('executions').get(),
    db.collection('compliance').get(),
  ])
  const active = connections.docs.filter((d) => d.data().status === 'Active')
  return {
    karkuns: karkuns.size,
    connections: connections.size,
    activeConnections: active.length,
    followUps: followUps.size,
    activityLogs: activityLogs.size,
    executions: executions.size,
    compliance: compliance.size,
  }
}

async function main() {
  const admin = initFirebaseAdmin()
  const { db, credentialPath, projectId, clientEmail } = admin
  console.log(`[KC-0050] duplicate karkun repair dryRun=${dryRun}`)
  console.log('[KC-0050] auth', {
    projectId,
    clientEmail,
    credentialFile: credentialPath ? credentialPath.split(/[/\\]/).pop() : null,
    prefersFirebaseServiceAccountPath: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    isAdminSdk: /firebase-adminsdk/i.test(String(clientEmail || '')),
    isTtsKey: /tts|digital-rafeeq/i.test(String(clientEmail || '')),
  })
  if (projectId !== 'karkun-connect-75c68') {
    throw new Error(`Refusing to run against unexpected projectId=${projectId}`)
  }
  if (/tts|digital-rafeeq/i.test(String(clientEmail || ''))) {
    throw new Error('Refusing TTS service account — set FIREBASE_SERVICE_ACCOUNT_PATH to Admin SDK key')
  }

  const before = await countModuleBaselines(db)
  console.log('[KC-0050] baseline counts', before)

  const [karkunSnap, connectionDocs] = await Promise.all([
    db.collection('karkuns').get(),
    loadCollectionDocs(db, 'connections'),
  ])
  const karkuns = karkunSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  console.log('[KC-0050] scanning references across collections…')
  const refsById = await buildReferenceIndex(db)

  const plan = planRepair(karkuns, refsById, connectionDocs)

  // Duplicate mobile summary after planned deletes
  const remaining = karkuns.filter((k) => !plan.deleteIds.includes(k.id))
  const mobileBuckets = new Map()
  for (const record of remaining) {
    const key = normalizeMobileKey(record.mobile)
    if (!key) continue
    mobileBuckets.set(key, (mobileBuckets.get(key) ?? 0) + 1)
  }
  const remainingDuplicateMobiles = [...mobileBuckets.entries()].filter(([, n]) => n > 1)

  const report = {
    label: 'KC-0050',
    dryRun,
    generatedAt: new Date().toISOString(),
    projectHint: process.env.FIREBASE_PROJECT_ID ?? null,
    baseline: before,
    plan: {
      beforeCount: plan.beforeCount,
      afterCount: plan.afterCount,
      duplicateGroups: plan.groups.length,
      deleteCount: plan.deleteIds.length,
      skippedGroups: plan.skipped.length,
      migrationsRequired: plan.migrations.length,
      nextKarkunNum: plan.nextKarkunNum,
      activeConnectedDistinctKarkuns: plan.activeConnectedCount,
      expectedDuplicateMobilesAfter: remainingDuplicateMobiles.length,
    },
    skipped: plan.skipped,
    groups: plan.groups,
    migrations: plan.migrations,
    deleteIds: plan.deleteIds,
    sampleDeleteIds: plan.deleteIds.slice(0, 40),
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log('[KC-0050] report written', REPORT_PATH)
  console.log(
    JSON.stringify(
      {
        beforeCount: plan.beforeCount,
        afterCount: plan.afterCount,
        duplicateGroups: plan.groups.length,
        deleteCount: plan.deleteIds.length,
        skippedGroups: plan.skipped.length,
        migrationsRequired: plan.migrations.length,
        expectedDuplicateMobilesAfter: remainingDuplicateMobiles.length,
        reportPath: REPORT_PATH,
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('[KC-0050] DRY RUN complete — no writes performed.')
    console.log('[KC-0050] Review the report, then re-run with --apply to execute.')
    return
  }

  if (plan.deleteIds.length === 0) {
    console.log('[KC-0050] nothing to delete')
    return
  }

  // Migrate references for each loser → keep
  const migrationResults = []
  for (const migration of plan.migrations) {
    const actions = await migrateReferences(db, migration.fromId, migration.toId, refsById)
    migrationResults.push({ ...migration, actions })
    console.log('[KC-0050] migrated refs', {
      from: migration.fromId,
      to: migration.toId,
      actions: actions.length,
    })
  }

  // Re-scan: refuse delete if any deleteId still referenced
  const refsAfter = await buildReferenceIndex(db)
  const stillReferenced = plan.deleteIds.filter((id) => (refsAfter.get(id) ?? []).length > 0)
  if (stillReferenced.length > 0) {
    console.error('[KC-0050] ABORT — delete candidates still referenced after migration', stillReferenced.slice(0, 30))
    process.exitCode = 2
    writeFileSync(
      resolve(REPORT_DIR, `kc0050-abort-still-referenced-${Date.now()}.json`),
      JSON.stringify({ stillReferenced, migrationResults }, null, 2),
    )
    return
  }

  // Never delete Active-connected ids
  const activeNow = new Set(
    (await db.collection('connections').get()).docs
      .filter((d) => d.data().status === 'Active')
      .map((d) => d.data().karkunId),
  )
  const activeBlocked = plan.deleteIds.filter((id) => activeNow.has(id))
  if (activeBlocked.length > 0) {
    console.error('[KC-0050] ABORT — refusing to delete Active-connected ids', activeBlocked)
    process.exitCode = 2
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
    console.log(`[KC-0050] deleted batch ${Math.floor(i / BATCH_LIMIT) + 1} (${slice.length} docs)`)
  }

  await db.collection('settings').doc('karkunCounter').set(
    { nextKarkunNum: plan.nextKarkunNum },
    { merge: true },
  )

  const after = await countModuleBaselines(db)
  const validation = {
    before,
    after,
    deleted: plan.deleteIds.length,
    karkunDelta: before.karkuns - after.karkuns,
    activeConnectionsUnchanged: before.activeConnections === after.activeConnections,
    followUpsUnchanged: before.followUps === after.followUps,
    activityLogsUnchanged: before.activityLogs === after.activityLogs,
  }

  writeFileSync(
    resolve(REPORT_DIR, `kc0050-apply-validation-${Date.now()}.json`),
    JSON.stringify({ validation, migrationResults, deleteIds: plan.deleteIds }, null, 2),
  )

  console.log('[KC-0050] repair applied', validation)
  if (!validation.activeConnectionsUnchanged) {
    console.error('[KC-0050] WARNING: active connection count changed')
    process.exitCode = 3
  }
}

main().catch((error) => {
  console.error('[KC-0050] repair failed', error)
  process.exitCode = 1
})
