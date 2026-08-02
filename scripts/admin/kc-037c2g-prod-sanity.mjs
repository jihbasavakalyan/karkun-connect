#!/usr/bin/env node
/**
 * KC-037C2G — Production data sanity after R027 merge (READ-ONLY).
 * Confirms canonical R027 has 6 marks and computes expected KPI after
 * unique-Open adapter rules (no archiving).
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const MEETING_DATE = '2026-08-02'
const CANONICAL = 'wij_msb2iz7w_5gvbtq'
const REPORT_DIR = resolve('production-data/exports')

function isCampaignEligible(person) {
  if (!person) return false
  if (person.isArchived === true) return false
  const archiveKind = person.archiveKind
  if (archiveKind === 'duplicate_merge' || archiveKind === 'admin_delete') return false
  const cat = String(person.category || person.personCategory || 'Karkun')
  if (cat.toLowerCase().includes('muttafiq')) return false
  return true
}

function isReminded(mark) {
  if (!mark) return false
  if (mark.reminded === true) return true
  return mark.status === 'Present' || mark.status === 'Absent'
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const [complianceSnap, connectionsSnap, karkunsSnap, ruknsSnap] = await Promise.all([
    db.collection('compliance').get(),
    db.collection('connections').get(),
    db.collection('karkuns').get(),
    db.collection('rukns').get(),
  ])

  const karkunById = new Map(karkunsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))
  const ruknById = new Map(ruknsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))

  const connectedByRukn = new Map()
  for (const doc of connectionsSnap.docs) {
    const data = doc.data()
    if (data.status !== 'Active' || data.isArchived === true) continue
    if (!isCampaignEligible(karkunById.get(data.karkunId))) continue
    const rukn = ruknById.get(data.ruknId)
    if (!rukn || rukn.isArchived || (rukn.status && rukn.status !== 'active')) continue
    if (rukn.gender && rukn.gender !== 'Male') continue
    const set = connectedByRukn.get(data.ruknId) ?? new Set()
    set.add(data.karkunId)
    connectedByRukn.set(data.ruknId, set)
  }

  const events = []
  const submissions = []
  for (const doc of complianceSnap.docs) {
    const data = doc.data()
    if (data._docType === 'weeklyIjtemaEvent') {
      const r = data.record ?? data
      if (r.meetingDate === MEETING_DATE) {
        events.push({
          id: r.id ?? doc.id.replace(/^weeklyIjtemaEvent_/, ''),
          status: r.status,
          audienceGender: r.audienceGender ?? null,
          createdAt: r.createdAt,
          markCount: 0,
          submissionCount: 0,
        })
      }
    } else if (data._docType === 'weeklyIjtemaSubmission') {
      const r = data.record ?? data
      submissions.push(r)
    }
  }

  const eventIds = new Set(events.map((e) => e.id))
  const byEvent = new Map()
  for (const s of submissions) {
    if (!eventIds.has(s.eventId)) continue
    const list = byEvent.get(s.eventId) ?? []
    list.push(s)
    byEvent.set(s.eventId, list)
  }
  for (const e of events) {
    const list = byEvent.get(e.id) ?? []
    e.submissionCount = list.length
    e.markCount = list.reduce((n, s) => n + (s.marks?.length ?? 0), 0)
  }

  const canonicalSubs = byEvent.get(CANONICAL) ?? []
  const r027 = canonicalSubs.find((s) => s.ruknId === 'R027')

  // KPI as if unique Open = canonical only
  let present = 0
  let absent = 0
  let remindedOnly = 0
  const subByRukn = new Map(canonicalSubs.map((s) => [s.ruknId, s]))
  for (const [ruknId, kSet] of connectedByRukn) {
    const sub = subByRukn.get(ruknId)
    const markById = new Map((sub?.marks ?? []).map((m) => [m.karkunId, m]))
    for (const karkunId of kSet) {
      const mark = markById.get(karkunId)
      if (mark?.status === 'Present') present += 1
      else if (mark?.status === 'Absent') absent += 1
      else if (isReminded(mark)) remindedOnly += 1
    }
  }
  const connected = [...connectedByRukn.values()].reduce((n, s) => n + s.size, 0)
  const pending = Math.max(0, connected - remindedOnly - present - absent)

  // Naive sum of all Open (pre-adapter bug)
  let naivePresent = 0
  let naiveAbsent = 0
  let naiveReminded = 0
  for (const e of events.filter((x) => x.status === 'Open')) {
    const list = byEvent.get(e.id) ?? []
    for (const s of list) {
      for (const m of s.marks ?? []) {
        if (m.status === 'Present') naivePresent += 1
        else if (m.status === 'Absent') naiveAbsent += 1
        else if (isReminded(m)) naiveReminded += 1
      }
    }
  }

  const report = {
    ticket: 'KC-037C2G',
    generatedAt: new Date().toISOString(),
    projectId,
    meetingDate: MEETING_DATE,
    canonicalEventId: CANONICAL,
    events,
    r027OnCanonical: r027
      ? {
          id: r027.id,
          markCount: r027.marks?.length ?? 0,
          updatedAt: r027.updatedAt,
          submittedAt: r027.submittedAt,
          hasPresentJavid: (r027.marks ?? []).some((m) => m.karkunId === 'kr-045' && m.status === 'Present'),
          hasAbsentAfroz: (r027.marks ?? []).some((m) => m.karkunId === 'kr-145' && m.status === 'Absent'),
        }
      : null,
    beforeAdapterBug: {
      note: 'Summing all Open events / raw marks (legacy bug)',
      openEventCount: events.filter((e) => e.status === 'Open').length,
      connectedInflated: connected * events.filter((e) => e.status === 'Open').length,
      presentMarks: naivePresent,
      absentMarks: naiveAbsent,
      remindedOnlyMarks: naiveReminded,
    },
    afterCanonicalUnique: {
      note: 'Single canonical Open for Male 2026-08-02 after adapter dedupe + R027 merge',
      connected,
      reminded: remindedOnly,
      present,
      absent,
      pending,
      submissionCount: canonicalSubs.length,
      markCount: canonicalSubs.reduce((n, s) => n + (s.marks?.length ?? 0), 0),
    },
    archived: false,
    deleted: false,
  }

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  const latest = resolve(REPORT_DIR, 'kc-037c2g-prod-sanity-latest.json')
  writeFileSync(latest, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('Wrote', latest)

  if (!r027 || r027.marks?.length !== 6) {
    console.error('SANITY FAIL: R027 on canonical must have 6 marks')
    process.exit(1)
  }
  if (events.filter((e) => e.status === 'Open').length !== 4) {
    console.error('SANITY FAIL: expected 4 still-Open events (no archive this release)')
    process.exit(1)
  }
  console.log('SANITY PASS')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
