// types/types.ts
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

export type PaginationParams = {
  page?: number
  limit?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}