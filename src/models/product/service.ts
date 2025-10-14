// models/product/service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductInput, ProductOutput } from './schema'
import type { ProductWithCategories, PaginatedResponse, PaginationParams } from '../../types/types'
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

export async function getAllProducts(
  supabase: SupabaseClient,
  { page = 1, limit = 20 }: PaginationParams = {}
): Promise<PaginatedResponse<ProductOutput>> {
  // Validate pagination params
  if (page < 1) page = 1
  if (limit < 1) limit = 20
  if (limit > 100) limit = 100 // Max 100 items per page

  const from = (page - 1) * limit
  const to = from + limit - 1

  // Get total count
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  if (countError) throw countError

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  // Get paginated data
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
    .range(from, to)

  if (error) throw error

  return {
    data: (data as ProductWithCategories[]).map(mapProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  }
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
