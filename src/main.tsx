import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function runDeferredBootstrap(): Promise<void> {
  const { initializeRepositories } = await import('@/repositories/firestore/initialize')
  try {
    await initializeRepositories()
  } catch (error) {
    console.error('[bootstrap] repository initialization failed', error)
  }

  const { runProductionDataMigration } = await import('@/services/productionDataMigrationService')
  const { syncAllKarkunRegistryFromAssignments } = await import('@/services/assignmentService')

  runProductionDataMigration()
  syncAllKarkunRegistryFromAssignments()
}

function bootstrap(): void {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('Root element not found')
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  void runDeferredBootstrap()
}

bootstrap()
