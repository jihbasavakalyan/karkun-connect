import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const maleRecordsPath = join(root, 'src', 'data', 'production', 'maleKarkunProductionRecords.ts')
const ruknMasterPath = join(root, 'src', 'data', 'ruknMaster.ts')

function normalizeMobile(mobile) {
  return String(mobile ?? '').trim().replace(/\D/g, '')
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile)
  return digits.length === 10 && /^\d+$/.test(digits)
}

function extractMobilesFromRuknMaster(content) {
  const block = content.split('RUKN_VERIFIED_MOBILES')[1]?.split('const SEED_DATE')[0] ?? ''
  const matches = [...block.matchAll(/: '(\d{10})'/g)]
  return matches.map((match) => match[1])
}

function extractMaleRecords(content) {
  const records = []
  const pattern = /name: '((?:\\'|[^'])*)', gender: 'Male', mobile: '((?:\\'|[^'])*)'/g
  for (const match of content.matchAll(pattern)) {
    records.push({
      name: match[1].replace(/\\'/g, "'"),
      mobile: match[2].replace(/\\'/g, "'"),
    })
  }
  return records
}

const maleContent = readFileSync(maleRecordsPath, 'utf8')
const ruknContent = readFileSync(ruknMasterPath, 'utf8')
const records = extractMaleRecords(maleContent)
const ruknMobiles = new Set(extractMobilesFromRuknMaster(ruknContent))

const seenMobiles = new Set()
let imported = 0
let skipped = 0
let duplicateMobiles = 0
let invalidMobiles = 0
let blankNames = 0
let blankMobiles = 0
let ruknConflicts = 0

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

  seenMobiles.add(mobileKey)
  imported++
}

console.log('Male Karkun Import Verification (Cleaned_Karkun_List.xlsx)')
console.log('-----------------------------------------------------------')
console.log(`Source rows: ${records.length}`)
console.log(`Imported: ${imported}`)
console.log(`Skipped: ${skipped}`)
console.log(`Duplicate mobile conflicts: ${duplicateMobiles}`)
console.log(`Invalid mobile records: ${invalidMobiles}`)
console.log(`Blank-name records: ${blankNames}`)
console.log(`Blank-mobile records: ${blankMobiles}`)
console.log(`Rukn mobile conflicts: ${ruknConflicts}`)
console.log(`Final Male Karkun count: ${imported}`)
