import { Elysia } from 'elysia'
import { createSupabaseClient } from '../lib/supabase'

export const SupabasePlugin = (app: Elysia) =>
  app.derive(({ request }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    return {
      supabase: createSupabaseClient(token)
    }
  })