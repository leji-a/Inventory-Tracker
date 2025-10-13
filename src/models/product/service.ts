// models/product/service.ts
import type { Product } from './schema'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductWithCategories } from '../../types/types'

function mapProduct(p: ProductWithCategories) {
  return {
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    categoryIds: p.product_categories?.map((pc) => pc.category.id) ?? [],
    categoryNames: p.product_categories?.map((pc) => pc.category.name) ?? [],
  }
}

export async function getAllProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories ( id, name )
      )
    `)

  if (error) throw error
  return (data as ProductWithCategories[]).map(mapProduct)
}

export async function getProductById(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories ( id, name )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return mapProduct(data as ProductWithCategories)
}

export async function createProduct(supabase: SupabaseClient, product: Omit<Product, 'id'>) {
  const { categoryIds, ...productData } = product

  const { data: inserted, error: productError } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (productError) throw productError

  if (categoryIds?.length) {
    const links = categoryIds.map((category_id) => ({
      product_id: inserted.id,
      category_id,
    }))
    const { error: linkError } = await supabase.from('product_categories').insert(links)
    if (linkError) throw linkError
  }

  return inserted
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: number,
  product: Partial<Product>
) {
  const { categoryIds, ...productData } = product

  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (categoryIds) {
    await supabase.from('product_categories').delete().eq('product_id', id)
    const links = categoryIds.map((category_id) => ({ product_id: id, category_id }))
    const { error: linkError } = await supabase.from('product_categories').insert(links)
    if (linkError) throw linkError
  }

  return data
}

export async function deleteProduct(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  return true
}
