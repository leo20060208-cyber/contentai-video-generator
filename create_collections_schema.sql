-- Create Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('video', 'image')),
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Policies for collections
CREATE POLICY "Users can view all collections" ON collections
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);

-- Create Collection Items Junction Table
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, template_id)
);

-- Enable Row Level Security
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Policies for collection_items
CREATE POLICY "Users can view all collection items" ON collection_items
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own collection items" ON collection_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE id = collection_items.collection_id
            AND user_id = auth.uid()
        )
    );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
