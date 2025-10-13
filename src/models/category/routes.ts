// models/category/routes.ts
import { Elysia } from 'elysia'
import * as service from './service'
import { CategorySchema } from './schema'
import { SupabasePlugin } from '../../plugins/supabase'

export const CategoryRoutes = new Elysia({ prefix: '/categories' })
  .use(SupabasePlugin)
  .get('/', async ({ supabase }) => service.getAllCategories(supabase))
  .get('/:id', async ({ supabase, params: { id } }) =>
    service.getCategoryById(supabase, Number(id))
  )
  .post('/', async ({ supabase, body }) => service.createCategory(supabase, body), {
    body: CategorySchema,
  })
  .put('/:id', async ({ supabase, params: { id }, body }) =>
    service.updateCategory(supabase, Number(id), body), { body: CategorySchema }
  )
  .delete('/:id', async ({ supabase, params: { id } }) =>
    service.deleteCategory(supabase, Number(id))
  )
