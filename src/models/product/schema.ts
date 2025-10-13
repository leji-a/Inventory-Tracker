import { t } from 'elysia'

// Define the Elysia validator schema
export const ProductSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  category: t.String(),
  quantity: t.Number(),
  price: t.Number(),
  categoryIds: t.Optional(t.Array(t.Number())),
})

// Optional: export a TypeScript type for strong typing
export type Product = typeof ProductSchema.static