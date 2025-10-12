import type { Product } from './schema'

let products: Product[] = [
  { id: 1, name: 'USB Cable', category: 'Electronics', quantity: 10, price: 5.99 },
  { id: 2, name: 'Notebook', category: 'Stationery', quantity: 25, price: 2.49 },
]

// CRUD-like service functions
export function getAllProducts() {
  return products
}

export function getProductById(id: number) {
  return products.find((p) => p.id === id)
}

export function createProduct(data: Omit<Product, 'id'>) {
  const newProduct: Product = { id: products.length + 1, ...data }
  products.push(newProduct)
  return newProduct
}

export function updateProduct(id: number, data: Partial<Product>) {
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return null
  products[index] = { ...products[index], ...data }
  return products[index]
}

export function deleteProduct(id: number) {
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return false
  products.splice(index, 1)
  return true
}
