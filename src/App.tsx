import { useAuth } from './auth/AuthProvider'
import LoginPage from './components/LoginPage'
import AccessDenied from './components/AccessDenied'
import AppShell from './components/AppShell'

export default function App() {
  const { user, access } = useAuth()

  if (access === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }
  if (!user) return <LoginPage />
  if (access === 'denied') return <AccessDenied />
  return <AppShell user={user} />
}
