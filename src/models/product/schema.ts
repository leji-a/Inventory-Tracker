// product/schema.ts
import { t } from 'elysia'

// For incoming requests (create/update)
export const ProductInputSchema = t.Object({
  name: t.String({ minimum: 1}),
  quantity: t.Number({ minimum: 0}),
  price: t.Number({ minimum: 0.01 }),
  categoryIds: t.Optional(t.Array(t.Number())),
});
// For responses from DB 
export const ProductOutputSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  quantity: t.Number(),
  price: t.Number(),
  categoryIds: t.Array(t.Number()),
  categoryNames: t.Array(t.String()),
  created_at: t.Optional(t.String()),
});

export const ErrorSchema = t.Object({
  error: t.String()
})

export type ProductInput = typeof ProductInputSchema.static;
export type ProductOutput = typeof ProductOutputSchema.static;