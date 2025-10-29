// models/inventory/csv-routes.ts
import { Elysia, t } from 'elysia'
import { SupabasePlugin } from '../../plugins/supabase'
import { ValidationError, UnauthorizedError, NotFoundError } from '../../lib/errors'

export const InventoryCSVRoutes = new Elysia({ prefix: '/inventory' })
  .use(SupabasePlugin)

  // ========== EXPORT CURRENT INVENTORY ==========
  .get('/export/current', async ({ supabase }) => {
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
      throw new NotFoundError('No active period found. Please create a period first.')
    }

    // Get inventory records with product details
    const { data: records, error } = await supabase
      .from('inventory_records')
      .select(`
        quantity,
        notes,
        product:products (
          id,
          name,
          price,
          product_categories (
            category:categories (
              name
            )
          )
        )
      `)
      .eq('period_id', period.id)
      .order('product_id')

    if (error) throw error

    // Convert to CSV format
    const csvRows = [
      `Period: ${period.name} (${period.start_date})`,
      '',
      'Product Name,Quantity,Price,Categories,Notes'
    ]

    for (const record of records || []) {
      const product = record.product as any

      const categories = product.product_categories
        ?.map((pc: any) => pc.category.name)
        .join(';') || ''

      const escapedName = product.name.replace(/"/g, '""')
      const escapedNotes = (record.notes || '').replace(/"/g, '""')

      csvRows.push(
        `"${escapedName}",${record.quantity},${product.price},"${categories}","${escapedNotes}"`
      )
    }

    const csv = csvRows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventory_${period.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  })

  // ========== EXPORT PRODUCTS CATALOG (WITHOUT QUANTITIES) ==========
  .get('/export/products', async ({ supabase }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new UnauthorizedError()

    // Get all products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        product_categories (
          category:categories (
            name
          )
        )
      `)
      .eq('owner_id', user.id)
      .order('id')

    if (error) throw error

    // Convert to CSV format
    const csvRows = [
      'Product Name,Price,Categories'
    ]

    for (const product of products || []) {
      const categories = product.product_categories
        .map((pc: any) => pc.category.name)
        .join(';')

      const escapedName = product.name.replace(/"/g, '""')

      csvRows.push(
        `"${escapedName}",${product.price},"${categories}"`
      )
    }

    const csv = csvRows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  })

  // ========== IMPORT PRODUCTS (CREATE NEW PRODUCTS) ==========
  .post('/import/products', async ({ supabase, body }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new UnauthorizedError()

    const csvText = body.csv.trim()
    const lines = csvText.split(/\r?\n/).filter(line => line.trim())

    if (lines.length < 2) {
      throw new ValidationError('CSV file is empty or has no data rows')
    }

    // Parse header
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

    const requiredHeaders = ['product name', 'price']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      throw new ValidationError(`Missing required columns: ${missingHeaders.join(', ')}`)
    }

    const nameIdx = headers.indexOf('product name')
    const priceIdx = headers.indexOf('price')
    const categoriesIdx = headers.indexOf('categories')

    const dataLines = lines.slice(1)

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Get existing product names
    const { data: existingProducts } = await supabase
      .from('products')
      .select('name')
      .eq('owner_id', user.id)

    const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase()) || [])
    const categoryCache = new Map<string, number>()

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i]
        const values = parseCSVLine(line)

        if (values.length < requiredHeaders.length) {
          throw new Error('Invalid CSV format: not enough columns')
        }

        const name = values[nameIdx]?.trim()
        const priceStr = values[priceIdx]?.trim()
        const categoriesStr = values[categoriesIdx]?.trim() || ''

        if (!name) {
          throw new Error('Product name is required')
        }

        // Check for duplicates
        if (existingNames.has(name.toLowerCase())) {
          results.skipped++
          results.errors.push(`Row ${i + 2}: Product "${name}" already exists (skipped)`)
          continue
        }

        const price = parseFloat(priceStr)
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price: "${priceStr}"`)
        }

        // Create product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name,
            price,
            // quantity: 0, // Default to 0
            owner_id: user.id
          })
          .select()
          .single()

        if (productError) throw productError

        existingNames.add(name.toLowerCase())

        // Handle categories
        if (categoriesStr) {
          const categoryNames = categoriesStr.split(';').map(c => c.trim()).filter(c => c)

          for (const categoryName of categoryNames) {
            let categoryId = categoryCache.get(categoryName.toLowerCase())

            if (!categoryId) {
              let { data: category } = await supabase
                .from('categories')
                .select('id')
                .eq('name', categoryName)
                .eq('owner_id', user.id)
                .maybeSingle()

              if (!category) {
                const { data: newCategory, error: catError } = await supabase
                  .from('categories')
                  .insert({ name: categoryName, owner_id: user.id })
                  .select()
                  .single()

                if (catError && catError.code === '23505') {
                  const { data: existingCat } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('name', categoryName)
                    .eq('owner_id', user.id)
                    .single()
                  category = existingCat
                } else if (catError) {
                  throw catError
                } else {
                  category = newCategory
                }
              }

              if (category) {
                categoryCache.set(categoryName.toLowerCase(), category.id)
                categoryId = category.id
              }
            }

            if (categoryId) {
              await supabase
                .from('product_categories')
                .insert({ product_id: product.id, category_id: categoryId })
            }
          }
        }

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Row ${i + 2}: ${error.message}`)
      }
    }

    return {
      message: `Import completed: ${results.success} created, ${results.failed} failed, ${results.skipped} skipped`,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      total: results.success + results.failed + results.skipped,
      errors: results.errors
    }
  }, {
    body: t.Object({
      csv: t.String({ minLength: 1 })
    }),
    response: {
      200: t.Object({
        message: t.String(),
        success: t.Number(),
        failed: t.Number(),
        skipped: t.Number(),
        total: t.Number(),
        errors: t.Array(t.String())
      })
    }
  })

  // ========== IMPORT INVENTORY COUNTS (UPDATE QUANTITIES IN ACTIVE PERIOD) ==========
  .post('/import/inventory', async ({ supabase, body }) => {
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
      throw new NotFoundError('No active period found. Please create a period first.')
    }

    const csvText = body.csv.trim()
    const lines = csvText.split(/\r?\n/).filter(line => line.trim())

    // Skip metadata rows (lines starting with "Period:")
    let startIdx = 0
    while (startIdx < lines.length && !lines[startIdx].toLowerCase().includes('product name')) {
      startIdx++
    }

    if (startIdx >= lines.length) {
      throw new ValidationError('Could not find header row with "Product Name"')
    }

    const headerLine = lines[startIdx]
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

    const requiredHeaders = ['product name', 'quantity']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      throw new ValidationError(`Missing required columns: ${missingHeaders.join(', ')}`)
    }

    const nameIdx = headers.indexOf('product name')
    const quantityIdx = headers.indexOf('quantity')
    const notesIdx = headers.indexOf('notes')

    const dataLines = lines.slice(startIdx + 1)

    const results = {
      success: 0,
      failed: 0,
      notFound: 0,
      errors: [] as string[]
    }

    // Get all user's products for lookup
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .eq('owner_id', user.id)

    const productMap = new Map(
      products?.map(p => [p.name.toLowerCase(), p.id]) || []
    )

    const recordsToUpsert = []

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i]
        const values = parseCSVLine(line)

        if (values.length < requiredHeaders.length) {
          throw new Error('Invalid CSV format: not enough columns')
        }

        const name = values[nameIdx]?.trim()
        const quantityStr = values[quantityIdx]?.trim()
        const notes = notesIdx >= 0 ? values[notesIdx]?.trim() : undefined

        if (!name) {
          throw new Error('Product name is required')
        }

        const quantity = parseInt(quantityStr)
        if (isNaN(quantity) || quantity < 0) {
          throw new Error(`Invalid quantity: "${quantityStr}"`)
        }

        // Find product by name
        const productId = productMap.get(name.toLowerCase())
        if (!productId) {
          results.notFound++
          results.errors.push(`Row ${i + startIdx + 2}: Product "${name}" not found (skipped)`)
          continue
        }

        recordsToUpsert.push({
          period_id: period.id,
          product_id: productId,
          quantity,
          notes,
          counted_at: new Date().toISOString()
        })

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Row ${i + startIdx + 2}: ${error.message}`)
      }
    }

    // Batch upsert all records
    if (recordsToUpsert.length > 0) {
      const { error } = await supabase
        .from('inventory_records')
        .upsert(recordsToUpsert, {
          onConflict: 'product_id,period_id'
        })

      if (error) throw error
    }

    return {
      message: `Inventory import completed: ${results.success} updated, ${results.failed} failed, ${results.notFound} not found`,
      period: period.name,
      success: results.success,
      failed: results.failed,
      notFound: results.notFound,
      total: results.success + results.failed + results.notFound,
      errors: results.errors
    }
  }, {
    body: t.Object({
      csv: t.String({ minLength: 1 })
    }),
    response: {
      200: t.Object({
        message: t.String(),
        period: t.String(),
        success: t.Number(),
        failed: t.Number(),
        notFound: t.Number(),
        total: t.Number(),
        errors: t.Array(t.String())
      })
    }
  })

// Enhanced CSV parser
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }

    i++
  }

  result.push(current)
  return result
}