#!/usr/bin/env node
/**
 * KC-0056R — Scan durable sources for lost approval victims.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const EXPORT_DIR = resolve('production-data/exports')
const NAMES = ['Shamsheer', 'Mehboob', 'Mateen', 'Mohsin', 'Shahbaz']

function mentionsVictim(text) {
  const blob = String(text || '').toLowerCase()
  return NAMES.some((n) => blob.includes(n.toLowerCase()))
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const logsSnap = await db.collection('activityLogs').get()
  const hits = []
  for (const doc of logsSnap.docs) {
    const d = doc.data()
    if (!mentionsVictim(d.message) && !mentionsVictim(JSON.stringify(d))) continue
    hits.push({ id: doc.id, ...d })
  }
  hits.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')))

  const asgnIds = [
    'asgn-1784378068403-uvxzm',
    'asgn-1784378049205-8p9ab',
    'asgn-1784377992423-4egu4',
    'asgn-1784377940126-aanbn',
    'asgn-1784377915986-578tm',
    'asgn-1784377925669-pwheq',
    'asgn-1784377904757-h33nx',
    'asgn-1784377835993-lqhcs',
  ]
  const assignments = []
  for (const id of asgnIds) {
    const snap = await db.collection('connections').doc(id).get()
    assignments.push({ id, exists: snap.exists, data: snap.exists ? snap.data() : null })
  }

  const settingsSnap = await db.collection('settings').get()
  const settingHits = []
  for (const doc of settingsSnap.docs) {
    const data = doc.data()
    const blob = JSON.stringify(data)
    if (!mentionsVictim(blob)) continue
    settingHits.push({ id: doc.id, keys: Object.keys(data || {}), data })
  }

  // Backup / broadcast docs sometimes retain request arrays
  const collectionsToScan = ['communications']
  const extraHits = []
  for (const col of collectionsToScan) {
    try {
      const snap = await db.collection(col).limit(50).get()
      for (const doc of snap.docs) {
        const blob = JSON.stringify(doc.data())
        if (mentionsVictim(blob)) {
          extraHits.push({ collection: col, id: doc.id, data: doc.data() })
        }
      }
    } catch {
      // ignore
    }
  }

  // Rukn gender for R046 — useful metadata only (not a substitute for karkun gender)
  const rukn = await db.collection('rukns').doc('R046').get()

  const report = {
    projectId,
    generatedAt: new Date().toISOString(),
    activityHits: hits,
    assignments,
    settingHits: settingHits.map((s) => ({
      id: s.id,
      keys: s.keys,
      // keep full data for karkunRequests-like docs
      data: s.data,
    })),
    extraHits,
    requestingRukn: rukn.exists ? { id: 'R046', ...rukn.data() } : null,
  }

  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true })
  const outPath = resolve(EXPORT_DIR, 'kc0056r-source-scan.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({
    activityHits: hits.length,
    assignmentsFound: assignments.filter((a) => a.exists).length,
    settingHits: settingHits.length,
    extraHits: extraHits.length,
    ruknGender: report.requestingRukn?.gender ?? null,
    outPath,
  }, null, 2))
  for (const h of hits) {
    console.log(`[${h.timestamp}] ${h.type || ''} | ${h.message}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
