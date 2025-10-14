// models/product/routes.ts
import { Elysia, t } from 'elysia'
import { ProductInputSchema, ProductOutputSchema, ErrorSchema } from './schema'
import * as service from './service'
import { SupabasePlugin } from '../../plugins/supabase'
import { ValidationError } from '../../lib/errors'

export const ProductRoutes = new Elysia({ prefix: '/products' })
  .use(SupabasePlugin)

  .get('/', async ({ supabase }) => {
    return await service.getAllProducts(supabase)
  }, {
    response: {
      200: t.Array(ProductOutputSchema),
      500: ErrorSchema
    }
  })

  .get('/:id', async ({ supabase, params: { id } }) => {
    const productId = Number(id)
    if (isNaN(productId) || productId <= 0) {
      throw new ValidationError('Invalid product ID')
    }
    return await service.getProductById(supabase, productId)
  }, {
    response: {
      200: ProductOutputSchema,
      400: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })

  .post('/', async ({ supabase, body }) => {
    return await service.createProduct(supabase, body)
  }, {
    body: ProductInputSchema,
    response: {
      201: ProductOutputSchema,
      400: ErrorSchema,
      500: ErrorSchema
    }
  })

  .put('/:id', async ({ supabase, params: { id }, body }) => {
    const productId = Number(id)
    if (isNaN(productId) || productId <= 0) {
      throw new ValidationError('Invalid product ID')
    }
    return await service.updateProduct(supabase, productId, body)
  }, {
    body: t.Partial(ProductInputSchema), // ✅ All fields optional for update
    response: {
      200: ProductOutputSchema,
      400: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })
  .delete('/:id', async ({ supabase, params: { id } }) => {
    const productId = Number(id)
    if (isNaN(productId) || productId <= 0) {
      throw new Error('Invalid product ID')
    }
    await service.deleteProduct(supabase, productId)
    return // 204 No Content
  }, {
    response: {
      204: t.Undefined(),
      400: ErrorSchema,
      500: ErrorSchema
    }
  })
