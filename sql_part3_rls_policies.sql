    -- PART 3: DATABASE RLS POLICIES
    -- Run this after Part 2

    ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own videos" ON videos
    FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own videos" ON videos
    FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own videos" ON videos
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Users can view own saved templates" ON saved_templates
    FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own saved templates" ON saved_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own saved templates" ON saved_templates
    FOR DELETE USING (auth.uid() = user_id);

    CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
