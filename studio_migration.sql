-- Add columns for video refinement and storage
ALTER TABLE videos ADD COLUMN IF NOT EXISTS source_video_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS refinement_prompt text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS parent_video_id uuid REFERENCES videos(id);

-- Add comments
COMMENT ON COLUMN videos.source_video_url IS 'URL of the original video used for refinement';
COMMENT ON COLUMN videos.refinement_prompt IS 'The prompt used to refine this video';
COMMENT ON COLUMN videos.parent_video_id IS 'Reference to the parent video if this is a refinement';
