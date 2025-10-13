// models/product/schema.ts
import { t } from 'elysia'

export const ProductSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  category: t.String(),
  quantity: t.Number(),
  price: t.Number(),
  categoryIds: t.Optional(t.Array(t.Number())),
})

export type Product = typeof ProductSchema.static