// models/category/service.ts
import type { Category } from './schema'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAllCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('categories').select('*').order('id')
  if (error) throw error
  return data
}

export async function getCategoryById(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCategory(supabase: SupabaseClient, category: Omit<Category, 'id'>) {
  const { data, error } = await supabase.from('categories').insert(category).select().single()
  if (error) throw error
  return data
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: number,
  category: Partial<Category>
) {
  const { data, error } = await supabase.from('categories').update(category).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategory(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
  return true
}
