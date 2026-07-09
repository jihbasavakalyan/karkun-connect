#!/usr/bin/env node
/**
 * P2 — Verify production Firestore data after import.
 *
 * Usage:
 *   node scripts/admin/verify-firestore-production.mjs
 *   EXPECTED_RUKN_COUNT=49 EXPECTED_KARKUN_COUNT=493 node scripts/admin/verify-firestore-production.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const COLLECTIONS = {
  rukns: 'rukns',
  karkuns: 'karkuns',
  connections: 'connections',
}

function readExpectedCounts() {
  const defaults = {
    rukns: Number(process.env.EXPECTED_RUKN_COUNT ?? 49),
    karkuns: Number(process.env.EXPECTED_KARKUN_COUNT ?? 0),
  }

  const seedPath = resolve('production-data/exports/seed-backup.json')
  if (existsSync(seedPath)) {
    const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
    return {
      rukns: seed.rukns?.length ?? defaults.rukns,
      karkuns: seed.karkuns?.length ?? defaults.karkuns,
    }
  }

  return defaults
}

function assertCondition(condition, message, failures) {
  if (!condition) {
    failures.push(message)
    console.error(`✗ ${message}`)
    return false
  }
  console.log(`✓ ${message}`)
  return true
}

async function main() {
  const { db } = initFirebaseAdmin()
  const expected = readExpectedCounts()
  const failures = []

  const [ruknSnap, karkunSnap, connectionSnap] = await Promise.all([
    db.collection(COLLECTIONS.rukns).get(),
    db.collection(COLLECTIONS.karkuns).get(),
    db.collection(COLLECTIONS.connections).get(),
  ])

  const rukns = ruknSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const karkuns = karkunSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const connections = connectionSnap.docs.map((doc) => ({ assignmentId: doc.id, ...doc.data() }))

  assertCondition(rukns.length > 0, `Rukn collection readable (${rukns.length} documents)`, failures)
  assertCondition(
    expected.rukns === 0 || rukns.length === expected.rukns,
    `Rukn count matches expected (${rukns.length}/${expected.rukns})`,
    failures,
  )
  assertCondition(
    new Set(rukns.map((rukn) => rukn.id)).size === rukns.length,
    'Rukn IDs are unique',
    failures,
  )

  assertCondition(karkuns.length > 0, `Karkun collection readable (${karkuns.length} documents)`, failures)
  if (expected.karkuns > 0) {
    assertCondition(
      karkuns.length === expected.karkuns,
      `Karkun count matches expected (${karkuns.length}/${expected.karkuns})`,
      failures,
    )
  }
  assertCondition(
    new Set(karkuns.map((karkun) => karkun.id)).size === karkuns.length,
    'Karkun IDs are unique',
    failures,
  )

  const ruknIds = new Set(rukns.map((rukn) => rukn.id))
  const karkunIds = new Set(karkuns.map((karkun) => karkun.id))

  for (const connection of connections) {
    if (connection.ruknId && !ruknIds.has(connection.ruknId)) {
      assertCondition(false, `Connection ${connection.assignmentId} references missing rukn ${connection.ruknId}`, failures)
    }
    if (connection.karkunId && !karkunIds.has(connection.karkunId)) {
      assertCondition(
        false,
        `Connection ${connection.assignmentId} references missing karkun ${connection.karkunId}`,
        failures,
      )
    }
  }

  if (connections.length > 0) {
    assertCondition(
      connections.every((connection) => connection.ruknId && connection.karkunId),
      'All connections have ruknId and karkunId',
      failures,
    )
  } else {
    console.log('• No connections yet (expected before pilot assignments)')
  }

  console.log(`\nSummary: ${rukns.length} rukns, ${karkuns.length} karkuns, ${connections.length} connections`)

  if (failures.length > 0) {
    console.error(`\nVerification failed (${failures.length} issue(s)).`)
    process.exit(1)
  }

  console.log('\nFirestore production verification passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
