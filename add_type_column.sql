-- Add 'type' column to templates table
-- This column will store whether the template is for 'video' or 'image'

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Set default value for existing rows (assume they are videos if they have video URLs)
UPDATE templates 
SET type = CASE 
    WHEN before_video_url IS NOT NULL OR after_video_url IS NOT NULL THEN 'video'
    ELSE 'image'
END
WHERE type IS NULL;

-- Add a check constraint to ensure only valid values
ALTER TABLE templates
ADD CONSTRAINT templates_type_check 
CHECK (type IN ('video', 'image'));
