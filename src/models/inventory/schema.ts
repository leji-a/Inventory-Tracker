// models/inventory/schema.ts
import { t } from 'elysia'

export const PeriodInputSchema = t.Object({
    name: t.String({ minLength: 1 }),
    start_date: t.String(), // "2025-10-29"
    notes: t.Optional(t.String()),
})

export const PeriodOutputSchema = t.Object({
    id: t.Number(),
    name: t.String(),
    start_date: t.String(),
    end_date: t.Union([t.String(), t.Null()]),
    status: t.String(),
    notes: t.Union([t.String(), t.Null()]),
    created_at: t.String(),
    updated_at: t.String(),
})

export const ErrorSchema = t.Object({
    error: t.String()
})

export const RecordInputSchema = t.Object({
  product_id: t.Number(),
  quantity: t.Number({ minimum: 0 }),
  notes: t.Optional(t.String()),
})

export const RecordOutputSchema = t.Object({
  id: t.Number(),
  product_id: t.Number(),
  period_id: t.Number(),
  quantity: t.Number(),
  counted_at: t.String(),
  notes: t.Union([t.String(), t.Null()]),
})

export const RecordWithProductSchema = t.Object({
  id: t.Number(),
  product_id: t.Number(),
  period_id: t.Number(),
  quantity: t.Number(),
  counted_at: t.String(),
  notes: t.Union([t.String(), t.Null()]),
  product: t.Object({
    id: t.Number(),
    name: t.String(),
    price: t.Number(),
  })
})