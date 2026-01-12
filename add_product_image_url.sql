-- Add product_image_url column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS product_image_url TEXT;

COMMENT ON COLUMN templates.product_image_url IS 'URL of the original product image used to generate the result, used for Reference vs Product toggle.';
