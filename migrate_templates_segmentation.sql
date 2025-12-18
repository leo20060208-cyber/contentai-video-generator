-- Migration: Add Segmentation Mask support to Templates
-- Run this in Supabase SQL Editor

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS replaced_object_mask_url TEXT;

COMMENT ON COLUMN templates.replaced_object_mask_url IS 'URL of the mask image defining the object to be replaced in the template video';
