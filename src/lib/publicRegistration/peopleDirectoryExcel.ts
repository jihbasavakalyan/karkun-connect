/**
 * Client-safe Tarbiyati Admin people-directory Excel export.
 * Uses the same filtered TrainingAdminSearchPerson[] already shown in the UI.
 */
import * as XLSX from 'xlsx'
import {
  trainingOrganisationalCategoryLabel,
  trainingPaymentMethodLabel,
  trainingPaymentStatusLabel,
} from './labels.js'
import type { TrainingAdminSearchPerson } from './types.js'

export const TRAINING_ADMIN_PEOPLE_EXCEL_HEADERS = [
  'Person ID',
  'Name',
  'Mobile',
  'Category',
  'Gender',
  'Registration Status',
  'Registration ID',
  'Payment Method',
  'Payment Status',
  'Cash Paid To',
] as const

export type TrainingAdminPeopleExcelRow = {
  'Person ID': string
  Name: string
  Mobile: string
  Category: string
  Gender: string
  'Registration Status': string
  'Registration ID': string
  'Payment Method': string
  'Payment Status': string
  'Cash Paid To': string
}

export function buildTrainingAdminPeopleExcelRows(
  people: TrainingAdminSearchPerson[],
): TrainingAdminPeopleExcelRow[] {
  return people.map((person) => ({
    'Person ID': person.personId,
    Name: person.name,
    Mobile: person.mobile,
    Category: trainingOrganisationalCategoryLabel(person.organisationalCategory),
    Gender: person.gender || '',
    'Registration Status': person.registered ? 'Registered' : 'Not Registered',
    'Registration ID': person.registered ? person.registrationId ?? '' : '',
    'Payment Method':
      person.registered && person.paymentMethod
        ? trainingPaymentMethodLabel(person.paymentMethod)
        : '',
    'Payment Status':
      person.registered && person.paymentStatus
        ? trainingPaymentStatusLabel(person.paymentStatus)
        : '',
    'Cash Paid To': person.registered ? person.cashPaidToName ?? '' : '',
  }))
}

export function trainingAdminPeopleExcelFilename(now = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  return `Tarbiyati-Ijtema-People-${day}.xlsx`
}

export function buildTrainingAdminPeopleWorkbook(
  people: TrainingAdminSearchPerson[],
): XLSX.WorkBook {
  const rows = buildTrainingAdminPeopleExcelRows(people)
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...TRAINING_ADMIN_PEOPLE_EXCEL_HEADERS],
  })

  const lastCol = TRAINING_ADMIN_PEOPLE_EXCEL_HEADERS.length - 1
  const lastRow = Math.max(rows.length, 0)
  const range = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastCol },
  })
  sheet['!ref'] = range
  sheet['!autofilter'] = { ref: range }
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
  ]

  // Keep mobile values as text so Excel does not coerce them to numbers.
  for (let index = 0; index < rows.length; index += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: index + 1, c: 2 })
    const cell = sheet[cellAddress]
    if (cell && typeof cell.v === 'string') {
      cell.t = 's'
      cell.z = '@'
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tarbiyati Ijtema')
  return workbook
}

export function downloadTrainingAdminPeopleExcel(people: TrainingAdminSearchPerson[]): {
  filename: string
  rowCount: number
} {
  const workbook = buildTrainingAdminPeopleWorkbook(people)
  const filename = trainingAdminPeopleExcelFilename()
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' })
  return { filename, rowCount: people.length }
}
