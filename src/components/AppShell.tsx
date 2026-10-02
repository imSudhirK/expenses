import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from '../auth/AuthProvider'
import AiAssistant from './AiAssistant'
import BudgetsPage from './BudgetsPage'
import DashboardPage from './DashboardPage'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', title: 'Expense Tracker' },
  { id: 'budgets', label: 'Budgets', title: 'Budgets' },
] as const
type TabId = (typeof TABS)[number]['id']

const readHash = (): TabId => (location.hash === '#/budgets' ? 'budgets' : 'dashboard')

/** Active tab stored in the URL hash, so refresh and back/forward work without a router. */
function useHashTab() {
  const [tab, setTab] = useState<TabId>(readHash)
  useEffect(() => {
    const onChange = () => setTab(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return tab
}

export default function AppShell({ user }: { user: User }) {
  const { logOut } = useAuth()
  const tab = useHashTab()
  const active = TABS.find((t) => t.id === tab)!

  useEffect(() => {
    document.title = active.title
  }, [active])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">₹</div>
            <nav className="flex gap-1" aria-label="Main">
              {TABS.map((t) => (
                <a
                  key={t.id}
                  href={`#/${t.id}`}
                  aria-current={t.id === tab ? 'page' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    t.id === tab ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {user.photoURL && (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
            )}
            <span className="hidden text-sm text-slate-600 sm:inline">{user.displayName ?? user.email}</span>
            <button onClick={logOut} className="btn-ghost">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pt-6">
        <h1 className="mb-4 text-2xl font-semibold">{active.title}</h1>
        {tab === 'dashboard' ? <DashboardPage uid={user.uid} /> : <BudgetsPage uid={user.uid} />}
      </main>

      <AiAssistant uid={user.uid} />
    </div>
  )
}
