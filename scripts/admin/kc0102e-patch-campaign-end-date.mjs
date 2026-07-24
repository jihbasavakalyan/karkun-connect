#!/usr/bin/env node
/**
 * KC-0102E — Patch active campaign endDate to 2026-08-02 (data correction only).
 * Does not change schema, repositories, or queries.
 *
 * Usage:
 *   node --env-file=.env.local scripts/admin/kc0102e-patch-campaign-end-date.mjs
 *   node --env-file=.env.local scripts/admin/kc0102e-patch-campaign-end-date.mjs --dry-run
 */
import { initFirebaseAdmin } from './_firebase-init.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const TARGET_END = '2026-08-02'
const CAMPAIGN_ID = 'campaign-active'

async function main() {
  const { db } = initFirebaseAdmin()
  const snap = await db.collection('campaigns').get()
  if (snap.empty) {
    console.log(
      'Firestore campaigns collection is empty — app uses mockMissions seed (endDate already 2026-08-02). No write needed.',
    )
    return
  }
  const active =
    snap.docs.find((doc) => doc.id === CAMPAIGN_ID) ??
    snap.docs.find((doc) => doc.data()?.status === 'active') ??
    snap.docs[0]
  if (!active) {
    throw new Error('No campaign document found to patch')
  }
  const before = active.data()
  console.log('Before:', {
    id: active.id,
    startDate: before?.startDate,
    endDate: before?.endDate,
  })
  if (before?.endDate === TARGET_END) {
    console.log('Already at target endDate; no write needed.')
    return
  }
  if (DRY_RUN) {
    console.log(`[dry-run] would set ${active.id}.endDate → ${TARGET_END}`)
    return
  }
  await active.ref.set({ endDate: TARGET_END }, { merge: true })
  const after = (await active.ref.get()).data()
  console.log('After:', {
    id: active.id,
    startDate: after?.startDate,
    endDate: after?.endDate,
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
