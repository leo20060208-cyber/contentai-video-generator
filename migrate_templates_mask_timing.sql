-- Migration: Add Mask and Recreation Timing support to Templates
-- Run this in Supabase SQL Editor

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS mask_duration JSONB,
ADD COLUMN IF NOT EXISTS recreation_duration JSONB;

COMMENT ON COLUMN templates.mask_duration IS 'JSON object defining start and end time of the mask: {start: 0, end: 5}';
COMMENT ON COLUMN templates.recreation_duration IS 'JSON object defining the start and end time of the AI generation window: {start: 0, end: 5}';
