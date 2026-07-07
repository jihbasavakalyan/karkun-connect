import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourceCandidates = [
  join(root, 'data', 'production', 'Cleaned_Karkun_List.xlsx'),
  join(process.env.USERPROFILE ?? '', 'Downloads', 'Cleaned_Karkun_List.xlsx'),
]

const sourcePath = sourceCandidates.find((path) => {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
})

if (!sourcePath) {
  console.error('Cleaned_Karkun_List.xlsx not found.')
  process.exit(1)
}

const productionDir = join(root, 'data', 'production')
mkdirSync(productionDir, { recursive: true })
copyFileSync(sourcePath, join(productionDir, 'Cleaned_Karkun_List.xlsx'))

const workbook = XLSX.readFile(sourcePath)
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

function escapeString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function getField(row, ...keys) {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header)
    if (keys.some((key) => normalized === normalizeHeader(key))) {
      return String(value ?? '').trim()
    }
  }
  return ''
}

const records = rows
  .map((row) => ({
    name: getField(row, 'Name', 'Karkun Name', 'Full Name'),
    mobile: getField(row, 'Mobile', 'Mobile Number', 'Phone'),
  }))
  .filter((row) => row.name || row.mobile)

const output = `import type { ProductionPersonRecord } from '@/data/production/productionPersonRecord'

/**
 * Official Male Karkun Master from Cleaned_Karkun_List.xlsx.
 * Regenerate via: npm run migrate:import-male-karkuns
 */
export const MALE_KARKUN_PRODUCTION_RECORDS: ProductionPersonRecord[] = [
${records
  .map(
    (record) =>
      `  { name: '${escapeString(record.name)}', gender: 'Male', mobile: '${escapeString(record.mobile)}', place: 'Basavakalyan', status: 'active' },`,
  )
  .join('\n')}
]
`

writeFileSync(join(root, 'src', 'data', 'production', 'maleKarkunProductionRecords.ts'), output, 'utf8')

const csvHeader = 'Name,Gender,Mobile,Place,Status'
const csvRows = records.map(
  (record) =>
    `${record.name},Male,${record.mobile},Basavakalyan,active`,
)
writeFileSync(
  join(productionDir, 'male-karkun-master.csv'),
  [csvHeader, ...csvRows].join('\n'),
  'utf8',
)

console.log(`Source: ${sourcePath}`)
console.log(`Rows parsed: ${rows.length}`)
console.log(`Records written: ${records.length}`)
