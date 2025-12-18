-- Add audio-related columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS has_audio boolean DEFAULT true;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_duration numeric;

-- Add comments
COMMENT ON COLUMN videos.audio_url IS 'URL of the extracted audio file';
COMMENT ON COLUMN videos.has_audio IS 'Whether the video has audio';
COMMENT ON COLUMN videos.audio_duration IS 'Duration of the audio in seconds';

-- Create audio-files storage bucket (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('audio-files', 'audio-files', true);

-- Storage policies for audio files
CREATE POLICY IF NOT EXISTS "Users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY IF NOT EXISTS "Audio files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-files');

CREATE POLICY IF NOT EXISTS "Users can delete their audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-files');

-- Create video-files storage bucket if it doesn't exist
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('video-files', 'video-files', true);

-- Storage policies for video files
CREATE POLICY IF NOT EXISTS "Users can upload video files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-files');

CREATE POLICY IF NOT EXISTS "Video files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-files');
