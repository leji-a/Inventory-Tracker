import { Elysia } from "elysia";
import 'dotenv/config'
import { SupabasePlugin } from "./plugins/supabase"
import { ProductRoutes } from "./models/product/routes"
import { CategoryRoutes } from "./models/category/routes"

const app = new Elysia()
    .use(SupabasePlugin)

    .use(ProductRoutes)
    .use(CategoryRoutes)
    .listen(3000)

console.log(`🛒 Inventory API running at http://${app.server?.hostname}:${app.server?.port}`)