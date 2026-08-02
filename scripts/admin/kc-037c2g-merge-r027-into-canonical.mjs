#!/usr/bin/env node
/**
 * KC-037C2G Step 1 — Merge R027 conflicting submission into canonical Weekly Ijtema event.
 *
 * Reads winner submission from wij_msb2nhy2_4nef9x (newer updatedAt),
 * writes it onto canonical wij_msb2iz7w_5gvbtq for Rukn R027.
 *
 * Does NOT archive, delete, or modify other events/submissions.
 *
 * Usage:
 *   node scripts/admin/kc-037c2g-merge-r027-into-canonical.mjs --dry-run
 *   node scripts/admin/kc-037c2g-merge-r027-into-canonical.mjs --apply
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const APPLY = process.argv.includes('--apply')
const CANONICAL_EVENT_ID = 'wij_msb2iz7w_5gvbtq'
const SOURCE_EVENT_ID = 'wij_msb2nhy2_4nef9x'
const RUKN_ID = 'R027'
const MEETING_DATE = '2026-08-02'
const REPORT_DIR = resolve('production-data/exports')

function eventDocId(eventId) {
  return `weeklyIjtemaEvent_${eventId}`
}

function submissionDocId(eventId, ruknId) {
  return `weeklyIjtemaSubmission_${eventId}_${ruknId}`
}

async function main() {
  const { db, projectId, clientEmail } = initFirebaseAdmin()
  console.log(
    JSON.stringify(
      {
        ticket: 'KC-037C2G',
        step: 1,
        mode: APPLY ? 'APPLY' : 'DRY_RUN',
        projectId,
        clientEmail,
        canonicalEventId: CANONICAL_EVENT_ID,
        sourceEventId: SOURCE_EVENT_ID,
        ruknId: RUKN_ID,
      },
      null,
      2,
    ),
  )

  const sourceRef = db.collection('compliance').doc(submissionDocId(SOURCE_EVENT_ID, RUKN_ID))
  const destRef = db.collection('compliance').doc(submissionDocId(CANONICAL_EVENT_ID, RUKN_ID))
  const canonicalEventRef = db.collection('compliance').doc(eventDocId(CANONICAL_EVENT_ID))

  const [sourceSnap, destSnap, canonicalEventSnap] = await Promise.all([
    sourceRef.get(),
    destRef.get(),
    canonicalEventRef.get(),
  ])

  if (!sourceSnap.exists) {
    throw new Error(`Source submission missing: ${sourceRef.id}`)
  }
  if (!canonicalEventSnap.exists) {
    throw new Error(`Canonical event missing: ${canonicalEventRef.id}`)
  }

  const sourceDoc = sourceSnap.data()
  const source = sourceDoc.record ?? sourceDoc
  const destExisting = destSnap.exists ? (destSnap.data().record ?? destSnap.data()) : null
  const canonicalEvent = canonicalEventSnap.data().record ?? canonicalEventSnap.data()

  if (canonicalEvent.meetingDate !== MEETING_DATE) {
    throw new Error(
      `Canonical meetingDate mismatch: ${canonicalEvent.meetingDate} !== ${MEETING_DATE}`,
    )
  }
  if (source.eventId !== SOURCE_EVENT_ID || source.ruknId !== RUKN_ID) {
    throw new Error('Source submission identity mismatch')
  }
  if (destExisting && (destExisting.updatedAt ?? '') > (source.updatedAt ?? '')) {
    throw new Error(
      `Abort: destination submission is newer (${destExisting.updatedAt} > ${source.updatedAt})`,
    )
  }

  const mergedRecord = {
    id: `${CANONICAL_EVENT_ID}:${RUKN_ID}`,
    eventId: CANONICAL_EVENT_ID,
    ruknId: source.ruknId,
    ruknName: source.ruknName,
    marks: Array.isArray(source.marks) ? source.marks : [],
    // Preserve original submission timestamps from the winning source.
    submittedAt: source.submittedAt,
    submittedBy: source.submittedBy,
    updatedAt: source.updatedAt,
    updatedBy: source.updatedBy,
  }

  const report = {
    ticket: 'KC-037C2G',
    step: 1,
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    generatedAt: new Date().toISOString(),
    projectId,
    meetingDate: MEETING_DATE,
    canonicalEventId: CANONICAL_EVENT_ID,
    sourceEventId: SOURCE_EVENT_ID,
    ruknId: RUKN_ID,
    before: {
      destination: destExisting
        ? {
            id: destExisting.id,
            updatedAt: destExisting.updatedAt,
            submittedAt: destExisting.submittedAt,
            markCount: destExisting.marks?.length ?? 0,
            marks: destExisting.marks ?? [],
          }
        : null,
      source: {
        id: source.id,
        updatedAt: source.updatedAt,
        submittedAt: source.submittedAt,
        markCount: source.marks?.length ?? 0,
        marks: source.marks ?? [],
      },
    },
    after: {
      destination: {
        firestoreDocId: destRef.id,
        record: mergedRecord,
        markCount: mergedRecord.marks.length,
      },
    },
    safety: {
      archived: false,
      deleted: false,
      sourceSubmissionRetained: true,
      otherEventsUntouched: true,
    },
  }

  if (APPLY) {
    await destRef.set({
      _docType: 'weeklyIjtemaSubmission',
      record: mergedRecord,
    })
    report.applied = true
    report.writtenAt = new Date().toISOString()
    console.log('APPLIED: wrote', destRef.id)
  } else {
    report.applied = false
    console.log('DRY-RUN: would write', destRef.id)
  }

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(REPORT_DIR, `kc-037c2g-merge-r027-${stamp}.json`)
  const latestPath = resolve(REPORT_DIR, 'kc-037c2g-merge-r027-latest.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  writeFileSync(latestPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error('KC-037C2G R027 merge failed:', err)
  process.exit(1)
})
