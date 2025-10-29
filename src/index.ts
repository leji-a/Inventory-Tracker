// index.ts
import 'dotenv/config'
import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors'
import { SupabasePlugin } from "./plugins/supabase"
import { ProductRoutes } from "./models/product/routes"
import { CategoryRoutes } from "./models/category/routes"
import { ProductCSVRoutes } from './models/product/csv_routes';
import { InventoryRoutes } from './models/inventory/routes';
import { ErrorHandler } from "./plugins/errorsHandler"
import { rateLimit } from 'elysia-rate-limit'
import { InventoryCSVRoutes } from './models/inventory/csv-routes';

const PORT = process.env.PORT || 3000
const app = new Elysia()
    .use(rateLimit({
        duration: 60000, // 1 minute
        max: 100, // 100 requests per minute
      }))
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
    .use(cors())
    .use(ErrorHandler)
    .use(SupabasePlugin)
    // routes
    .use(ProductCSVRoutes)
    .use(ProductRoutes)
    .use(CategoryRoutes)
    .use(InventoryRoutes)
    .use(InventoryCSVRoutes)
    .listen(PORT, () => {
        console.log(`Inventory API running on port ${PORT}`)
    })
