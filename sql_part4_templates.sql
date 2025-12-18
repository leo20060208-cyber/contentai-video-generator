-- Create templates table
DROP TABLE IF EXISTS templates; 
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    before_video_url TEXT, 
    after_video_url TEXT,
    views_count TEXT DEFAULT '0', 
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read templates
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON templates;
CREATE POLICY "Public templates are viewable by everyone" 
ON templates FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert/update templates
DROP POLICY IF EXISTS "Authenticated users can modify templates" ON templates;
CREATE POLICY "Authenticated users can modify templates" 
ON templates FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Insert initial data (So the grid exists)
INSERT INTO templates (id, title, category, before_image_url, after_image_url, views_count, is_trending) VALUES
(1, 'Product Showcase', 'Ecommerce', 'https://images.unsplash.com/photo-1491553895911-0055uj6e?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop', '2.4M', true),
(2, 'Unboxing Experience', 'UGC Style', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop', '1.8M', true),
(3, 'Skincare Routine', 'Beauty', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop', '3.1M', false),
(4, 'Food Commercial', 'Food', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop', '890K', false),
(5, 'Fashion Reel', 'Fashion', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop', '1.2M', true),
(6, 'Tech Product Demo', 'Tech', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=800&fit=crop', '2.1M', true),
(7, 'Lifestyle Shot', 'Ecommerce', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop', '756K', false),
(8, 'Makeup Tutorial', 'Beauty', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1487412947147-5ceba16a4f2f?w=600&h=800&fit=crop', '1.5M', false),
(9, 'Dropship Winner', 'Dropshipping', 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop', '980K', true),
(10, 'Street Style', 'Fashion', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=800&fit=crop', '2.3M', false);

SELECT setval('templates_id_seq', (SELECT MAX(id) FROM templates));
