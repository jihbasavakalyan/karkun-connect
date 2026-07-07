import type { ImportSummary } from '@/types/people.types'

export type ProductionMigrationSummary = {
  rukns: ImportSummary
  maleKarkuns: ImportSummary
  femaleKarkuns: ImportSummary
  demoDataRemoved: boolean
  runtimeStoresCleared: boolean
  ruknsReplaced: boolean
  migrationVersion?: number
  dashboardVerified: {
    totalRukns: number
    maleKarkuns: number
    femaleKarkuns: number
    assignedKarkuns: number
    unassignedKarkuns: number
  }
}

export type ProductionPersonImportRow = {
  name: string
  gender: string
  mobile: string
  whatsapp?: string
  place?: string
  status?: string
  notes?: string
  area?: string
  address?: string
}
