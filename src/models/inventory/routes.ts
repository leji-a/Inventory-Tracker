// models/inventory/routes.ts
import { Elysia, t } from 'elysia'
import { SupabasePlugin } from '../../plugins/supabase'
import * as service from './service'
import { PeriodInputSchema, PeriodOutputSchema, ErrorSchema, RecordInputSchema, RecordOutputSchema, RecordWithProductSchema } from './schema'

export const InventoryRoutes = new Elysia({ prefix: '/inventory' })
  .use(SupabasePlugin)

  // Get all periods
  .get('/periods', async ({ supabase }) => {
    return await service.getAllPeriods(supabase)
  }, {
    response: {
      200: t.Array(PeriodOutputSchema),
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Create new period
  .post('/periods', async ({ supabase, body, set }) => {
    const result = await service.createPeriod(supabase, body)
    set.status = 201
    return result
  }, {
    body: PeriodInputSchema,
    response: {
      201: PeriodOutputSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Get active period
  .get('/periods/active', async ({ supabase }) => {
    return await service.getActivePeriod(supabase)
  }, {
    response: {
      200: PeriodOutputSchema,
      404: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Close a period - CHANGED :id to :periodId
  .post('/periods/:periodId/close', async ({ supabase, params: { periodId } }) => {
    return await service.closePeriod(supabase, Number(periodId))
  }, {
    response: {
      200: PeriodOutputSchema,
      404: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Add inventory record to a period
  .post('/periods/:periodId/records', async ({ supabase, params: { periodId }, body }) => {
    return await service.addInventoryRecord(supabase, Number(periodId), body)
  }, {
    body: RecordInputSchema,
    response: {
      200: RecordOutputSchema,
      400: ErrorSchema,
      404: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Get all records for a period
  .get('/periods/:periodId/records', async ({ supabase, params: { periodId } }) => {
    return await service.getRecordsForPeriod(supabase, Number(periodId))
  }, {
    response: {
      200: t.Array(RecordWithProductSchema),
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  .delete('/periods/:periodId/records/:productId', async ({ supabase, params: { periodId, productId }, set }) => {
    await service.deleteRecord(supabase, Number(periodId), Number(productId))
    set.status = 204
    return null
  }, {
    response: {
      204: t.Null(),
      400: ErrorSchema,
      404: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Get current inventory
  .get('/current', async ({ supabase }) => {
    return await service.getCurrentInventory(supabase)
  }, {
    response: {
      200: t.Object({
        period: t.Union([PeriodOutputSchema, t.Null()]),
        records: t.Array(RecordWithProductSchema)
      }),
      401: ErrorSchema,
      500: ErrorSchema
    }
  })

  // Get inventory history for a specific product
  .get('/products/:productId/history', async ({ supabase, params: { productId } }) => {
    return await service.getProductHistory(supabase, Number(productId))
  }, {
    response: {
      200: t.Object({
        product_id: t.Number(),
        product_name: t.String(),
        history: t.Array(t.Object({
          period_id: t.Number(),
          period_name: t.String(),
          period_date: t.String(),
          period_status: t.String(),
          quantity: t.Number(),
          counted_at: t.String(),
          notes: t.Union([t.String(), t.Null()])
        }))
      }),
      404: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema
    }
  })