-- Add project_data column to videos table to store editor state
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS project_data JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow updating project_data
create policy "Users can update their own videos"
on videos for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
