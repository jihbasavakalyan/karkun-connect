/**
 * Generate Excel templates for production-data folder.
 * Run: node scripts/generate-migration-templates.mjs
 */
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'production-data')

const ruknHeaders = ['Name', 'Gender', 'Mobile', 'WhatsApp', 'Place', 'Status', 'Notes', 'ID']
const karkunHeaders = [
  'Name',
  'Gender',
  'Mobile',
  'WhatsApp',
  'Place',
  'Status',
  'Notes',
  'Area',
  'Address',
  'ID',
]

function writeTemplate(filename, headers, sampleRow) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([headers, sampleRow])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Template')
  XLSX.writeFile(workbook, path.join(root, filename))
}

writeTemplate('rukn-master-template.xlsx', ruknHeaders, [
  'Sample Rukn',
  'Male',
  '9876543210',
  '',
  'Basavakalyan',
  'active',
  '',
  '',
])

writeTemplate('karkun-master-template.xlsx', karkunHeaders, [
  'Sample Karkun',
  'Male',
  '8861182842',
  '',
  'Basavakalyan',
  'active',
  '',
  'Ward 1',
  '',
  '',
])

writeFileSync(
  path.join(root, 'README.md'),
  `# Production Data

Templates and documentation for Basavakalyan campaign production imports.

| File | Purpose |
|------|---------|
| \`rukn-master-template.xlsx\` | Rukn master import template |
| \`karkun-master-template.xlsx\` | Karkun master import template |
| \`sample-import.csv\` | Minimal CSV example |
| \`field-mapping.md\` | Column definitions |
| \`validation-rules.md\` | Import validation rules |

Import via **Admin → Settings → Data Migration**.
`,
  'utf8',
)

console.log('Generated production-data templates.')
