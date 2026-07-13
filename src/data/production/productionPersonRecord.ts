import type { PersonGender, PersonStatus } from '@/types/people.types'
import { DEFAULT_PLACE } from '@/types/people.types'

export type ProductionPersonRecord = {
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place?: string
  status?: PersonStatus
  notes?: string
  area?: string
  address?: string
}

export function toProductionImportRow(record: ProductionPersonRecord) {
  return {
    name: record.name,
    gender: record.gender,
    mobile: record.mobile,
   whatsapp: record.whatsapp ?? record.mobile,
    place: record.place ?? DEFAULT_PLACE,
    status: record.status ?? 'active',
    notes: record.notes,
    area: record.area,
    address: record.address,
  }
}
