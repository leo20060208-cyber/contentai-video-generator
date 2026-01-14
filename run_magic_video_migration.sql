-- Run this SQL in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste this -> Run

-- Migration: Create magic_video_tasks table for tracking video generation
-- This table stores the status of video generation tasks from Wavespeed

CREATE TABLE IF NOT EXISTS public.magic_video_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('living-backgrounds', 'directors-cut')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    input_data JSONB NOT NULL,
    result_video_url TEXT,
    credits_cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_magic_video_tasks_user_id ON public.magic_video_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_video_tasks_task_id ON public.magic_video_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_magic_video_tasks_status ON public.magic_video_tasks(status);

-- RLS Policies
ALTER TABLE public.magic_video_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
DROP POLICY IF EXISTS "Users can view own magic video tasks" ON public.magic_video_tasks;
CREATE POLICY "Users can view own magic video tasks"
    ON public.magic_video_tasks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own tasks
DROP POLICY IF EXISTS "Users can create own magic video tasks" ON public.magic_video_tasks;
CREATE POLICY "Users can create own magic video tasks"
    ON public.magic_video_tasks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
DROP POLICY IF EXISTS "Users can update own magic video tasks" ON public.magic_video_tasks;
CREATE POLICY "Users can update own magic video tasks"
    ON public.magic_video_tasks
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully! magic_video_tasks table created.';
END $$;
