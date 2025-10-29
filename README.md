# Inventory Tracking API

A complete Inventory Management API built with [Elysia](https://elysiajs.com/) and [Supabase](https://supabase.com/).

Manage products, categories, and track inventory quantities over time with period-based tracking (weekly/monthly counts).

## Features

- ✅ RESTful API powered by Elysia.js
- ✅ Database & Auth handled by Supabase
- ✅ Secure per-user data isolation via RLS
- ✅ Period-based inventory tracking (track quantities over time)
- ✅ Multiple images per product with ordering
- ✅ CSV import/export for products and inventory
- ✅ Pagination for products and categories
- ✅ Comprehensive error handling

## Quick Start

### Backend Setup

1. **Install dependencies:**
```bash
   bun install
```

2. **Set up environment variables** (`.env`):
```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
```

3. **Run the database setup in Supabase** (execute `database.sql` in Supabase SQL Editor)

4. **Start the server:**
```bash
   bun run src/index.ts
```

### Frontend Integration

The API uses Supabase authentication. Your frontend should authenticate directly with Supabase, then use the token for API requests.

#### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
# or
bun add @supabase/supabase-js
```

#### 2. Initialize Supabase
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)
```

#### 3. Authenticate Users
```javascript
// Sign up
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  return data
}

// Login
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  
  // Store the token
  const token = data.session.access_token
  localStorage.setItem('authToken', token)
  
  return data
}

// Logout
async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem('authToken')
}
```

#### 4. Example: Complete Login Flow
```javascript
// Login component
async function handleLogin(email, password) {
  try {
    const { session } = await login(email, password)
    console.log('Logged in!', session.user)
    
    // Now you can make API calls
    const products = await getProducts()
    console.log('Products:', products)
  } catch (error) {
    console.error('Login failed:', error.message)
  }
}
```

## Authentication

All endpoints require authentication via Supabase Auth:
```bash
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

Users can only access their own data (enforced by RLS).

## API Endpoints

### Products

| Method | Endpoint        | Description                  |
| ------ | --------------- | ---------------------------- |
| GET    | `/products`     | List products (paginated)    |
| GET    | `/products/:id` | Get product by ID            |
| POST   | `/products`     | Create product               |
| PUT    | `/products/:id` | Update product               |
| DELETE | `/products/:id` | Delete product               |

**Example:**
```json
POST /products
{
  "name": "Laptop",
  "price": 999.99,
  "categoryIds": [1, 2]
}
```

### Categories

| Method | Endpoint          | Description                  |
| ------ | ----------------- | ---------------------------- |
| GET    | `/categories`     | List categories (paginated)  |
| GET    | `/categories/:id` | Get category by ID           |
| POST   | `/categories`     | Create category              |
| PUT    | `/categories/:id` | Update category              |
| DELETE | `/categories/:id` | Delete category              |

### Inventory Periods

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| GET    | `/inventory/periods`              | List all periods         |
| GET    | `/inventory/periods/active`       | Get active period        |
| POST   | `/inventory/periods`              | Create new period        |
| POST   | `/inventory/periods/:id/close`    | Close a period           |

**Example:**
```json
POST /inventory/periods
{
  "name": "October 2025",
  "start_date": "2025-10-01",
  "notes": "Monthly count"
}
```

### Inventory Records

| Method | Endpoint                              | Description                    |
| ------ | ------------------------------------- | ------------------------------ |
| GET    | `/inventory/current`                  | Get current inventory          |
| POST   | `/inventory/periods/:id/records`      | Add/update quantity            |
| GET    | `/inventory/periods/:id/records`      | List records for period        |
| GET    | `/inventory/products/:id/history`     | View product history           |

**Example:**
```json
POST /inventory/periods/1/records
{
  "product_id": 1,
  "quantity": 50,
  "notes": "Warehouse A"
}
```

### CSV Import/Export

| Method | Endpoint                        | Description                      |
| ------ | ------------------------------- | -------------------------------- |
| GET    | `/inventory/export/current`     | Export current inventory as CSV  |
| GET    | `/inventory/export/products`    | Export product catalog as CSV    |
| POST   | `/inventory/import/products`    | Bulk import products             |
| POST   | `/inventory/import/inventory`   | Bulk import inventory counts     |

**Example CSV Import:**
```csv
Product Name,Price,Categories
Laptop,999.99,Electronics;Computers
Mouse,29.99,Electronics;Accessories
```
```bash
POST /inventory/import/products
{
  "csv": "Product Name,Price,Categories\nLaptop,999.99,Electronics"
}
```

### Product Images

| Method | Endpoint                            | Description                |
| ------ | ----------------------------------- | -------------------------- |
| POST   | `/products/:id/images/url`          | Add image via URL          |
| POST   | `/products/:id/images`              | Upload image file          |
| DELETE | `/products/:id/images/:imageId`     | Delete image               |
| PUT    | `/products/:id/images/reorder`      | Reorder images             |

## How Inventory Tracking Works

1. **Create products** (one-time setup)
2. **Create an inventory period** (e.g., "October 2025")
3. **Add quantities** for products in that period
4. **Export to CSV** or view current inventory
5. **Close period** and start a new one
6. **View history** to see how quantities changed over time

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Elysia.js](https://elysiajs.com/)
- **Database:** [Supabase (PostgreSQL)](https://supabase.com/)
- **Auth:** Supabase Auth

## TODO

- [x] Add pagination & sorting
- [x] Multiple image support
- [x] Period-based inventory tracking
- [x] CSV import/export
- [ ] Add unit tests with Bun
- [ ] Create a frontend
- [ ] Add search/filtering
- [ ] API documentation (Swagger)

## Contributing

Pull requests are welcome! For major changes, please open an issue first.