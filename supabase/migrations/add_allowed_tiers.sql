-- Add allowed_tiers column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[] DEFAULT ARRAY['normal', 'pro'];

-- Update existing rows to have default value (optional, as DEFAULT handles new rows)
UPDATE templates 
SET allowed_tiers = ARRAY['normal', 'pro'] 
WHERE allowed_tiers IS NULL;
