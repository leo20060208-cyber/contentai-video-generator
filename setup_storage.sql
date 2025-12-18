-- ============================================
-- COMPLETE STORAGE SETUP FOR VIDEOSANDANIMATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create all necessary buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. DROP existing policies to avoid conflicts (safe if they don't exist)
DROP POLICY IF EXISTS "Public Access Videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Videos" ON storage.objects;

DROP POLICY IF EXISTS "Public Access Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Audio" ON storage.objects;

DROP POLICY IF EXISTS "Public Access Thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Thumbnails" ON storage.objects;

DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Images" ON storage.objects;

-- 3. Re-create policies for 'videos' bucket
CREATE POLICY "Public Access Videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated Upload Videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Authenticated Update Videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated Delete Videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');

-- 4. Policies for 'audio-files' bucket
CREATE POLICY "Public Access Audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-files');

CREATE POLICY "Authenticated Upload Audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Authenticated Update Audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audio-files');

CREATE POLICY "Authenticated Delete Audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audio-files');

-- 5. Policies for 'thumbnails' bucket
CREATE POLICY "Public Access Thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated Upload Thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated Delete Thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails');

-- 6. Policies for 'images' bucket
CREATE POLICY "Public Access Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated Upload Images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated Delete Images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');

-- ============================================
-- RLS POLICIES FOR DATABASE TABLES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;

DROP POLICY IF EXISTS "Users can view own saved templates" ON saved_templates;
DROP POLICY IF EXISTS "Users can insert own saved templates" ON saved_templates;
DROP POLICY IF EXISTS "Users can delete own saved templates" ON saved_templates;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Videos policies
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (auth.uid() = user_id);

-- Saved templates policies
CREATE POLICY "Users can view own saved templates" ON saved_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved templates" ON saved_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved templates" ON saved_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Done!
SELECT 'Storage and RLS policies configured successfully!' as result;
