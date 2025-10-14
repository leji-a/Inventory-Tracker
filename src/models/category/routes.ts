import { Elysia, t } from 'elysia'
import * as service from './service'
import { CategoryInputSchema, CategoryOutputSchema, ErrorSchema } from './schema'
import { SupabasePlugin } from '../../plugins/supabase'

export const CategoryRoutes = new Elysia({ prefix: '/categories' })
  .use(SupabasePlugin)

  .get('/', async ({ supabase }) => service.getAllCategories(supabase), {
    response: {
      200: t.Array(CategoryOutputSchema),
      500: ErrorSchema
    }
  })

  .get('/:id', async ({ supabase, params: { id } }) => {
    return await service.getCategoryById(supabase, Number(id))
  }, {
    response: {
      200: CategoryOutputSchema,
      400: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })

  .post('/', async ({ supabase, body }) => {
    return await service.createCategory(supabase, body)
  }, {
    body: CategoryInputSchema,
    response: {
      201: CategoryOutputSchema,
      400: ErrorSchema,
      500: ErrorSchema
    }
  })

  .put('/:id', async ({ supabase, params: { id }, body }) => {
    return await service.updateCategory(supabase, Number(id), body)
  }, {
    body: CategoryInputSchema,
    response: {
      200: CategoryOutputSchema,
      400: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })

  .delete('/:id', async ({ supabase, params: { id } }) => {
    await service.deleteCategory(supabase, Number(id))
    return
  }, {
    response: {
      204: t.Undefined(),
      400: ErrorSchema,
      500: ErrorSchema
    }
  })
