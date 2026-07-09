#!/usr/bin/env node
/**
 * P2 — Import a DatasetBackup JSON export into Firestore (Admin SDK).
 *
 * Generate seed backup:
 *   npm run admin:export-seed
 *
 * Import to staging/production:
 *   node scripts/admin/import-dataset-backup.mjs production-data/exports/seed-backup.json
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const COLLECTIONS = {
  rukns: 'rukns',
  karkuns: 'karkuns',
  connections: 'connections',
  settings: 'settings',
}

const DOCS = {
  karkunCounter: 'karkunCounter',
  connectionMeta: 'connectionMeta',
  migrationVersion: 'migrationVersion',
}

function parseArgs(argv) {
  const options = {
    file: null,
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (!token.startsWith('-') && !options.file) {
      options.file = token
    }
  }

  return options
}

async function writeBatch(db, writes, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Would write ${writes.length} documents`)
    return
  }

  const chunkSize = 400
  for (let offset = 0; offset < writes.length; offset += chunkSize) {
    const batch = db.batch()
    const chunk = writes.slice(offset, offset + chunkSize)
    for (const write of chunk) {
      batch.set(write.ref, write.data, { merge: true })
    }
    await batch.commit()
    console.log(`Committed ${chunk.length} documents (${offset + chunk.length}/${writes.length})`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.file) {
    console.error('Usage: node scripts/admin/import-dataset-backup.mjs <backup.json> [--dry-run]')
    process.exit(1)
  }

  const backupPath = resolve(options.file)
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'))
  const { db } = initFirebaseAdmin()

  const writes = []

  for (const rukn of backup.rukns ?? []) {
    writes.push({
      ref: db.collection(COLLECTIONS.rukns).doc(rukn.id),
      data: rukn,
    })
  }

  for (const karkun of backup.karkuns ?? []) {
    writes.push({
      ref: db.collection(COLLECTIONS.karkuns).doc(karkun.id),
      data: karkun,
    })
  }

  for (const assignment of backup.assignments ?? []) {
    writes.push({
      ref: db.collection(COLLECTIONS.connections).doc(assignment.assignmentId),
      data: assignment,
    })
  }

  if (typeof backup.nextKarkunNum === 'number') {
    writes.push({
      ref: db.collection(COLLECTIONS.settings).doc(DOCS.karkunCounter),
      data: { nextKarkunNum: backup.nextKarkunNum },
    })
  }

  if (Array.isArray(backup.assignments)) {
    const maxSequence = backup.assignments.reduce(
      (max, assignment) => Math.max(max, assignment.sequence ?? 0),
      0,
    )
    writes.push({
      ref: db.collection(COLLECTIONS.settings).doc(DOCS.connectionMeta),
      data: { nextSequence: maxSequence + 1 },
    })
  }

  if (backup.migrationVersion !== undefined && backup.migrationVersion !== null) {
    writes.push({
      ref: db.collection(COLLECTIONS.settings).doc(DOCS.migrationVersion),
      data: { version: backup.migrationVersion },
    })
  }

  console.log(
    `Importing backup "${backup.label ?? backup.id}" — ${backup.rukns?.length ?? 0} rukns, ${backup.karkuns?.length ?? 0} karkuns, ${backup.assignments?.length ?? 0} assignments`,
  )

  await writeBatch(db, writes, options.dryRun)
  console.log('Import complete.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
