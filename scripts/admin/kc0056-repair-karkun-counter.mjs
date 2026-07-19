#!/usr/bin/env node
/**
 * KC-0056 — Repair settings/karkunCounter.nextKarkunNum from max existing kr-* id.
 *
 * Usage:
 *   node scripts/admin/kc0056-repair-karkun-counter.mjs --dry-run
 *   node scripts/admin/kc0056-repair-karkun-counter.mjs --yes
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const AUTO_YES = process.argv.includes('--yes')
const EXPORT_DIR = resolve('production-data/exports')

function parseKarkunNum(id) {
  const match = /^kr-(\d+)$/i.exec(String(id || '').trim())
  if (!match) return null
  const num = Number.parseInt(match[1], 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

async function main() {
  if (!DRY_RUN && !AUTO_YES) {
    throw new Error('Pass --dry-run or --yes')
  }

  const { db, projectId } = initFirebaseAdmin()
  const counterRef = db.collection('settings').doc('karkunCounter')
  const counterSnap = await counterRef.get()
  const before = counterSnap.exists ? Number(counterSnap.data()?.nextKarkunNum ?? 0) : null

  const snap = await db.collection('karkuns').select().get()
  let maxNum = 0
  let count = 0
  for (const doc of snap.docs) {
    count += 1
    const num = parseKarkunNum(doc.id)
    if (num != null && num > maxNum) maxNum = num
  }

  const after = maxNum + 1
  const report = {
    projectId,
    dryRun: DRY_RUN,
    karkunDocCount: count,
    maxKarkunId: maxNum > 0 ? `kr-${String(maxNum).padStart(3, '0')}` : null,
    beforeNextKarkunNum: before,
    afterNextKarkunNum: after,
    changed: before !== after,
    at: new Date().toISOString(),
  }

  if (!DRY_RUN && report.changed) {
    await counterRef.set({ nextKarkunNum: after }, { merge: true })
    report.applied = true
  } else {
    report.applied = false
  }

  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true })
  const outPath = resolve(
    EXPORT_DIR,
    `kc0056-counter-repair-${DRY_RUN ? 'dry-run' : 'apply'}-${Date.now()}.json`,
  )
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
