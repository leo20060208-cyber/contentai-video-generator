-- Add columns for Multi-Image Templates
-- Run this in the Supabase SQL Editor

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS required_image_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS image_descriptions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_instructions TEXT;
