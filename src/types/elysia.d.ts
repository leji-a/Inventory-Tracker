import type { SupabaseClient } from '@supabase/supabase-js'

declare module 'elysia' {
  interface Context {
    supabase: SupabaseClient
  }
}