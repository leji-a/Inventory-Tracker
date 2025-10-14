// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export function createSupabaseClient(token?: string) {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })
  return client
}
