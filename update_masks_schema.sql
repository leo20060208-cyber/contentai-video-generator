-- Migration: Create 'masks' bucket and 'user_masks' table

-- 1. Create 'masks' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('masks', 'masks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'masks'
DROP POLICY IF EXISTS "Public Access Masks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Masks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Masks" ON storage.objects;

CREATE POLICY "Public Access Masks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'masks');

CREATE POLICY "Authenticated Upload Masks"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'masks');

CREATE POLICY "Authenticated Delete Masks"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'masks');

-- 3. Create 'user_masks' table
CREATE TABLE IF NOT EXISTS user_masks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS for 'user_masks'
ALTER TABLE user_masks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own masks" ON user_masks;
DROP POLICY IF EXISTS "Users can insert own masks" ON user_masks;
DROP POLICY IF EXISTS "Users can delete own masks" ON user_masks;

CREATE POLICY "Users can view own masks" ON user_masks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own masks" ON user_masks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own masks" ON user_masks
  FOR DELETE USING (auth.uid() = user_id);

SELECT 'Migration for Masks completed successfully!' as result;
