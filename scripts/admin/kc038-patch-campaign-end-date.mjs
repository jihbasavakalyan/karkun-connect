#!/usr/bin/env node
/**
 * KC-038 — Patch active campaign endDate to 2026-08-09 (extension only).
 * Does not create a campaign, reset data, or mutate historical operational records.
 *
 * Usage:
 *   node --env-file=.env.local scripts/admin/kc038-patch-campaign-end-date.mjs
 *   node --env-file=.env.local scripts/admin/kc038-patch-campaign-end-date.mjs --dry-run
 */
import { initFirebaseAdmin } from './_firebase-init.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const TARGET_END = '2026-08-09'
const TARGET_START = '2026-07-18'
const CAMPAIGN_ID = 'campaign-active'

async function main() {
  const { db } = initFirebaseAdmin()
  const snap = await db.collection('campaigns').get()
  if (snap.empty) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          note: 'Firestore campaigns empty — app uses mockMissions seed (endDate 2026-08-09). No write needed.',
          targetEnd: TARGET_END,
        },
        null,
        2,
      ),
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
  const patch = {
    endDate: TARGET_END,
    // Preserve start; only extend end.
    ...(before?.startDate ? {} : { startDate: TARGET_START }),
    nextMilestone: 'Phase II — complete remaining connections, visits, and follow-up',
    objective:
      'Ensure every connected Karkun is contacted, visited, engaged, and integrated into Jamaat activities during the campaign (extended through 9 Aug 2026).',
    objectives: [
      'باقی کارکنوں کی تکمیل',
      'تمام ملاقاتوں کی تکمیل',
      'ہفتہ وار اجتماع میں مؤثر شرکت',
      'بیت المال کے عزم اور ادائیگی کی تکمیل',
      'JIH Reporting App رجسٹریشن',
      'متفقین کی فہرست کی تکمیل',
      'مسلسل فالو اپ',
    ],
  }
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
    console.log(`[dry-run] would merge ${active.id}:`, patch)
    return
  }
  await active.ref.set(patch, { merge: true })
  const after = (await active.ref.get()).data()
  console.log(
    JSON.stringify(
      {
        ok: true,
        id: active.id,
        startDate: after?.startDate,
        endDate: after?.endDate,
        status: after?.status,
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
