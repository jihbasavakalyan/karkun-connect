import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const femaleRecordsPath = join(root, 'src', 'data', 'production', 'femaleKarkunProductionRecords.ts')
const maleRecordsPath = join(root, 'src', 'data', 'production', 'maleKarkunProductionRecords.ts')
const ruknMasterPath = join(root, 'src', 'data', 'ruknMaster.ts')
const exceptionsPath = join(root, 'data', 'production', 'female-karkun-import-exceptions.csv')

function normalizeMobile(mobile) {
  return String(mobile ?? '').trim().replace(/\D/g, '')
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile)
  return digits.length === 10 && /^\d+$/.test(digits)
}

function extractMobilesFromRuknMaster(content) {
  const block = content.split('RUKN_VERIFIED_MOBILES')[1]?.split('const SEED_DATE')[0] ?? ''
  return new Set([...block.matchAll(/: '(\d{10})'/g)].map((match) => match[1]))
}

function extractRecords(content, gender) {
  const records = []
  const pattern = new RegExp(
    `name: '((?:\\\\'|[^'])*)', gender: '${gender}', mobile: '((?:\\\\'|[^'])*)'`,
    'g',
  )
  for (const match of content.matchAll(pattern)) {
    records.push({
      name: match[1].replace(/\\'/g, "'"),
      mobile: match[2].replace(/\\'/g, "'"),
    })
  }
  return records
}

const femaleContent = readFileSync(femaleRecordsPath, 'utf8')
const maleContent = readFileSync(maleRecordsPath, 'utf8')
const ruknContent = readFileSync(ruknMasterPath, 'utf8')

const records = extractRecords(femaleContent, 'Female')
const ruknMobiles = extractMobilesFromRuknMaster(ruknContent)
const maleMobiles = new Set(
  extractRecords(maleContent, 'Male')
    .map((record) => normalizeMobile(record.mobile))
    .filter((mobile) => mobile.length === 10),
)

const seenMobiles = new Set()
let imported = 0
let skipped = 0
let duplicateMobiles = 0
let invalidMobiles = 0
let blankNames = 0
let blankMobiles = 0
let ruknConflicts = 0
let maleConflicts = 0

for (const record of records) {
  if (!record.name.trim()) {
    blankNames++
    skipped++
    continue
  }

  if (!record.mobile.trim()) {
    blankMobiles++
    skipped++
    continue
  }

  const mobileKey = normalizeMobile(record.mobile)
  if (!isValidMobile(record.mobile)) {
    invalidMobiles++
    skipped++
    continue
  }

  if (seenMobiles.has(mobileKey)) {
    duplicateMobiles++
    skipped++
    continue
  }

  if (ruknMobiles.has(mobileKey)) {
    ruknConflicts++
    skipped++
    continue
  }

  if (maleMobiles.has(mobileKey)) {
    maleConflicts++
    skipped++
    continue
  }

  seenMobiles.add(mobileKey)
  imported++
}

let exceptionCount = 0
try {
  const exceptionLines = readFileSync(exceptionsPath, 'utf8').trim().split('\n')
  exceptionCount = Math.max(0, exceptionLines.length - 1)
} catch {
  exceptionCount = 0
}

console.log('Female Karkun Import Verification (Female_Contacts_Cleaned.xlsx)')
console.log('----------------------------------------------------------------')
console.log(`Valid seed records: ${records.length}`)
console.log(`Imported: ${imported}`)
console.log(`Skipped (from seed validation): ${skipped}`)
console.log(`Duplicate mobile conflicts: ${duplicateMobiles}`)
console.log(`Invalid mobile records: ${invalidMobiles}`)
console.log(`Blank-name records: ${blankNames}`)
console.log(`Blank-mobile records: ${blankMobiles}`)
console.log(`Rukn mobile conflicts: ${ruknConflicts}`)
console.log(`Male Karkun mobile conflicts: ${maleConflicts}`)
console.log(`Import exception report rows: ${exceptionCount}`)
console.log(`Final Female Karkun count: ${imported}`)
