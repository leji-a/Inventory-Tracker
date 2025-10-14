// models/category/schema.ts
import { t } from 'elysia'

// For requests (create/update)
export const CategoryInputSchema = t.Object({
  name: t.String({ minimum: 1 }),
  description: t.Optional(t.String()),
})

// For responses
export const CategoryOutputSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.Optional(t.String()),
})

export const PaginationSchema = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
  hasNextPage: t.Boolean(),
  hasPrevPage: t.Boolean(),
})

export const PaginatedCategoriesSchema = t.Object({
  data: t.Array(CategoryOutputSchema),
  pagination: PaginationSchema,
})

export const ErrorSchema = t.Object({
  error: t.String()
})

export type CategoryInput = typeof CategoryInputSchema.static
export type CategoryOutput = typeof CategoryOutputSchema.static
