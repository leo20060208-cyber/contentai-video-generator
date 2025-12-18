-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial categories
INSERT INTO categories (name, slug, order_index) VALUES
  ('VISUAL', 'visual', 1),
  ('CLOTHING BRANDS', 'clothing-brands', 2),
  ('ASMR', 'asmr', 3),
  ('VISUAL TEMPLATES', 'visual-templates', 4),
  ('DROP SHIPPING', 'drop-shipping', 5),
  ('ECOMMERCE', 'ecommerce', 6),
  ('BRAND', 'brand', 7)
ON CONFLICT (name) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(order_index);
