import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initializeRepositories } from '@/repositories/firestore/initialize'

async function bootstrap(): Promise<void> {
  await initializeRepositories()

  const { runProductionDataMigration } = await import('@/services/productionDataMigrationService')
  const { syncAllKarkunRegistryFromAssignments } = await import('@/services/assignmentService')

  runProductionDataMigration()
  syncAllKarkunRegistryFromAssignments()

  const { default: App } = await import('./App.tsx')
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('Root element not found')
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
