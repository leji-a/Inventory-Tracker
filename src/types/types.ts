export type ProductWithCategories = {
  id: number
  name: string
  quantity: number
  price: number
  product_categories: {
    category: {
      id: number
      name: string
    }
  }[]
}