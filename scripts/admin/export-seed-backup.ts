/**
 * P2 — Export bundled production seed data as DatasetBackup JSON for Firestore import.
 * Run: npm run admin:export-seed
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatasetBackup } from '@/lib/migration/migrationBackupService'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outputDir = join(projectRoot, 'production-data', 'exports')
const outputPath = join(outputDir, 'seed-backup.json')

runProductionDataMigration()
const backup = createDatasetBackup('P2 production seed export')

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8')

console.log(`Exported seed backup to ${outputPath}`)
console.log(
  `Counts: ${backup.rukns.length} rukns, ${backup.karkuns.length} karkuns, ${backup.assignments.length} assignments`,
)
