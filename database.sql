-- ============================================================================
-- INVENTORY TRACKER - COMPLETE DATABASE SETUP WITH INVENTORY PERIODS
-- This includes the initial schema, fixes, AND new inventory tracking tables
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: INITIAL SCHEMA
-- ============================================================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Products table (quantity will be removed later)
CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Many-to-many relationship: product_categories
CREATE TABLE IF NOT EXISTS product_categories (
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
DROP POLICY IF EXISTS "Read own products" ON products;
DROP POLICY IF EXISTS "Insert own products" ON products;
DROP POLICY IF EXISTS "Update own products" ON products;
DROP POLICY IF EXISTS "Delete own products" ON products;

CREATE POLICY "Read own products" 
ON products FOR SELECT 
TO authenticated 
USING (owner_id = auth.uid());

CREATE POLICY "Insert own products" 
ON products FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Update own products" 
ON products FOR UPDATE 
TO authenticated 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Delete own products" 
ON products FOR DELETE 
TO authenticated 
USING (owner_id = auth.uid());

-- RLS Policies for categories
DROP POLICY IF EXISTS "Read own categories" ON categories;
DROP POLICY IF EXISTS "Insert own categories" ON categories;
DROP POLICY IF EXISTS "Update own categories" ON categories;
DROP POLICY IF EXISTS "Delete own categories" ON categories;

CREATE POLICY "Read own categories" 
ON categories FOR SELECT 
TO authenticated 
USING (owner_id = auth.uid());

CREATE POLICY "Insert own categories" 
ON categories FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Update own categories" 
ON categories FOR UPDATE 
TO authenticated 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Delete own categories" 
ON categories FOR DELETE 
TO authenticated 
USING (owner_id = auth.uid());

-- ============================================================================
-- PART 2: FIXES AND IMPROVEMENTS
-- ============================================================================

-- Remove DEFAULT auth.uid() (doesn't work from API)
ALTER TABLE products ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE categories ALTER COLUMN owner_id DROP DEFAULT;

-- Remove owner_id from product_categories
DROP POLICY IF EXISTS "Read own product-category links" ON product_categories;
DROP POLICY IF EXISTS "Insert own product-category links" ON product_categories;
DROP POLICY IF EXISTS "Update own product-category links" ON product_categories;
DROP POLICY IF EXISTS "Delete own product-category links" ON product_categories;

ALTER TABLE product_categories DROP COLUMN IF EXISTS owner_id;

-- Add Timestamp Columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add Critical Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_categories_owner_id ON categories(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_products_owner_name ON products(owner_id, name);
CREATE INDEX IF NOT EXISTS idx_categories_owner_name ON categories(owner_id, name);
CREATE INDEX IF NOT EXISTS idx_products_id_order ON products(owner_id, id);
CREATE INDEX IF NOT EXISTS idx_categories_id_order ON categories(owner_id, id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(owner_id, price);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(owner_id, quantity);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(owner_id, created_at DESC);

-- Fix RLS Policies for product_categories
CREATE POLICY "Read own product-category links" 
ON product_categories 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Insert own product-category links" 
ON product_categories 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.owner_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM categories 
    WHERE categories.id = product_categories.category_id 
    AND categories.owner_id = auth.uid()
  )
);

CREATE POLICY "Update own product-category links" 
ON product_categories 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.owner_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM categories 
    WHERE categories.id = product_categories.category_id 
    AND categories.owner_id = auth.uid()
  )
);

CREATE POLICY "Delete own product-category links" 
ON product_categories 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.owner_id = auth.uid()
  )
);

-- Add Check Constraints (will be modified later when removing quantity)
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_quantity_non_negative;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_price_positive;

ALTER TABLE products 
ADD CONSTRAINT chk_quantity_non_negative 
CHECK (quantity >= 0);

ALTER TABLE products 
ADD CONSTRAINT chk_price_positive 
CHECK (price > 0);

-- Add Unique Constraint on Category Names
ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_categories_owner_name;
ALTER TABLE categories 
ADD CONSTRAINT uq_categories_owner_name 
UNIQUE (owner_id, name);

-- Add Auto-Update Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON products
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
BEFORE UPDATE ON categories
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (image_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_order 
ON product_images(product_id, display_order);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read product images" ON product_images;
DROP POLICY IF EXISTS "Insert product images" ON product_images;
DROP POLICY IF EXISTS "Update product images" ON product_images;
DROP POLICY IF EXISTS "Delete product images" ON product_images;

CREATE POLICY "Read product images" 
ON product_images 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Insert product images" 
ON product_images 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Update product images" 
ON product_images 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Delete product images" 
ON product_images 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.owner_id = auth.uid()
  )
);

-- ============================================================================
-- PART 3: NEW INVENTORY TRACKING SYSTEM
-- ============================================================================

-- Create inventory_periods table (your "spaces")
CREATE TABLE IF NOT EXISTS inventory_periods (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_periods_owner_name UNIQUE (owner_id, name),
  CONSTRAINT chk_status CHECK (status IN ('active', 'closed'))
);

-- Create inventory_records table (actual quantities)
CREATE TABLE IF NOT EXISTS inventory_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  period_id BIGINT REFERENCES inventory_periods(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  counted_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_record_product_period UNIQUE (product_id, period_id),
  CONSTRAINT chk_record_quantity_non_negative CHECK (quantity >= 0)
);

-- Indexes for inventory tables
CREATE INDEX IF NOT EXISTS idx_inventory_periods_owner ON inventory_periods(owner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_periods_status ON inventory_periods(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_periods_dates ON inventory_periods(owner_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_records_product ON inventory_records(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_period ON inventory_records(period_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_product_period ON inventory_records(product_id, period_id);

-- Enable RLS for inventory tables
ALTER TABLE inventory_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_periods
DROP POLICY IF EXISTS "Users can view own periods" ON inventory_periods;
DROP POLICY IF EXISTS "Users can insert own periods" ON inventory_periods;
DROP POLICY IF EXISTS "Users can update own periods" ON inventory_periods;
DROP POLICY IF EXISTS "Users can delete own periods" ON inventory_periods;

CREATE POLICY "Users can view own periods" 
ON inventory_periods FOR SELECT 
TO authenticated 
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own periods" 
ON inventory_periods FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own periods" 
ON inventory_periods FOR UPDATE 
TO authenticated 
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own periods" 
ON inventory_periods FOR DELETE 
TO authenticated 
USING (owner_id = auth.uid());

-- RLS Policies for inventory_records
DROP POLICY IF EXISTS "Users can view own inventory records" ON inventory_records;
DROP POLICY IF EXISTS "Users can insert own inventory records" ON inventory_records;
DROP POLICY IF EXISTS "Users can update own inventory records" ON inventory_records;
DROP POLICY IF EXISTS "Users can delete own inventory records" ON inventory_records;

CREATE POLICY "Users can view own inventory records" 
ON inventory_records FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = inventory_records.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own inventory records" 
ON inventory_records FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = inventory_records.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own inventory records" 
ON inventory_records FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = inventory_records.product_id 
    AND products.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own inventory records" 
ON inventory_records FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = inventory_records.product_id 
    AND products.owner_id = auth.uid()
  )
);

-- Add triggers for inventory tables
DROP TRIGGER IF EXISTS update_inventory_periods_updated_at ON inventory_periods;
CREATE TRIGGER update_inventory_periods_updated_at 
BEFORE UPDATE ON inventory_periods
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_records_updated_at ON inventory_records;
CREATE TRIGGER update_inventory_records_updated_at 
BEFORE UPDATE ON inventory_records
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: REMOVE QUANTITY FROM PRODUCTS (OPTIONAL - DO THIS LAST)
-- ============================================================================
-- IMPORTANT: Only run this section AFTER you've migrated your data to inventory_records
-- and updated your backend code to use the new inventory system

-- Step 1: Uncomment these lines when ready to migrate
-- -- Drop the quantity constraint first
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_quantity_non_negative;
-- 
-- -- Remove the quantity column
ALTER TABLE products DROP COLUMN IF EXISTS quantity;
-- 
-- -- Remove the quantity index
DROP INDEX IF EXISTS idx_products_quantity;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'categories', 'product_categories', 'product_images', 'inventory_periods', 'inventory_records')
ORDER BY table_name;

-- Check all indexes
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'categories', 'product_categories', 'product_images', 'inventory_periods', 'inventory_records')
ORDER BY tablename, indexname;

-- Check all RLS policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('products', 'categories', 'product_categories', 'product_images', 'inventory_periods', 'inventory_records')
ORDER BY tablename, policyname;

-- ============================================================================
-- DONE! Your database now includes:
-- - All original tables (products, categories, product_categories, product_images)
-- - New inventory tracking (inventory_periods, inventory_records)
-- - 20+ indexes for performance
-- - 20+ RLS policies for security
-- - Triggers for auto-updating timestamps
-- 
-- ============================================================================