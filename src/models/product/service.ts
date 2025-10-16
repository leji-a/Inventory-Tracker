// models/product/service.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductInput, ProductOutput } from "./schema";
import type {
  ProductWithCategories,
  PaginatedResponse,
  PaginationParams,
} from "../../types/types";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";

function mapProduct(p: ProductWithCategories): ProductOutput {
  return {
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    price: p.price,
    categoryIds: p.product_categories?.map((pc) => pc.category.id) ?? [],
    categoryNames: p.product_categories?.map((pc) => pc.category.name) ?? [],
    images: p.product_images?.map(img => ({
      id: img.id,
      image_url: img.image_url,
      display_order: img.display_order
    })).sort((a, b) => a.display_order - b.display_order) ?? [], 
  }
}

export async function getAllProducts(
  supabase: SupabaseClient,
  { page = 1, limit = 20 }: PaginationParams = {}
): Promise<PaginatedResponse<ProductOutput>> {
  if (page < 1) page = 1
  if (limit < 1) limit = 20
  if (limit > 100) limit = 100

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  if (countError) throw countError

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories (
          id,
          name
        )
      ),
      product_images (
        id,
        image_url,
        display_order
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


export async function getProductById(
  supabase: SupabaseClient, 
  id: number
): Promise<ProductOutput> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        category: categories (
          id,
          name
        )
      ),
      product_images (
        id,
        image_url,
        display_order
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
  product: ProductInput,
): Promise<ProductOutput> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const { categoryIds, ...productData } = product;

  if (categoryIds?.length) {
    const { data: ownedCategories, error: catError } = await supabase
      .from("categories")
      .select("id")
      .in("id", categoryIds)
      .eq("owner_id", user.id);

    if (catError) throw catError;

    if (ownedCategories.length !== categoryIds.length) {
      throw new ValidationError(
        "One or more categories not found or unauthorized",
      );
    }
  }

  const { data: inserted, error: productError } = await supabase
    .from("products")
    .insert({
      ...productData,
      owner_id: user.id,
    })
    .select()
    .single();

  if (productError) throw productError;

  if (categoryIds?.length) {
    const links = categoryIds.map((category_id) => ({
      product_id: inserted.id,
      category_id,
    }));

    const { error: linkError } = await supabase
      .from("product_categories")
      .insert(links);

    if (linkError) {
      await supabase.from("products").delete().eq("id", inserted.id);
      throw linkError;
    }
  }

  return await getProductById(supabase, inserted.id);
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: number,
  product: Partial<ProductInput>,
): Promise<ProductOutput> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const { categoryIds, ...productData } = product;

  if (Object.keys(productData).length === 0 && categoryIds === undefined) {
    return await getProductById(supabase, id);
  }

  if (Object.keys(productData).length > 0) {
    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
  }

  if (categoryIds !== undefined) {
    if (categoryIds.length > 0) {
      const { data: ownedCategories, error: catError } = await supabase
        .from("categories")
        .select("id")
        .in("id", categoryIds)
        .eq("owner_id", user.id);

      if (catError) throw catError;

      if (ownedCategories.length !== categoryIds.length) {
        throw new ValidationError(
          "One or more categories not found or unauthorized",
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", id);

    if (deleteError) throw deleteError;

    if (categoryIds.length > 0) {
      const links = categoryIds.map((category_id) => ({
        product_id: id,
        category_id,
      }));

      const { error: linkError } = await supabase
        .from("product_categories")
        .insert(links);

      if (linkError) throw linkError;
    }
  }

  return await getProductById(supabase, id);
}

export async function deleteProduct(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw error;
}

export async function addProductImage(
  supabase: SupabaseClient,
  productId: number,
  file: File
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify product exists and belongs to user
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError) throw fetchError
  if (!product) throw new NotFoundError('Product not found')

  // Check image limit (e.g., max 10 images)
  const { count } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)

  if (count && count >= 10) {
    throw new ValidationError('Maximum 10 images per product')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)

  // Get next display_order (highest + 1)
  const { data: lastImage } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('product_id', productId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = lastImage ? lastImage.display_order + 1 : 0

  // Insert into product_images
  const { error: insertError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      image_url: publicUrl,
      display_order: nextOrder
    })

  if (insertError) throw insertError

  return await getProductById(supabase, productId)
}

// Delete specific image
export async function deleteProductImage(
  supabase: SupabaseClient,
  productId: number,
  imageId: number
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify product belongs to user
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError) throw fetchError
  if (!product) throw new NotFoundError('Product not found')

  // Get image details
  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .select('image_url, display_order')
    .eq('id', imageId)
    .eq('product_id', productId)
    .single()

  if (imageError) throw imageError
  if (!image) throw new NotFoundError('Image not found')

  // Delete from storage
  const filePath = image.image_url.split('/').slice(-2).join('/')
  await supabase.storage
    .from('product-images')
    .remove([filePath])

  // Delete from database
  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)

  if (deleteError) throw deleteError

  // Reorder remaining images to fill the gap
  const { data: remainingImages } = await supabase
    .from('product_images')
    .select('id, display_order')
    .eq('product_id', productId)
    .gt('display_order', image.display_order)
    .order('display_order')

  if (remainingImages && remainingImages.length > 0) {
    for (const img of remainingImages) {
      await supabase
        .from('product_images')
        .update({ display_order: img.display_order - 1 })
        .eq('id', img.id)
    }
  }

  return await getProductById(supabase, productId)
}

// Reorder images (drag & drop)
export async function reorderProductImages(
  supabase: SupabaseClient,
  productId: number,
  imageOrders: { id: number; display_order: number }[]
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify product belongs to user
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError) throw fetchError
  if (!product) throw new NotFoundError('Product not found')

  // Update each image's display_order
  for (const { id, display_order } of imageOrders) {
    const { error } = await supabase
      .from('product_images')
      .update({ display_order })
      .eq('id', id)
      .eq('product_id', productId)

    if (error) throw error
  }

  return await getProductById(supabase, productId)
}

export async function addProductImageFromUrl(
  supabase: SupabaseClient,
  productId: number,
  imageUrl: string
): Promise<ProductOutput> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify product exists and belongs to user
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError) throw fetchError
  if (!product) throw new NotFoundError('Product not found')

  // Validate URL format
  try {
    new URL(imageUrl)
  } catch {
    throw new ValidationError('Invalid image URL')
  }

  // Check image limit
  const { count } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)

  if (count && count >= 10) {
    throw new ValidationError('Maximum 10 images per product')
  }

  // Get next display_order
  const { data: lastImage } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('product_id', productId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = lastImage ? lastImage.display_order + 1 : 0

  // Insert image URL
  const { error: insertError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      image_url: imageUrl,
      display_order: nextOrder
    })

  if (insertError) throw insertError

  return await getProductById(supabase, productId)
}