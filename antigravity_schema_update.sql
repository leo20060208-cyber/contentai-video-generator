-- Add Antigravity fields to templates table

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS mask_video_url TEXT,
ADD COLUMN IF NOT EXISTS preview_gif TEXT;

-- Verify
SELECT id, title, mask_video_url, preview_gif FROM templates LIMIT 5;

-- Ensure videos table has necessary columns for saving generations
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS task_id TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS prompt TEXT;

