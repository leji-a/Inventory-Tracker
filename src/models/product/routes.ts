import { Elysia } from 'elysia'
import { ProductSchema } from './schema'
import { getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct } 
from '../product/service'

export const ProductRoutes = new Elysia({ prefix: '/products' })
    .get('/', () => getAllProducts())
    .get('/:id', ({ params: { id } }) => getProductById(Number(id)))
    .post('/', ({ body }) => createProduct(body), { body: ProductSchema })
    .put('/:id', ({ params: { id }, body }) => updateProduct(Number(id), body), {
      body: ProductSchema,
    })
    .delete('/:id', ({ params: { id } }) => deleteProduct(Number(id)))