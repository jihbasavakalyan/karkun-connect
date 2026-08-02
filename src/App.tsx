import { StartupErrorBoundary } from '@/components/ux/StartupErrorBoundary'
import { AuthProvider } from '@/providers/AuthProvider'
import { RuntimeProvider } from '@/runtime/bootstrap'
import { AppRouter } from '@/routes/AppRouter'

function App() {
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
