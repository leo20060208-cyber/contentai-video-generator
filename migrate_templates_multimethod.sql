-- Migration: Add Multi-Method Generation Support to Templates
-- Run this in Supabase SQL Editor

-- Add new columns for generation methods
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS generation_method TEXT 
  CHECK (generation_method IN ('prompt_images', 'video_to_video', 'template_video'))
  DEFAULT 'video_to_video';

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS reference_images JSONB;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS keyframe_prompts JSONB;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS product_swap_prompt TEXT;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_video_url TEXT;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS estimated_cost_credits DECIMAL(10,2);

-- Set default method for existing templates
UPDATE templates 
SET generation_method = 'video_to_video' 
WHERE generation_method IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN templates.generation_method IS 'Method used to generate videos: prompt_images, video_to_video, or template_video';
COMMENT ON COLUMN templates.ai_model IS 'AI model to use for this template (e.g., minimax, svd, hunyuan)';
COMMENT ON COLUMN templates.reference_images IS 'JSON object with start, middle, end image URLs for prompt_images method';
COMMENT ON COLUMN templates.keyframe_prompts IS 'JSON object with start, middle, end prompts for prompt_images method';
COMMENT ON COLUMN templates.product_swap_prompt IS 'Instructions for swapping the product in the video';
COMMENT ON COLUMN templates.template_video_url IS 'URL of template video without product (for template_video method)';
COMMENT ON COLUMN templates.estimated_cost_credits IS 'Estimated cost in credits to generate a video with this template';
