import { Elysia, t } from 'elysia'
import * as service from './service'
import { CategoryInputSchema, CategoryOutputSchema, ErrorSchema, PaginatedCategoriesSchema } from './schema'
import { SupabasePlugin } from '../../plugins/supabase'
import { ValidationError } from '../../lib/errors'

export const CategoryRoutes = new Elysia({ prefix: '/categories' })
  .use(SupabasePlugin)

  .get('/', async ({ supabase, query }) => {
    // Parse pagination params
    const page = query.page ? parseInt(query.page) : 1
    const limit = query.limit ? parseInt(query.limit) : 20

    if (isNaN(page) || page < 1) {
      throw new ValidationError('Page must be a positive number')
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100')
    }

    return await service.getAllCategories(supabase, { page, limit })
  }, {
    response: {
      200: PaginatedCategoriesSchema,
      400: ErrorSchema,
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
