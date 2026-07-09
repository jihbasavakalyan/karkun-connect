export type FirestoreMigrationSummary = {
  success: boolean
  migratedCollections: string[]
  error?: string
}
