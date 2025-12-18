-- Add is_trending column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;

-- Update existing templates to not be trending by default
UPDATE templates SET is_trending = false WHERE is_trending IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_templates_trending ON templates(is_trending);
