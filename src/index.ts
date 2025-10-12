import { Elysia } from "elysia";
import { ProductRoutes } from "./models/product/routes";
const app = new Elysia()
    .use(ProductRoutes)
    .listen(3000)

console.log(`🛒 Inventory API running at http://${app.server?.hostname}:${app.server?.port}`)