import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null until .env.local is filled in (see .env.example)
export const supabase = url && anonKey ? createClient(url, anonKey) : null

// Pings the Auth health endpoint; used by the scaffold screen to prove the keys work.
export async function checkSupabase(): Promise<boolean> {
  if (!url || !anonKey) return false
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } })
    return res.ok
  } catch {
    return false
  }
}
