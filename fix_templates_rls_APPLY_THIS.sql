-- COPY THIS SQL AND RUN IT IN YOUR SUPABASE SQL EDITOR
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- Paste this entire script and click "Run"

-- Fix templates table RLS policies
-- Replace auth.role() checks with auth.uid() checks for proper authentication

-- Drop the old faulty policy
DROP POLICY IF EXISTS "Authenticated users can modify templates" ON templates;

-- Create separate policies for better control and clarity

-- Policy 1: Everyone can read templates (public access)
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON templates;
CREATE POLICY "Public templates are viewable by everyone" 
ON templates FOR SELECT 
USING (true);

-- Policy 2: Authenticated users can insert templates
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON templates;
CREATE POLICY "Authenticated users can insert templates" 
ON templates FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Authenticated users can update templates
DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
CREATE POLICY "Authenticated users can update templates" 
ON templates FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 4: Authenticated users can delete templates
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON templates;
CREATE POLICY "Authenticated users can delete templates" 
ON templates FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Verification query (optional - run this to confirm the policies are created)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'templates'
ORDER BY policyname;
