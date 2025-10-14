// models/product/service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductInput, ProductOutput } from './schema'
import type { ProductWithCategories } from '../../types/types'
import { UnauthorizedError, NotFoundError, ValidationError } from '../../lib/errors'

function mapProduct(p: ProductWithCategories): ProductOutput {
  return {
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    categoryIds: p.product_categories?.map((pc) => pc.category.id) ?? [],
    categoryNames: p.product_categories?.map((pc) => pc.category.name) ?? [],
  }
}

export async function getAllProducts(supabase: SupabaseClient): Promise<ProductOutput[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories (
          id,
          name
        )
      )
    `)
    .order('id')

  if (error) throw error
  return (data as ProductWithCategories[]).map(mapProduct)
}

export async function getProductById(supabase: SupabaseClient, id: number): Promise<ProductOutput> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) throw new NotFoundError('Product not found')
  return mapProduct(data as ProductWithCategories)
}

export async function createProduct(
  supabase: SupabaseClient,
  product: ProductInput
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { categoryIds, ...productData } = product

  if (categoryIds?.length) {
    const { data: ownedCategories, error: catError } = await supabase
      .from('categories')
      .select('id')
      .in('id', categoryIds)
      .eq('owner_id', user.id)

    if (catError) throw catError

    if (ownedCategories.length !== categoryIds.length) {
      throw new ValidationError('One or more categories not found or unauthorized')
    }
  }

  const { data: inserted, error: productError } = await supabase
    .from('products')
    .insert({
      ...productData,
      owner_id: user.id
    })
    .select()
    .single()

  if (productError) throw productError

  if (categoryIds?.length) {
    const links = categoryIds.map((category_id) => ({
      product_id: inserted.id,
      category_id,
      owner_id: user.id
    }))

    const { error: linkError } = await supabase
      .from('product_categories')
      .insert(links)

    if (linkError) {
      await supabase.from('products').delete().eq('id', inserted.id)
      throw linkError
    }
  }

  return await getProductById(supabase, inserted.id)
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: number,
  product: Partial<ProductInput>
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { categoryIds, ...productData } = product

  if (Object.keys(productData).length === 0 && categoryIds === undefined) {
    return await getProductById(supabase, id)
  }

  if (Object.keys(productData).length > 0) {
    const { error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
  }

  if (categoryIds !== undefined) {
    if (categoryIds.length > 0) {
      const { data: ownedCategories, error: catError } = await supabase
        .from('categories')
        .select('id')
        .in('id', categoryIds)
        .eq('owner_id', user.id)

      if (catError) throw catError

      if (ownedCategories.length !== categoryIds.length) {
        throw new ValidationError('One or more categories not found or unauthorized')
      }
    }

    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id)

    if (deleteError) throw deleteError

    if (categoryIds.length > 0) {
      const links = categoryIds.map((category_id) => ({
        product_id: id,
        category_id,
        owner_id: user.id
      }))

      const { error: linkError } = await supabase
        .from('product_categories')
        .insert(links)

      if (linkError) throw linkError
    }
  }

  return await getProductById(supabase, id)
}

export async function deleteProduct(supabase: SupabaseClient, id: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}
