#!/usr/bin/env node
/**
 * KC-037C2G — Dry-run audit: deduplicate Weekly Ijtema events (READ-ONLY).
 *
 * Scans production for WeeklyIjtemaEvent docs with meetingDate=2026-08-02,
 * proposes a canonical event per audienceGender, and reports the merge plan.
 *
 * NEVER writes to Firestore. No archive / delete / update.
 *
 * Usage:
 *   node scripts/admin/kc-037c2g-dedupe-weekly-ijtema-audit.mjs
 *   node scripts/admin/kc-037c2g-dedupe-weekly-ijtema-audit.mjs --meeting-date=2026-08-02
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const MEETING_DATE =
  process.argv.find((a) => a.startsWith('--meeting-date='))?.split('=')[1] ??
  '2026-08-02'

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

function markCount(submissions) {
  return submissions.reduce((sum, s) => sum + (s.marks?.length ?? 0), 0)
}

function countMarks(submissions) {
  let present = 0
  let absent = 0
  let remindedOnly = 0
  let markTotal = 0
  for (const sub of submissions) {
    for (const mark of sub.marks ?? []) {
      markTotal += 1
      if (mark.status === 'Present') present += 1
      else if (mark.status === 'Absent') absent += 1
      else if (mark.reminded === true) remindedOnly += 1
    }
  }
  return { present, absent, remindedOnly, remindedTotal: remindedOnly + present + absent, markTotal }
}

function isMarkReminded(mark) {
  if (!mark) return false
  if (mark.reminded === true) return true
  return mark.status === 'Present' || mark.status === 'Absent'
}

function preferEvent(current, candidate) {
  // Prefer Open (and treat archived as non-Open)
  const curOpen = current.status === 'Open'
  const candOpen = candidate.status === 'Open'
  if (curOpen && !candOpen) return { winner: current, reason: 'Open preferred over non-Open' }
  if (candOpen && !curOpen) return { winner: candidate, reason: 'Open preferred over non-Open' }

  const curMarks = current._markCount
  const candMarks = candidate._markCount
  if (candMarks !== curMarks) {
    return {
      winner: candMarks > curMarks ? candidate : current,
      reason: `more submission marks (${Math.max(candMarks, curMarks)} > ${Math.min(candMarks, curMarks)})`,
    }
  }

  if (candidate.updatedAt >= current.updatedAt) {
    return {
      winner: candidate,
      reason: `newer updatedAt (${candidate.updatedAt} >= ${current.updatedAt})`,
    }
  }
  return {
    winner: current,
    reason: `newer updatedAt (${current.updatedAt} > ${candidate.updatedAt})`,
  }
}

function pickCanonical(events) {
  if (events.length === 0) return { canonical: null, reasons: [] }
  let best = events[0]
  const reasons = [`seed=${best.id} (Open=${best.status === 'Open'}, marks=${best._markCount}, updatedAt=${best.updatedAt})`]
  for (let i = 1; i < events.length; i += 1) {
    const { winner, reason } = preferEvent(best, events[i])
    reasons.push(
      `compare ${best.id} vs ${events[i].id}: ${reason} → ${winner.id}`,
    )
    best = winner
  }
  return { canonical: best, reasons }
}

function submissionTimestamp(sub) {
  return sub.updatedAt || sub.submittedAt || ''
}

/**
 * Merge submissions across events. Same Rukn → keep newest by updatedAt/submittedAt.
 */
function planMerge(events, submissionsByEventId) {
  /** @type {Map<string, { chosen: any, sources: any[] }>} */
  const byRukn = new Map()

  for (const event of events) {
    const subs = submissionsByEventId.get(event.id) ?? []
    for (const sub of subs) {
      const entry = byRukn.get(sub.ruknId) ?? { chosen: null, sources: [] }
      entry.sources.push({
        eventId: event.id,
        submissionId: sub.id,
        ruknId: sub.ruknId,
        ruknName: sub.ruknName,
        updatedAt: sub.updatedAt,
        submittedAt: sub.submittedAt,
        markCount: sub.marks?.length ?? 0,
        marks: sub.marks ?? [],
      })
      if (
        !entry.chosen ||
        submissionTimestamp(sub) > submissionTimestamp(entry.chosen)
      ) {
        entry.chosen = { ...sub, _sourceEventId: event.id }
      } else if (
        submissionTimestamp(sub) === submissionTimestamp(entry.chosen) &&
        sub.eventId === entry.chosen.eventId
      ) {
        // identical — keep
      }
      byRukn.set(sub.ruknId, entry)
    }
  }

  const conflicts = []
  const mergedSubmissions = []
  const transfers = [] // submissions that move from duplicate → canonical

  for (const [ruknId, entry] of byRukn) {
    const sources = entry.sources.sort((a, b) =>
      submissionTimestamp(b).localeCompare(submissionTimestamp(a)),
    )
    if (sources.length > 1) {
      conflicts.push({
        ruknId,
        ruknName: entry.chosen.ruknName,
        winner: {
          eventId: entry.chosen._sourceEventId,
          submissionId: entry.chosen.id,
          updatedAt: entry.chosen.updatedAt,
          submittedAt: entry.chosen.submittedAt,
          markCount: entry.chosen.marks?.length ?? 0,
        },
        losers: sources
          .filter((s) => s.submissionId !== entry.chosen.id)
          .map((s) => ({
            eventId: s.eventId,
            submissionId: s.submissionId,
            updatedAt: s.updatedAt,
            submittedAt: s.submittedAt,
            markCount: s.markCount,
          })),
        rule: 'latest updatedAt (fallback submittedAt)',
      })
    }
    mergedSubmissions.push(entry.chosen)
  }

  return { byRukn, conflicts, mergedSubmissions, transfers }
}

function computeAttendanceTotals(mergedSubmissions, connectedByRukn) {
  // Count only marks for Connected karkuns of submitting Rukns (matches app KPI path)
  let present = 0
  let absent = 0
  let remindedOnly = 0

  const ruknIdsWithConnected = [...connectedByRukn.keys()]
  const submissionByRukn = new Map(mergedSubmissions.map((s) => [s.ruknId, s]))

  for (const ruknId of ruknIdsWithConnected) {
    const assigned = connectedByRukn.get(ruknId) ?? []
    const sub = submissionByRukn.get(ruknId)
    const markById = new Map((sub?.marks ?? []).map((m) => [m.karkunId, m]))

    for (const karkunId of assigned) {
      const mark = markById.get(karkunId)
      if (mark?.status === 'Present') {
        present += 1
        continue
      }
      if (mark?.status === 'Absent') {
        absent += 1
        continue
      }
      if (isMarkReminded(mark)) {
        remindedOnly += 1
      }
    }
  }

  const connected = [...connectedByRukn.values()].reduce((n, ids) => n + ids.length, 0)
  const pending = Math.max(0, connected - remindedOnly - present - absent)
  return {
    connected,
    reminded: remindedOnly,
    remindedTotal: remindedOnly + present + absent,
    present,
    absent,
    pending,
    ruknsWithAssignments: connectedByRukn.size,
    ruknsSubmitted: [...submissionByRukn.keys()].filter((id) =>
      connectedByRukn.has(id),
    ).length,
  }
}

function eventAudienceKey(meetingDate, audienceGender) {
  return `${meetingDate}::${audienceGender ?? 'legacy'}`
}

async function main() {
  const { db, projectId, clientEmail } = initFirebaseAdmin()
  console.log(
    JSON.stringify(
      {
        ticket: 'KC-037C2G',
        mode: 'DRY_RUN_AUDIT_ONLY',
        meetingDate: MEETING_DATE,
        projectId,
        clientEmail,
        writes: false,
      },
      null,
      2,
    ),
  )

  // Load supporting collections for Connected counts
  const [complianceSnap, connectionsSnap, karkunsSnap, ruknsSnap] = await Promise.all([
    db.collection('compliance').get(),
    db.collection('connections').get(),
    db.collection('karkuns').get(),
    db.collection('rukns').get(),
  ])

  const karkunById = new Map()
  for (const doc of karkunsSnap.docs) {
    karkunById.set(doc.id, { id: doc.id, ...doc.data() })
  }

  const ruknById = new Map()
  for (const doc of ruknsSnap.docs) {
    ruknById.set(doc.id, { id: doc.id, ...doc.data() })
  }

  /** Active unique connected karkun IDs per rukn */
  const connectedByRuknAll = new Map()
  for (const doc of connectionsSnap.docs) {
    const data = doc.data()
    if (data.status !== 'Active') continue
    if (data.isArchived === true) continue
    const karkun = karkunById.get(data.karkunId)
    if (!isCampaignEligible(karkun)) continue
    const ruknId = data.ruknId
    if (!ruknId) continue
    const set = connectedByRuknAll.get(ruknId) ?? new Set()
    set.add(data.karkunId)
    connectedByRuknAll.set(ruknId, set)
  }

  // Parse WI events + submissions from compliance
  const events = []
  const allSubmissions = []

  for (const doc of complianceSnap.docs) {
    const data = doc.data()
    const docType = data._docType
    if (docType === 'weeklyIjtemaEvent') {
      const record = data.record ?? data
      if (record.meetingDate === MEETING_DATE) {
        events.push({
          id: record.id ?? doc.id.replace(/^weeklyIjtemaEvent_/, ''),
          firestoreDocId: doc.id,
          title: record.title ?? null,
          meetingDate: record.meetingDate,
          status: record.status ?? null,
          audienceGender: record.audienceGender ?? null,
          createdAt: record.createdAt ?? null,
          createdBy: record.createdBy ?? null,
          updatedAt: record.updatedAt ?? null,
          updatedBy: record.updatedBy ?? null,
          mergedInto: record.mergedInto ?? null,
          openedAutomatically: record.openedAutomatically ?? null,
        })
      }
    } else if (docType === 'weeklyIjtemaSubmission') {
      const record = data.record ?? data
      allSubmissions.push({
        id: record.id,
        eventId: record.eventId,
        ruknId: record.ruknId,
        ruknName: record.ruknName,
        marks: Array.isArray(record.marks) ? record.marks : [],
        submittedAt: record.submittedAt,
        submittedBy: record.submittedBy,
        updatedAt: record.updatedAt,
        updatedBy: record.updatedBy,
        firestoreDocId: doc.id,
      })
    }
  }

  const eventIds = new Set(events.map((e) => e.id))
  const submissionsByEventId = new Map()
  for (const sub of allSubmissions) {
    if (!eventIds.has(sub.eventId)) continue
    const list = submissionsByEventId.get(sub.eventId) ?? []
    list.push(sub)
    submissionsByEventId.set(sub.eventId, list)
  }

  // Enrich events with mark/submission counts + per-event attendance snapshot
  for (const event of events) {
    const subs = submissionsByEventId.get(event.id) ?? []
    event._submissionCount = subs.length
    event._markCount = markCount(subs)
    event._markBreakdown = countMarks(subs)

    const gender = event.audienceGender
    const connectedByRukn = new Map()
    for (const [ruknId, kSet] of connectedByRuknAll) {
      const rukn = ruknById.get(ruknId)
      if (!rukn || rukn.status === 'archived' || rukn.isArchived === true) continue
      if (rukn.status && rukn.status !== 'active') continue
      if (gender && rukn.gender && rukn.gender !== gender) continue
      if (kSet.size === 0) continue
      connectedByRukn.set(ruknId, [...kSet])
    }
    event._connectedSnapshot = computeAttendanceTotals(subs, connectedByRukn)
  }

  // Group by audience
  const groups = new Map()
  for (const event of events) {
    const key = eventAudienceKey(event.meetingDate, event.audienceGender)
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }

  const groupReports = []

  for (const [key, groupEvents] of groups) {
    const audienceGender = groupEvents[0].audienceGender ?? null
    const { canonical, reasons } = pickCanonical(groupEvents)
    const duplicates = groupEvents.filter((e) => e.id !== canonical?.id)

    const { conflicts, mergedSubmissions } = planMerge(
      groupEvents,
      submissionsByEventId,
    )

    // Connected map for this audience
    const connectedByRukn = new Map()
    for (const [ruknId, kSet] of connectedByRuknAll) {
      const rukn = ruknById.get(ruknId)
      if (!rukn || rukn.status === 'archived' || rukn.isArchived === true) continue
      if (rukn.status && rukn.status !== 'active') continue
      if (audienceGender && rukn.gender && rukn.gender !== audienceGender) continue
      if (kSet.size === 0) continue
      connectedByRukn.set(ruknId, [...kSet])
    }

    const afterTotals = computeAttendanceTotals(mergedSubmissions, connectedByRukn)

    // Before = sum of per-event KPI on Open events (current double-count risk) +
    // also show canonical-alone and raw union for transparency
    const openEvents = groupEvents.filter((e) => e.status === 'Open')
    const beforeSumOpen = openEvents.reduce(
      (acc, e) => {
        const s = e._connectedSnapshot
        return {
          connected: acc.connected + s.connected, // same roster repeated — note double-count
          reminded: acc.reminded + s.reminded,
          present: acc.present + s.present,
          absent: acc.absent + s.absent,
          pending: acc.pending + s.pending,
          markTotal: acc.markTotal + e._markCount,
          submissions: acc.submissions + e._submissionCount,
        }
      },
      { connected: 0, reminded: 0, present: 0, absent: 0, pending: 0, markTotal: 0, submissions: 0 },
    )

    // Per-duplicate: which submissions would be copied into canonical
    const mergeFromDuplicates = duplicates.map((dup) => {
      const dupSubs = submissionsByEventId.get(dup.id) ?? []
      const details = dupSubs.map((sub) => {
        const winner = mergedSubmissions.find((m) => m.ruknId === sub.ruknId)
        const wins = winner && winner.id === sub.id
        const alreadyOnCanonical = Boolean(
          (submissionsByEventId.get(canonical.id) ?? []).find(
            (c) => c.ruknId === sub.ruknId,
          ),
        )
        return {
          ruknId: sub.ruknId,
          ruknName: sub.ruknName,
          submissionId: sub.id,
          updatedAt: sub.updatedAt,
          markCount: sub.marks?.length ?? 0,
          wouldWinForCanonical: wins,
          action: wins
            ? alreadyOnCanonical &&
              (submissionsByEventId.get(canonical.id) ?? []).some(
                (c) => c.id === sub.id,
              )
              ? 'already_on_canonical'
              : alreadyOnCanonical
                ? 'overwrite_canonical_with_this_newer_submission'
                : 'copy_to_canonical'
            : 'discard_older_than_winner',
        }
      })
      return {
        eventId: dup.id,
        status: dup.status,
        submissionCount: dupSubs.length,
        markCount: dup._markCount,
        submissions: details,
      }
    })

    groupReports.push({
      audienceKey: key,
      audienceGender,
      eventCount: groupEvents.length,
      events: groupEvents
        .slice()
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
        .map((e) => ({
          eventId: e.id,
          firestoreDocId: e.firestoreDocId,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          status: e.status,
          gender: e.audienceGender ?? 'legacy',
          title: e.title,
          submissionCount: e._submissionCount,
          markCount: e._markCount,
          markBreakdown: e._markBreakdown,
          connectedSnapshot: e._connectedSnapshot,
          isCanonicalCandidate: e.id === canonical?.id,
        })),
      canonical: canonical
        ? {
            eventId: canonical.id,
            status: canonical.status,
            gender: canonical.audienceGender ?? 'legacy',
            createdAt: canonical.createdAt,
            updatedAt: canonical.updatedAt,
            submissionCount: canonical._submissionCount,
            markCount: canonical._markCount,
            selectionReasons: reasons,
          }
        : null,
      wouldArchive: duplicates.map((d) => ({
        eventId: d.id,
        status: d.status,
        createdAt: d.createdAt,
        submissionCount: d._submissionCount,
        markCount: d._markCount,
        proposedStatus: 'archived',
        proposedMergedInto: canonical?.id ?? null,
      })),
      conflicts,
      mergeFromDuplicates,
      beforeCounts: {
        note: 'Sum across Open events — Connected is roster×eventCount (current Admin KPI double-count risk). Present/Absent/Reminded sum raw marks from each Open event.',
        openEventCount: openEvents.length,
        summedOpenKpis: beforeSumOpen,
        perEvent: groupEvents.map((e) => ({
          eventId: e.id,
          status: e.status,
          ...e._connectedSnapshot,
          submissionCount: e._submissionCount,
          markCount: e._markCount,
        })),
      },
      afterCounts: {
        note: 'After merge into single canonical: Connected counted once from Active assignments for audience gender. Marks from winning Rukn submissions only.',
        ...afterTotals,
        submissionCount: mergedSubmissions.length,
        markCountRaw: markCount(mergedSubmissions),
      },
    })
  }

  const report = {
    ticket: 'KC-037C2G',
    mode: 'DRY_RUN_AUDIT_ONLY',
    generatedAt: new Date().toISOString(),
    projectId,
    meetingDate: MEETING_DATE,
    summary: {
      totalEvents: events.length,
      audienceGroups: groupReports.length,
      groupsNeedingDedupe: groupReports.filter((g) => g.eventCount > 1).length,
      proposedCanonicalIds: groupReports
        .map((g) => g.canonical?.eventId)
        .filter(Boolean),
      proposedArchiveIds: groupReports.flatMap((g) =>
        g.wouldArchive.map((a) => a.eventId),
      ),
      totalConflicts: groupReports.reduce((n, g) => n + g.conflicts.length, 0),
    },
    groups: groupReports,
    safety: {
      firestoreWrites: 0,
      archived: false,
      deleted: false,
      updated: false,
      nextStep: 'Review this report. Only run --apply after explicit approval.',
    },
  }

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(
    REPORT_DIR,
    `kc-037c2g-dedupe-audit-${MEETING_DATE}-${stamp}.json`,
  )
  const latestPath = resolve(
    REPORT_DIR,
    `kc-037c2g-dedupe-audit-${MEETING_DATE}-latest.json`,
  )
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  writeFileSync(latestPath, JSON.stringify(report, null, 2))

  // Human-readable console summary
  console.log('\n========== KC-037C2G DRY-RUN AUDIT ==========')
  console.log(`Meeting date: ${MEETING_DATE}`)
  console.log(`Events found: ${events.length}`)
  console.log(`Audience groups: ${groupReports.length}`)
  console.log(`Groups needing dedupe: ${report.summary.groupsNeedingDedupe}`)
  console.log(`Proposed archive IDs: ${report.summary.proposedArchiveIds.join(', ') || '(none)'}`)
  console.log(`Rukn conflicts (multi-event): ${report.summary.totalConflicts}`)

  for (const g of groupReports) {
    console.log(`\n--- Audience: ${g.audienceGender ?? 'legacy'} (${g.eventCount} events) ---`)
    for (const e of g.events) {
      const star = e.isCanonicalCandidate ? ' ← CANONICAL' : ''
      console.log(
        `  ${e.eventId} | created=${e.createdAt} | status=${e.status} | gender=${e.gender} | subs=${e.submissionCount} | marks=${e.markCount} | connected=${e.connectedSnapshot.connected} P=${e.connectedSnapshot.present} A=${e.connectedSnapshot.absent} R=${e.connectedSnapshot.reminded} Pending=${e.connectedSnapshot.pending}${star}`,
      )
    }
    if (g.canonical) {
      console.log(`  Canonical: ${g.canonical.eventId}`)
      for (const r of g.canonical.selectionReasons) console.log(`    · ${r}`)
    }
    if (g.wouldArchive.length) {
      console.log(
        `  Would archive: ${g.wouldArchive.map((a) => a.eventId).join(', ')} → mergedInto=${g.canonical?.eventId}`,
      )
    }
    if (g.conflicts.length) {
      console.log(`  Conflicts (${g.conflicts.length}):`)
      for (const c of g.conflicts) {
        console.log(
          `    Rukn ${c.ruknId} (${c.ruknName}): winner event=${c.winner.eventId} updatedAt=${c.winner.updatedAt}; losers=${c.losers.map((l) => `${l.eventId}@${l.updatedAt}`).join(', ')}`,
        )
      }
    }
    console.log('  Before (summed Open KPIs — may double-count Connected):')
    console.log(`    ${JSON.stringify(g.beforeCounts.summedOpenKpis)}`)
    console.log('  After (expected single canonical):')
    console.log(
      `    Connected=${g.afterCounts.connected} Reminded=${g.afterCounts.reminded} Present=${g.afterCounts.present} Absent=${g.afterCounts.absent} Pending=${g.afterCounts.pending} submissions=${g.afterCounts.submissionCount}`,
    )
  }

  console.log(`\nWrote: ${outPath}`)
  console.log(`Wrote: ${latestPath}`)
  console.log('\nNO FIRESTORE WRITES PERFORMED. Awaiting approval before --apply.')
}

main().catch((err) => {
  console.error('KC-037C2G audit failed:', err)
  process.exit(1)
})
