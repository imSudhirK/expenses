import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'

type Access = 'loading' | 'allowed' | 'denied'

interface AuthState {
  user: User | null
  access: Access
  signIn: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function checkAllowlist(user: User): Promise<boolean> {
  if (!user.email) return false
  try {
    const snap = await getDoc(doc(db, 'allowlist', user.email))
    return snap.exists()
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [access, setAccess] = useState<Access>('loading')

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setAccess('loading')
        setUser(u)
        if (!u) {
          setAccess('denied')
          return
        }
        const ok = await checkAllowlist(u)
        if (ok) {
          // Upsert a small profile doc (handy to see who uses the app in the console).
          await setDoc(
            doc(db, 'users', u.uid),
            { displayName: u.displayName, email: u.email, lastLoginAt: serverTimestamp() },
            { merge: true },
          ).catch(() => {})
        }
        setAccess(ok ? 'allowed' : 'denied')
      }),
    [],
  )

  const value: AuthState = {
    user,
    access,
    signIn: async () => {
      await signInWithPopup(auth, googleProvider)
    },
    logOut: () => signOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
