import { AuthProvider } from '@/providers/AuthProvider'
import { RuntimeProvider } from '@/runtime/bootstrap'
import { AppRouter } from '@/routes/AppRouter'

function App() {
  return (
    <AuthProvider>
      <RuntimeProvider>
        <AppRouter />
      </RuntimeProvider>
    </AuthProvider>
  )
}

export default App
