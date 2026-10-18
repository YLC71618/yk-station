import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null until .env.local is filled in (see .env.example)
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export type Role = 'yoyo' | 'kyle'

export type Profile = {
  id: string
  role: Role
  display_name: string
  lang: 'zh-Hant' | 'en-GB'
}
