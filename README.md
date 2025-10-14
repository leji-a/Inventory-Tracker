# Inventory API

A simple Inventory Management API built with [Elysia](https://elysiajs.com/) and [Supabase](https://supabase.com/).

It allows authenticated users to manage Products and Categories, with ownership-based access enforced by Supabase Row Level Security (RLS).

## Features

- RESTful API powered by Elysia.js
- Database & Auth handled by Supabase
- Secure per-user data isolation via RLS

## Project strucure

```graphql
.
├── index.ts                    # App entrypoint
├── lib/
│   └── supabase.ts             # Supabase client factory
├── plugins/
│   └── supabase.ts             # Elysia plugin injecting Supabase client
├── models/
│   ├── product/
│   │   ├── schema.ts           # Product schema definition
│   │   ├── service.ts          # Product service (CRUD logic)
│   │   └── routes.ts           # Product API endpoints
│   └── category/
│       ├── schema.ts           # Category schema definition
│       ├── service.ts          # Category service (CRUD logic)
│       └── routes.ts           # Category API endpoints
├── types/
│   └── types.ts                # Shared type definitions
└── .env                        # Environment variables
```

## API Endpoints

### Categories

| Method | Endpoint          | Description           |
| ------ | ----------------- | --------------------- |
| GET    | `/categories`     | Get all categories    |
| GET    | `/categories/:id` | Get a category by ID  |
| POST   | `/categories`     | Create a new category |
| PUT    | `/categories/:id` | Update a category     |
| DELETE | `/categories/:id` | Delete a category     |

#### Example (POST)

```json
{
  "name": "Electronics",
  "description": "Devices and accessories"
}
```

### Products

| Method | Endpoint        | Description                |
| ------ | --------------- | -------------------------- |
| GET    | `/products`     | Get all products           |
| GET    | `/products/:id` | Get a product by ID        |
| POST   | `/products`     | Create a new product       |
| PUT    | `/products/:id` | Update an existing product |
| DELETE | `/products/:id` | Delete a product           |

#### Example (POST)

```json
{
  "name": "Keyboard",
  "quantity": 10,
  "price": 49.99,
  "categoryIds": [1, 2]
}
```

#### Example response

```json
[
  {
    "id": 1,
    "name": "Keyboard",
    "quantity": 10,
    "price": 49.99,
    "categoryIds": [1],
    "categoryNames": ["Electronics"]
  }
]
```

TODO

- [x] Add pagination & sorting to /products
- [x] Improve input validation & error handling
- [ ] Implement caching for read endpoints
- [ ] Add unit tests with Bun’s test runner
- [ ] Include owner_id directly in product/category queries for debugging

