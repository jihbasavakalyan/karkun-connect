import { StartupErrorBoundary } from '@/components/ux/StartupErrorBoundary'
import { AuthProvider } from '@/providers/AuthProvider'
import { RuntimeProvider } from '@/runtime/bootstrap'
import { AppRouter } from '@/routes/AppRouter'
import { shouldMountPublicRegistrationApp } from '@/lib/publicRegistration/host'
import { PublicRegistrationApp } from '@/pages/public/TrainingRegistrationPage'

function App() {
  if (shouldMountPublicRegistrationApp()) {
    return (
      <StartupErrorBoundary>
        <PublicRegistrationApp />
      </StartupErrorBoundary>
    )
  }

  return (
    <AuthProvider>
      <RuntimeProvider>
        <StartupErrorBoundary>
          <AppRouter />
        </StartupErrorBoundary>
      </RuntimeProvider>
    </AuthProvider>
  )
}

export default App
