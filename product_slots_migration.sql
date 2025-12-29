-- Migration: Add product_slots column to templates table
-- This allows templates to define required/optional product slots with time ranges

-- Add the product_slots column as JSONB
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS product_slots JSONB DEFAULT '[]'::jsonb;

-- Example structure of product_slots:
-- [
--   {
--     "id": "slot-1",
--     "name": "Main Product",
--     "description": "The main product shown in the video",
--     "isRequired": true,
--     "timeRange": { "startSecond": 0, "endSecond": 5 },
--     "defaultPromptPart": "Replace the main product with this image"
--   },
--   {
--     "id": "slot-2", 
--     "name": "Secondary Product",
--     "description": "Product shown in second half",
--     "isRequired": false,
--     "timeRange": { "startSecond": 5, "endSecond": 10 },
--     "defaultPromptPart": "Replace the secondary product with this image"
--   }
-- ]

-- Add index for JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_templates_product_slots 
ON templates USING GIN (product_slots);

COMMENT ON COLUMN templates.product_slots IS 'JSON array of product slot configurations with time ranges and requirements';
