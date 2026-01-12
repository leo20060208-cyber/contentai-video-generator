-- Add hidden_prompt column to templates table
-- This column stores the custom prompt from the Lab for image recreation

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS hidden_prompt TEXT;

-- Optional: Populate existing templates with their description value
-- This ensures backward compatibility for templates created before this update
UPDATE templates 
SET hidden_prompt = description 
WHERE hidden_prompt IS NULL AND description IS NOT NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN templates.hidden_prompt IS 'Custom prompt for image recreation, used by ImageCreateFlow component';
