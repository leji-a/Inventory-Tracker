// models/category/schema.ts
import { t } from 'elysia'

export const CategorySchema = t.Object({
  id: t.Optional(t.Number()),
  name: t.String(),
  description: t.Optional(t.String()),
})

export type Category = typeof CategorySchema.static
