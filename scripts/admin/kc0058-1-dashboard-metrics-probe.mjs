#!/usr/bin/env node
/**
 * KC-0058.1 — Read-only production probe: why dashboard Connections may be 0
 * while integrity scanner reports connection document count.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const [connectionsSnap, karkunsSnap] = await Promise.all([
    db.collection('connections').get(),
    db.collection('karkuns').get(),
  ])

  const karkunIds = new Set(karkunsSnap.docs.map((d) => d.id))
  const karkunById = new Map(karkunsSnap.docs.map((d) => [d.id, d.data()]))

  const rows = connectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const byStatus = {}
  let archived = 0
  let missingCampaignId = 0
  let withCampaignId = 0
  let active = 0
  let activeKarkunMissing = 0
  let activeKarkunArchived = 0
  let activeCanonical = 0
  const activeKarkunSet = new Set()
  const missingKarkunSamples = []
  const statusSamples = {}

  for (const row of rows) {
    const status = String(row.status || 'MISSING')
    byStatus[status] = (byStatus[status] || 0) + 1
    if (!statusSamples[status]) statusSamples[status] = row.id
    if (row.isArchived) archived += 1
    if (row.campaignId) withCampaignId += 1
    else missingCampaignId += 1

    if (status === 'Active') {
      active += 1
      const k = karkunById.get(row.karkunId)
      if (!karkunIds.has(row.karkunId) || !k) {
        activeKarkunMissing += 1
        if (missingKarkunSamples.length < 10) {
          missingKarkunSamples.push({
            assignmentId: row.id,
            karkunId: row.karkunId,
            ruknId: row.ruknId,
          })
        }
        continue
      }
      if (k.isArchived) {
        activeKarkunArchived += 1
        continue
      }
      if (!activeKarkunSet.has(row.karkunId)) {
        activeKarkunSet.add(row.karkunId)
        activeCanonical += 1
      }
    }
  }

  const report = {
    ticket: 'KC-0058.1',
    projectId,
    generatedAt: new Date().toISOString(),
    firestore: {
      connectionsTotal: rows.length,
      byStatus,
      statusSamples,
      archivedFlagCount: archived,
      withCampaignId,
      missingCampaignId,
      activeRowCount: active,
      activeKarkunMissing,
      activeKarkunArchived,
      canonicalConnectedUniqueKarkuns: activeCanonical,
      karkunDocCount: karkunsSnap.size,
    },
    interpretation: {
      integrityScannerConnectionCount: rows.length,
      dashboardCanonicalConnectedWouldBe: activeCanonical,
      likelyCause:
        active === 0
          ? 'NO_ACTIVE_STATUS_ROWS'
          : activeCanonical === 0 && activeKarkunMissing > 0
            ? 'ACTIVE_ROWS_POINT_TO_MISSING_KARKUNS'
            : activeCanonical === 0 && activeKarkunArchived > 0
              ? 'ACTIVE_ROWS_POINT_TO_ARCHIVED_KARKUNS'
              : activeCanonical > 0
                ? 'DATA_OK_DASHBOARD_LIKELY_HYDRATION_OR_CLIENT_FILTER'
                : 'OTHER',
    },
    missingKarkunSamples,
  }

  const dir = resolve('production-data/exports')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const out = resolve(dir, 'kc0058-1-dashboard-metrics-probe.json')
  writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${out}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
