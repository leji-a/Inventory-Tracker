# Inventory API

A simple Inventory Management API built with [Elysia](https://elysiajs.com/) and [Supabase](https://supabase.com/).

It allows authenticated users to manage Products, Categories, and Product Images with ownership-based access enforced by Supabase Row Level Security (RLS).

## Features

- ✅ RESTful API powered by Elysia.js
- ✅ Database & Auth handled by Supabase
- ✅ Secure per-user data isolation via RLS
- ✅ Multiple images per product with ordering
- ✅ Hybrid image support (external URLs or file uploads)
- ✅ Pagination for products and categories
- ✅ Comprehensive error handling

## Project Structure

```graphql
.
├── index.ts                 # App entrypoint
├── lib/
│   ├── supabase.ts          # Supabase client factory
│   └── errors.ts            # Custom error classes
├── plugins/
│   ├── supabase.ts          # Elysia plugin injecting Supabase client
│   └── errorsHandler.ts     # Global error handler
├── models/
│   ├── product/
│   │   ├── schema.ts        # Product schema definition
│   │   ├── service.ts       # Product service (CRUD logic + images)
│   │   └── routes.ts        # Product API endpoints
│   └── category/
│       ├── schema.ts        # Category schema definition
│       ├── service.ts       # Category service (CRUD logic)
│       └── routes.ts        # Category API endpoints
├── types/
│   └── types.ts             # Shared type definitions
└── .env                     # Environment variables
```

## API Endpoints

### Categories

| Method | Endpoint            | Description                   |
| ------ | ------------------- | ----------------------------- |
| GET    | `/categories`       | Get all categories (paginated)|
| GET    | `/categories/:id`   | Get a category by ID          |
| POST   | `/categories`       | Create a new category         |
| PUT    | `/categories/:id`   | Update a category             |
| DELETE | `/categories/:id`   | Delete a category             |

#### Example (POST `/categories`)

```json
{
  "name": "Electronics",
  "description": "Devices and accessories"
}
```

#### Pagination

```bash
GET /categories?page=1&limit=20
```

---

### Products

| Method | Endpoint                      | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/products`                   | Get all products (paginated)         |
| GET    | `/products/:id`               | Get a product by ID                  |
| POST   | `/products`                   | Create a new product                 |
| PUT    | `/products/:id`               | Update an existing product           |
| DELETE | `/products/:id`               | Delete a product                     |

#### Example (POST `/products`)

```json
{
  "name": "Keyboard",
  "quantity": 10,
  "price": 49.99,
  "categoryIds": [1, 2]
}
```

#### Example Response

```json
{
  "data": [
    {
      "id": 1,
      "name": "Keyboard",
      "quantity": 10,
      "price": 49.99,
      "categoryIds": [1],
      "categoryNames": ["Electronics"],
      "images": [
        {
          "id": 1,
          "image_url": "https://i.imgur.com/abc123.jpg",
          "display_order": 0
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

#### Pagination

```bash
GET /products?page=1&limit=20
```

---

### Product Images

| Method | Endpoint                             | Description                              |
| ------ | ------------------------------------ | ---------------------------------------- |
| POST   | `/products/:id/images`               | Upload image file to Supabase Storage    |
| POST   | `/products/:id/images/url`           | Add image via external URL               |
| PUT    | `/products/:id/images/reorder`       | Reorder product images                   |
| DELETE | `/products/:id/images/:imageId`      | Delete a specific image                  |

#### Example (POST `/products/:id/images/url` - Add via URL)

```json
{
  "image_url": "https://i.imgur.com/abc123.jpg"
}
```

#### Example (POST `/products/:id/images` - Upload File)

```bash
POST /products/1/images
Content-Type: multipart/form-data

file: keyboard.jpg
```

#### Example (PUT `/products/:id/images/reorder` - Reorder Images)

```json
{
  "orders": [
    { "id": 3, "display_order": 0 },
    { "id": 1, "display_order": 1 },
    { "id": 2, "display_order": 2 }
  ]
}
```

**Response:** Updated product with reordered images

---

## Image Support

This API supports **two ways** to add product images:

### 1. External Image URLs 
Paste image links from services like Imgur, Cloudinary, or your own CDN:

```bash
POST /products/1/images/url
Content-Type: application/json

{
  "image_url": "https://i.imgur.com/abc123.jpg"
}
```

✅ **Pros:** Fast, no storage management, simple  
❌ **Cons:** Depends on external service

### 2. File Uploads 
Upload images directly to Supabase Storage:

```bash
POST /products/1/images
Content-Type: multipart/form-data

file: image.jpg
```

✅ **Pros:** Full control, integrated storage, no external dependencies  
❌ **Cons:** Storage costs, more complex

### Image Features

- **Multiple images per product** (up to 10)
- **Ordered display** - First image (display_order: 0) is the primary/thumbnail
- **Reorderable** - Drag & drop support via API

---

## Authentication

All endpoints require authentication via Supabase Auth:

```bash
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

Users can only access their own data (enforced by RLS).

---

## TODO

- [x] Add pagination & sorting to /products and /categories
- [x] Improve input validation & error handling
- [x] Add multiple image support per product
- [x] Implement hybrid image system (URLs + uploads)
- [ ] Deploy and test in production
- [ ] Add search/filtering endpoints
- [ ] Add unit tests with Bun's test runner
- [ ] Implement rate limiting
- [ ] Add API documentation (Swagger)

---

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Elysia.js](https://elysiajs.com/)
- **Database:** [Supabase (PostgreSQL)](https://supabase.com/)
- **Storage:** Supabase Storage (optional)
- **Auth:** Supabase Auth

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first.