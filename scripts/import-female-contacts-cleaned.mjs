import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const fileNames = [
  'Female_Contacts_Cleaned(1).xlsx',
  'Female_Contacts_Cleaned.xlsx',
]

const sourceCandidates = [
  ...fileNames.map((name) => join(root, 'data', 'production', name)),
  ...fileNames.map((name) => join(process.env.USERPROFILE ?? '', 'Downloads', name)),
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
  console.error('Female_Contacts_Cleaned xlsx not found.')
  process.exit(1)
}

const productionDir = join(root, 'data', 'production')
mkdirSync(productionDir, { recursive: true })
const archiveName = 'Female_Contacts_Cleaned.xlsx'
copyFileSync(sourcePath, join(productionDir, archiveName))

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

function normalizeMobile(mobile) {
  return String(mobile ?? '').trim().replace(/\D/g, '')
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile)
  return digits.length === 10 && /^\d+$/.test(digits)
}

function extractRuknMobiles() {
  const content = readFileSync(join(root, 'src', 'data', 'ruknMaster.ts'), 'utf8')
  const block = content.split('RUKN_VERIFIED_MOBILES')[1]?.split('const SEED_DATE')[0] ?? ''
  return new Set([...block.matchAll(/: '(\d{10})'/g)].map((match) => match[1]))
}

function extractMaleMobiles() {
  const content = readFileSync(
    join(root, 'src', 'data', 'production', 'maleKarkunProductionRecords.ts'),
    'utf8',
  )
  const mobiles = new Set()
  for (const match of content.matchAll(/gender: 'Male', mobile: '((?:\\'|[^'])*)'/g)) {
    const mobile = normalizeMobile(match[1].replace(/\\'/g, "'"))
    if (mobile.length === 10) mobiles.add(mobile)
  }
  return mobiles
}

const ruknMobiles = extractRuknMobiles()
const maleMobiles = extractMaleMobiles()
const seenFemaleMobiles = new Set()

const records = []
const exceptions = []

rows.forEach((row, index) => {
  const rowNum = index + 2
  const name = getField(row, 'Name', 'Karkun Name', 'Full Name')
  const mobile = getField(row, 'Mobile', 'Mobile Number', 'Phone')

  if (!name && !mobile) {
    return
  }

  if (!name.trim()) {
    exceptions.push({ row: rowNum, name, mobile, reason: 'Name is required.' })
    return
  }

  if (!mobile.trim()) {
    exceptions.push({ row: rowNum, name, mobile, reason: 'Mobile number is required.' })
    return
  }

  const mobileKey = normalizeMobile(mobile)
  if (!isValidMobile(mobile)) {
    exceptions.push({
      row: rowNum,
      name,
      mobile,
      reason: 'Mobile number must be exactly 10 digits (numbers only).',
    })
    return
  }

  if (seenFemaleMobiles.has(mobileKey)) {
    exceptions.push({
      row: rowNum,
      name,
      mobile,
      reason: 'Duplicate mobile in Female Karkun Master.',
    })
    return
  }

  if (ruknMobiles.has(mobileKey)) {
    exceptions.push({
      row: rowNum,
      name,
      mobile,
      reason: 'Mobile already used by Official Rukn Master.',
    })
    return
  }

  if (maleMobiles.has(mobileKey)) {
    exceptions.push({
      row: rowNum,
      name,
      mobile,
      reason: 'Mobile already used by Official Male Karkun Master.',
    })
    return
  }

  seenFemaleMobiles.add(mobileKey)
  records.push({ name, mobile: mobileKey })
})

const output = `import type { ProductionPersonRecord } from '@/data/production/productionPersonRecord'

/**
 * Official Female Karkun Master from Female_Contacts_Cleaned.xlsx.
 * Regenerate via: npm run migrate:import-female-karkuns
 */
export const FEMALE_KARKUN_PRODUCTION_RECORDS: ProductionPersonRecord[] = [
${records
  .map(
    (record) =>
      `  { name: '${escapeString(record.name)}', gender: 'Female', mobile: '${escapeString(record.mobile)}', place: 'Basavakalyan', status: 'active' },`,
  )
  .join('\n')}
]
`

writeFileSync(join(root, 'src', 'data', 'production', 'femaleKarkunProductionRecords.ts'), output, 'utf8')

const csvHeader = 'Name,Gender,Mobile,Place,Status'
const csvRows = records.map(
  (record) => `${record.name},Female,${record.mobile},Basavakalyan,active`,
)
writeFileSync(
  join(productionDir, 'female-karkun-master.csv'),
  [csvHeader, ...csvRows].join('\n'),
  'utf8',
)

const exceptionHeader = 'Row,Name,Mobile,Reason'
const exceptionRows = exceptions.map(
  (entry) =>
    `${entry.row},"${String(entry.name).replace(/"/g, '""')}","${entry.mobile}","${entry.reason}"`,
)
writeFileSync(
  join(productionDir, 'female-karkun-import-exceptions.csv'),
  [exceptionHeader, ...exceptionRows].join('\n'),
  'utf8',
)

console.log(`Source: ${sourcePath}`)
console.log(`Rows parsed: ${rows.length}`)
console.log(`Valid records written: ${records.length}`)
console.log(`Import exceptions: ${exceptions.length}`)
console.log(`Exception report: data/production/female-karkun-import-exceptions.csv`)
