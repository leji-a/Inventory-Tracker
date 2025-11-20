// models/inventory/service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { NotFoundError, UnauthorizedError } from '../../lib/errors'

export async function getAllPeriods(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data, error } = await supabase
    .from('inventory_periods')
    .select('*')
    .eq('owner_id', user.id)
    .order('start_date', { ascending: false })

  if (error) throw error
  return data
}

export async function createPeriod(
  supabase: SupabaseClient,
  period: {
    name: string
    start_date: string
    notes?: string
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Close any active periods first (only one active at a time)
  await supabase
    .from('inventory_periods')
    .update({ status: 'closed', end_date: new Date().toISOString().split('T')[0] })
    .eq('owner_id', user.id)
    .eq('status', 'active')

  // Create new active period
  const { data, error } = await supabase
    .from('inventory_periods')
    .insert({
      ...period,
      owner_id: user.id,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw error
  return data


}

export async function getActivePeriod(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data, error } = await supabase
    .from('inventory_periods')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NotFoundError('No active period found')

  return data
}

export async function addInventoryRecord(
  supabase: SupabaseClient,
  periodId: number,
  record: {
    product_id: number
    quantity: number
    notes?: string
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify period exists and is active
  const { data: period } = await supabase
    .from('inventory_periods')
    .select('id, status')
    .eq('id', periodId)
    .eq('owner_id', user.id)
    .single()

  if (!period) throw new NotFoundError('Period not found')

  // Upsert record (insert or update if exists)
  const { data, error } = await supabase
    .from('inventory_records')
    .upsert({
      period_id: periodId,
      product_id: record.product_id,
      quantity: record.quantity,
      notes: record.notes,
      counted_at: new Date().toISOString()
    }, {
      onConflict: 'product_id,period_id'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getRecordsForPeriod(
  supabase: SupabaseClient,
  periodId: number
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data, error } = await supabase
    .from('inventory_records')
    .select(`
      *,
      product:products (
        id,
        name,
        price
      )
    `)
    .eq('period_id', periodId)
    .order('product_id')

  if (error) throw error
  return data
}

export async function getCurrentInventory(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Get active period
  const { data: period } = await supabase
    .from('inventory_periods')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!period) {
    return { period: null, records: [] }
  }

  // Get all records for active period
  const { data: records, error } = await supabase
    .from('inventory_records')
    .select(`
      *,
      product:products (
        id,
        name,
        price
      )
    `)
    .eq('period_id', period.id)
    .order('product_id')

  if (error) throw error

  return {
    period,
    records: records || []
  }
}

export async function closePeriod(supabase: SupabaseClient, periodId: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data, error } = await supabase
    .from('inventory_periods')
    .update({ 
      status: 'closed',
      end_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', periodId)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new NotFoundError('Period not found')

  return data
}

export async function getProductHistory(
  supabase: SupabaseClient,
  productId: number
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Verify product belongs to user
  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .eq('owner_id', user.id)
    .single()

  if (!product) throw new NotFoundError('Product not found')

  // Get all inventory records for this product across all periods
  const { data, error } = await supabase
    .from('inventory_records')
    .select(`
      quantity,
      counted_at,
      notes,
      period:inventory_periods (
        id,
        name,
        start_date,
        end_date,
        status
      )
    `)
    .eq('product_id', productId)
    .order('counted_at', { ascending: false })

  if (error) throw error

  return {
    product_id: productId,
    product_name: product.name,
    history: data.map((record: any) => ({
      period_id: record.period.id,
      period_name: record.period.name,
      period_date: record.period.start_date,
      period_status: record.period.status,
      quantity: record.quantity,
      counted_at: record.counted_at,
      notes: record.notes
    }))
  }
}

export async function deleteRecord(
  supabase: SupabaseClient,
  periodId: number,
  productId: number
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  // Check if the record exists and belongs to the user via period owner
  const { data: record } = await supabase
    .from('inventory_records')
    .select(`
      *,
      period:inventory_periods (
        owner_id
      )
    `)
    .eq('period_id', periodId)
    .eq('product_id', productId)
    .single()

  if (!record) throw new NotFoundError('Record not found')
  if (record.period.owner_id !== user.id) throw new UnauthorizedError()

  // Delete record
  const { error } = await supabase
    .from('inventory_records')
    .delete()
    .eq('period_id', periodId)
    .eq('product_id', productId)

  if (error) throw error
}
