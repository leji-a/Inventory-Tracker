// models/product/routes.ts
import { Elysia } from 'elysia'
import { ProductSchema } from './schema'
import * as service from './service'
import { SupabasePlugin } from '../../plugins/supabase'


export const ProductRoutes = new Elysia({ prefix: '/products' })
  .use(SupabasePlugin)
  .get('/', async ({ supabase }) => service.getAllProducts(supabase))
  .get('/:id', async ({ supabase, params: { id } }) =>
    service.getProductById(supabase, Number(id))
  )
  .post('/', async ({ supabase, body }) => service.createProduct(supabase, body), {
    body: ProductSchema,
  })
  .put('/:id', async ({ supabase, params: { id }, body }) =>
    service.updateProduct(supabase, Number(id), body), { body: ProductSchema }
  )
  .delete('/:id', async ({ supabase, params: { id } }) =>
    service.deleteProduct(supabase, Number(id))
  )
