#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataDir = join(root, 'data', 'production')
const outputDir = join(root, 'src', 'data', 'production')

const files = [
  {
    csv: 'rukn-master.csv',
    exportName: 'RUKN_PRODUCTION_RECORDS',
    output: 'ruknProductionRecords.ts',
    comment: 'Official Basavakalyan Rukn Master.',
  },
  {
    csv: 'male-karkun-master.csv',
    exportName: 'MALE_KARKUN_PRODUCTION_RECORDS',
    output: 'maleKarkunProductionRecords.ts',
    comment: 'Cleaned Male Karkun Master for Basavakalyan.',
  },
  {
    csv: 'female-karkun-master.csv',
    exportName: 'FEMALE_KARKUN_PRODUCTION_RECORDS',
    output: 'femaleKarkunProductionRecords.ts',
    comment: 'Cleaned Female Karkun Master for Basavakalyan.',
  },
]

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = lines[0].split(',').map((header) => header.trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })

  return { headers, rows }
}

function normalizeGender(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm') return 'Male'
  if (normalized === 'female' || normalized === 'f') return 'Female'
  return 'Male'
}

function escapeString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function rowToRecord(row) {
  const name = row.Name ?? row.name ?? ''
  const gender = normalizeGender(row.Gender ?? row.gender)
  const mobile = row.Mobile ?? row.mobile ?? ''
  const whatsapp = row.WhatsApp ?? row.whatsapp ?? ''
  const place = row.Place ?? row.place ?? 'Basavakalyan'
  const notes = row.Notes ?? row.notes ?? ''
  const area = row.Area ?? row.area ?? ''
  const address = row.Address ?? row.address ?? ''

  const fields = [
    `name: '${escapeString(name)}'`,
    `gender: '${gender}'`,
    `mobile: '${escapeString(mobile)}'`,
    `place: '${escapeString(place)}'`,
  ]

  if (whatsapp) fields.push(`whatsapp: '${escapeString(whatsapp)}'`)
  if (notes) fields.push(`notes: '${escapeString(notes)}'`)
  if (area) fields.push(`area: '${escapeString(area)}'`)
  if (address) fields.push(`address: '${escapeString(address)}'`)

  return `{ ${fields.join(', ')} }`
}

function generateTs(exportName, comment, records) {
  const body = records.length > 0 ? records.map((record) => `  ${record},`).join('\n') : ''

  return `import type { ProductionPersonRecord } from '@/data/production/productionPersonRecord'

/**
 * ${comment}
 * Regenerate from data/production/${files.find((file) => file.exportName === exportName)?.csv} via: npm run migrate:generate
 */
export const ${exportName}: ProductionPersonRecord[] = [
${body}
]
`
}

mkdirSync(dataDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })

for (const file of files) {
  const csvPath = join(dataDir, file.csv)
  if (!existsSync(csvPath)) {
    console.warn(`Skipping ${file.csv} — file not found at ${csvPath}`)
    continue
  }

  const content = readFileSync(csvPath, 'utf8')
  const { rows } = parseCsv(content)
  const records = rows.filter((row) => (row.Name ?? row.name ?? '').trim()).map(rowToRecord)
  const ts = generateTs(file.exportName, file.comment, records)
  writeFileSync(join(outputDir, file.output), ts, 'utf8')
  console.log(`Generated ${file.output} (${records.length} records)`)
}

console.log('Production seed generation complete.')
