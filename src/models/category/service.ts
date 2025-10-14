import type { SupabaseClient } from '@supabase/supabase-js'
import type { CategoryInput, CategoryOutput } from './schema'
import { NotFoundError, UnauthorizedError, ValidationError } from '../../lib/errors'

export async function getAllCategories(supabase: SupabaseClient): Promise<CategoryOutput[]> {
  const { data, error } = await supabase.from('categories').select('*').order('id')
  if (error) throw error
  return data as CategoryOutput[]
}

export async function getCategoryById(supabase: SupabaseClient, id: number): Promise<CategoryOutput> {
  if (isNaN(id) || id <= 0) throw new ValidationError('Invalid category ID')
  
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).single()
  if (error) throw error
  if (!data) throw new NotFoundError('Category not found')
  return data as CategoryOutput
}

export async function createCategory(
  supabase: SupabaseClient, 
  category: CategoryInput
): Promise<CategoryOutput> {
  // ✅ Add this
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...category, owner_id: user.id })
    .select()
    .single()
  
  if (error) throw error
  return data as CategoryOutput
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: number,
  category: Partial<CategoryInput>
): Promise<CategoryOutput> {
  if (isNaN(id) || id <= 0) throw new ValidationError('Invalid category ID')

  const { data, error } = await supabase.from('categories').update(category).eq('id', id).select().single()
  if (error) throw error
  if (!data) throw new NotFoundError('Category not found')
  return data as CategoryOutput
}

export async function deleteCategory(supabase: SupabaseClient, id: number): Promise<void> {
  if (isNaN(id) || id <= 0) throw new ValidationError('Invalid category ID')

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
