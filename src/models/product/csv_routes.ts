// models/product/csv_routes.ts
import { Elysia, t } from 'elysia'
import { SupabasePlugin } from '../../plugins/supabase'
import { ValidationError, UnauthorizedError } from '../../lib/errors'

export const ProductCSVRoutes = new Elysia({ prefix: '/products' })
    .use(SupabasePlugin)

    // Export products to CSV
    .get('/export', async ({ supabase }) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new UnauthorizedError()

        // Get user's products with categories and images
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id,
                name,
                quantity,
                price,
                created_at,
                product_categories (
                    category:categories (
                        name
                    )
                ),
                product_images (
                    image_url,
                    display_order
                )
            `)
            .eq('owner_id', user.id)
            .order('id')

        if (error) throw error

        // Convert to CSV format
        const csvRows = [
            // Header row
            'Name,Quantity,Price,Categories,Images,Created At'
        ]

        for (const product of products || []) {
            const categories = product.product_categories
                .map((pc: any) => pc.category.name)
                .join(';')
            
            // Sort images by display_order and join URLs
            const images = product.product_images
                ?.sort((a: any, b: any) => a.display_order - b.display_order)
                .map((img: any) => img.image_url)
                .join(';') || ''

            // Escape quotes in product name
            const escapedName = product.name.replace(/"/g, '""')
            const createdAt = new Date(product.created_at).toISOString().split('T')[0]

            csvRows.push(
                `"${escapedName}",${product.quantity},${product.price},"${categories}","${images}",${createdAt}`
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

    // Import products from CSV (with validation and batching)
    .post('/import', async ({ supabase, body }) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new UnauthorizedError()

        const csvText = body.csv.trim()
        const lines = csvText.split(/\r?\n/).filter(line => line.trim())

        if (lines.length < 2) {
            throw new ValidationError('CSV file is empty or has no data rows')
        }

        // Parse and validate header
        const headerLine = lines[0]
        const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())
        
        const requiredHeaders = ['name', 'quantity', 'price']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        if (missingHeaders.length > 0) {
            throw new ValidationError(`Missing required columns: ${missingHeaders.join(', ')}`)
        }

        // Get column indices
        const getIndex = (header: string) => headers.indexOf(header)
        const nameIdx = getIndex('name')
        const quantityIdx = getIndex('quantity')
        const priceIdx = getIndex('price')
        const categoriesIdx = getIndex('categories')
        const imagesIdx = getIndex('images')

        // Skip header row
        const dataLines = lines.slice(1)

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
            skipped: 0
        }

        // Get existing product names to detect duplicates
        const { data: existingProducts } = await supabase
            .from('products')
            .select('name')
            .eq('owner_id', user.id)

        const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase()) || [])

        // Cache for categories to avoid duplicate lookups
        const categoryCache = new Map<string, number>()

        for (let i = 0; i < dataLines.length; i++) {
            try {
                const line = dataLines[i]
                const values = parseCSVLine(line)

                if (values.length < requiredHeaders.length) {
                    throw new Error('Invalid CSV format: not enough columns')
                }

                const name = values[nameIdx]?.trim()
                const quantityStr = values[quantityIdx]?.trim()
                const priceStr = values[priceIdx]?.trim()
                const categoriesStr = values[categoriesIdx]?.trim() || ''
                const imagesStr = values[imagesIdx]?.trim() || ''

                // Validate required fields
                if (!name) {
                    throw new Error('Product name is required')
                }

                // Check for duplicates (case-insensitive)
                if (existingNames.has(name.toLowerCase())) {
                    results.skipped++
                    results.errors.push(`Row ${i + 2}: Product "${name}" already exists (skipped)`)
                    continue
                }

                // Validate data types
                const quantity = parseInt(quantityStr)
                const price = parseFloat(priceStr)

                if (isNaN(quantity)) {
                    throw new Error(`Invalid quantity: "${quantityStr}"`)
                }
                if (quantity < 0) {
                    throw new Error('Quantity cannot be negative')
                }
                if (isNaN(price)) {
                    throw new Error(`Invalid price: "${priceStr}"`)
                }
                if (price <= 0) {
                    throw new Error('Price must be greater than 0')
                }

                // Create product
                const { data: product, error: productError } = await supabase
                    .from('products')
                    .insert({
                        name,
                        quantity,
                        price,
                        owner_id: user.id
                    })
                    .select()
                    .single()

                if (productError) throw productError

                // Add to existing names cache
                existingNames.add(name.toLowerCase())

                // Handle categories if provided
                if (categoriesStr) {
                    const categoryNames = categoriesStr
                        .split(';')
                        .map(c => c.trim())
                        .filter(c => c)

                    for (const categoryName of categoryNames) {
                        let categoryId = categoryCache.get(categoryName.toLowerCase())

                        // Find or create category
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
                                    .insert({
                                        name: categoryName,
                                        owner_id: user.id
                                    })
                                    .select()
                                    .single()

                                if (catError) {
                                    // Handle unique constraint violation (category created by another concurrent import)
                                    if (catError.code === '23505') {
                                        const { data: existingCat } = await supabase
                                            .from('categories')
                                            .select('id')
                                            .eq('name', categoryName)
                                            .eq('owner_id', user.id)
                                            .single()
                                        category = existingCat
                                    } else {
                                        throw catError
                                    }
                                } else {
                                    category = newCategory
                                }
                            }

                            if (category) {
                                categoryCache.set(categoryName.toLowerCase(), category.id)
                                categoryId = category.id
                            }
                        }

                        // Link product to category (ignore if already linked)
                        if (categoryId) {
                            const { error: linkError } = await supabase
                                .from('product_categories')
                                .insert({
                                    product_id: product.id,
                                    category_id: categoryId
                                })

                            // Ignore duplicate link errors
                            if (linkError && linkError.code !== '23505') {
                                throw linkError
                            }
                        }
                    }
                }

                // Handle images if provided
                if (imagesStr) {
                    const imageUrls = imagesStr
                        .split(';')
                        .map(url => url.trim())
                        .filter(url => url)

                    const imageInserts = imageUrls.map((url, index) => ({
                        product_id: product.id,
                        image_url: url,
                        display_order: index
                    }))

                    if (imageInserts.length > 0) {
                        const { error: imageError } = await supabase
                            .from('product_images')
                            .insert(imageInserts)

                        if (imageError) {
                            // Log but don't fail the import for image errors
                            results.errors.push(`Row ${i + 2}: Product created but images failed: ${imageError.message}`)
                        }
                    }
                }

                results.success++
            } catch (error: any) {
                results.failed++
                results.errors.push(`Row ${i + 2}: ${error.message}`)
            }
        }

        const totalProcessed = results.success + results.failed + results.skipped

        return {
            message: `Import completed: ${results.success} created, ${results.failed} failed, ${results.skipped} skipped (duplicates)`,
            success: results.success,
            failed: results.failed,
            skipped: results.skipped,
            total: totalProcessed,
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
            }),
            400: t.Object({
                error: t.String()
            }),
            401: t.Object({
                error: t.String()
            })
        }
    })

// Enhanced CSV parser that handles quoted fields, escaped quotes, and edge cases
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
                // Escaped quote ("")
                current += '"'
                i++ // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current)
            current = ''
        } else {
            current += char
        }

        i++
    }

    // Add last field
    result.push(current)

    return result
}