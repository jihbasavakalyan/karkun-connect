import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { syncAllKarkunRegistryFromAssignments } from '@/services/assignmentService'

runProductionDataMigration()
syncAllKarkunRegistryFromAssignments()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
