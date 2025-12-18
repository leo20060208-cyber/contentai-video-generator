-- Ensure Row Level Security is enabled
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 1. VIEW (SELECT)
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Users can view own videos" ON videos 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. INSERT
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
CREATE POLICY "Users can insert own videos" ON videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
CREATE POLICY "Users can update own videos" ON videos 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. DELETE
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
CREATE POLICY "Users can delete own videos" ON videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure policies for saved_templates
ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage saved templates" ON saved_templates;
CREATE POLICY "Users can manage saved templates" ON saved_templates
FOR ALL
USING (auth.uid() = user_id);
