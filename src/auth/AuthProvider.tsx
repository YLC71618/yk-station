import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '../lib/supabase'

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn'
  session: Session | null
  profile: Profile | null
  /** Set when someone signed in whose email has no profile (not Yoyo or Kyle). */
  notAllowed: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notAllowed, setNotAllowed] = useState(false)

  // The session is kept in localStorage by supabase-js, so each phone signs in once.
  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    setNotAllowed(false)
    client
      .from('profiles')
      .select('id, role, display_name, lang')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setProfile(data as Profile)
        } else {
          setNotAllowed(true)
          client.auth.signOut()
        }
      })
    return () => {
      cancelled = true
    }
  }, [client, userId])

  const status: AuthState['status'] =
    session === undefined || (session && !profile && !notAllowed) ? 'loading' : session && profile ? 'signedIn' : 'signedOut'

  const value: AuthState = {
    status,
    session: session ?? null,
    profile,
    notAllowed,
    signOut: async () => {
      await client.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
