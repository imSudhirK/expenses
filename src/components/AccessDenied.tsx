import { useAuth } from '../auth/AuthProvider'

export default function AccessDenied() {
  const { user, logOut } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">Access not granted</h1>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{user?.email}</span> isn't on the invite list yet. Ask the
          admin to add you.
        </p>
        <button onClick={logOut} className="btn-secondary mt-6 w-full">
          Sign out
        </button>
      </div>
    </div>
  )
}
