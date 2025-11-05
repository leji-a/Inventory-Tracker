// product/schema.ts
import { t } from "elysia";

export const ProductImageSchema = t.Object({
  id: t.Number(),
  image_url: t.String(),
  display_order: t.Number(),
});

// For incoming requests (create/update)
export const ProductInputSchema = t.Object({
  name: t.String({ minimum: 1 }),
  quantity: t.Optional(t.Number({ minimum: 0 })),
  price: t.Number({ minimum: 0.01 }),
  categoryIds: t.Optional(t.Array(t.Number())),
});

// For responses from DB
export const ProductOutputSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  quantity: t.Optional(t.Number()),
  price: t.Number(),
  categoryIds: t.Array(t.Number()),
  categoryNames: t.Array(t.String()),
  created_at: t.Optional(t.String()),
  images: t.Array(ProductImageSchema),
});

export const PaginationSchema = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
  hasNextPage: t.Boolean(),
  hasPrevPage: t.Boolean(),
});

export const PaginatedProductsSchema = t.Object({
  data: t.Array(ProductOutputSchema),
  pagination: PaginationSchema,
});

export const ErrorSchema = t.Object({
  error: t.String(),
});

export type ProductInput = typeof ProductInputSchema.static;
export type ProductOutput = typeof ProductOutputSchema.static;
export type ProductImage = typeof ProductImageSchema.static;

