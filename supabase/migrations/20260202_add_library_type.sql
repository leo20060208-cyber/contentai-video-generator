-- Add library_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pf_columns WHERE table_name = 'templates' AND column_name = 'library_type') THEN
        ALTER TABLE templates ADD COLUMN library_type TEXT;
    END IF;
END $$;

-- Update existing columns if needed (they should exist from previous steps)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pf_columns WHERE table_name = 'templates' AND column_name = 'is_explore') THEN
        ALTER TABLE templates ADD COLUMN is_explore BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pf_columns WHERE table_name = 'templates' AND column_name = 'explore_grid_cols') THEN
        ALTER TABLE templates ADD COLUMN explore_grid_cols INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pf_columns WHERE table_name = 'templates' AND column_name = 'explore_grid_rows') THEN
        ALTER TABLE templates ADD COLUMN explore_grid_rows INTEGER DEFAULT 1;
    END IF;
END $$;
