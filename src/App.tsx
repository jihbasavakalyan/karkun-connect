import { StartupErrorBoundary } from '@/components/ux/StartupErrorBoundary'
import { PwaRuntimeChrome } from '@/components/pwa/PwaRuntimeChrome'
import { AuthProvider } from '@/providers/AuthProvider'
import { RuntimeProvider } from '@/runtime/bootstrap'
import { AppRouter } from '@/routes/AppRouter'

function App() {
  return (
    <AuthProvider>
      <RuntimeProvider>
        <StartupErrorBoundary>
          <AppRouter />
          <PwaRuntimeChrome />
        </StartupErrorBoundary>
      </RuntimeProvider>
    </AuthProvider>
  )
}

export default App
