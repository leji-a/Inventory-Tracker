// models/category/schema.ts
import { t } from 'elysia'

// For requests (create/update)
export const CategoryInputSchema = t.Object({
  name: t.String({ minimum: 1}),
  description: t.Optional(t.String()),
})

// For responses
export const CategoryOutputSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.Optional(t.String()),
})

export const ErrorSchema = t.Object({
  error: t.String()
})

export type CategoryInput = typeof CategoryInputSchema.static
export type CategoryOutput = typeof CategoryOutputSchema.static
