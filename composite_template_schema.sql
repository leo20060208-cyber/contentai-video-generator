-- Add columns for Composite Templates (Clean Plate & Match Moving)

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS clean_background_url TEXT,
ADD COLUMN IF NOT EXISTS style_prompt TEXT,
ADD COLUMN IF NOT EXISTS motion_data JSONB; -- Stores frame-by-frame coordinates {frame, x, y, width, height}

-- Ensure template_type can support 'composite' if we want detailed types, 
-- though 'inpainting' might cover it. Let's stick to 'inpainting' or add 'composite'.
-- For now, 'inpainting' + non-null motion_data implies composite logic.
