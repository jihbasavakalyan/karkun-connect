import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { traceRegistryStage } from '@/lib/registryHydrationTrace'

async function runDeferredBootstrap(): Promise<void> {
  traceRegistryStage('1_before_initializeRepositories')

  const { initializeRepositories } = await import('@/repositories/firestore/initialize')
  try {
    await initializeRepositories()
  } catch (error) {
    console.error('[bootstrap] repository initialization failed', error)
  }
  traceRegistryStage('2_after_initializeRepositories')

  const { runProductionDataMigration, getProductionMigrationCompletedFlag } = await import(
    '@/services/productionDataMigrationService'
  )
  const { setRegistryTraceMigrationCompleted } = await import('@/lib/registryHydrationTrace')

  runProductionDataMigration()
  setRegistryTraceMigrationCompleted(getProductionMigrationCompletedFlag())
  traceRegistryStage('5_after_runProductionDataMigration', {
    migrationCompleted: getProductionMigrationCompletedFlag(),
  })
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
