#!/usr/bin/env node
/**
 * READ-ONLY inspect of muttafiqRelationships with more than one Active Rukn.
 * Does NOT mutate Firestore.
 *
 * Usage:
 *   node scripts/admin/inspect-muttafiq-duplicate-actives.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const snap = await db.collection('muttafiqRelationships').get()
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const active = rows.filter((row) => row.status === 'Active')
  const byPerson = new Map()
  for (const row of active) {
    const personId = String(row.personId || '').trim()
    if (!personId) continue
    const list = byPerson.get(personId) ?? []
    list.push(row)
    byPerson.set(personId, list)
  }
  const duplicates = []
  for (const [personId, group] of byPerson) {
    if (group.length < 2) continue
    duplicates.push({
      personId,
      activeCount: group.length,
      ruknIds: [...new Set(group.map((row) => row.ruknId))],
      relationshipIds: group.map((row) => row.id),
    })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    collection: 'muttafiqRelationships',
    totalDocuments: rows.length,
    activeCount: active.length,
    endedCount: rows.filter((row) => row.status === 'Ended').length,
    peopleWithActive: byPerson.size,
    duplicatePeople: duplicates.length,
    duplicates,
    mutated: false,
  }

  const outDir = resolve(process.cwd(), 'production-data/exports')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'muttafiq-duplicate-actives-latest.json')
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  console.log(`wrote ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
