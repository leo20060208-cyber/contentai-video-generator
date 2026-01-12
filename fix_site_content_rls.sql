-- Enable Row Level Security (this is harmless if already enabled)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access" ON site_content;
DROP POLICY IF EXISTS "Allow authenticated insert" ON site_content;
DROP POLICY IF EXISTS "Allow authenticated update" ON site_content;
DROP POLICY IF EXISTS "Allow authenticated delete" ON site_content;

-- 1. Allow Public Read Access (Anon + Authenticated)
CREATE POLICY "Allow public read access" ON site_content
FOR SELECT
USING (true);

-- 2. Allow Authenticated Users (Lab) to Insert/Update
CREATE POLICY "Allow authenticated insert" ON site_content
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON site_content
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Optional: Allow delete if needed
CREATE POLICY "Allow authenticated delete" ON site_content
FOR DELETE
USING (auth.role() = 'authenticated');
