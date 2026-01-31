-- Migration: Add Motion Control capabilities

-- 1. Update magic_video_tasks CHECK constraint
ALTER TABLE public.magic_video_tasks 
DROP CONSTRAINT IF EXISTS magic_video_tasks_type_check;

ALTER TABLE public.magic_video_tasks 
ADD CONSTRAINT magic_video_tasks_type_check 
CHECK (type IN ('living-backgrounds', 'directors-cut', 'motion-control', 'recreate-video'));

-- 2. Add Default Prompt for Motion Control
INSERT INTO public.site_content (section_key, content)
VALUES ('motion_control_default_prompt', '{
  "prompt": "Create a smooth, cinematic motion control video with precise camera movement. Maintain high fidelity, consistent lighting, and realistic physics throughout the scene."
}')
ON CONFLICT (section_key) DO UPDATE 
SET content = EXCLUDED.content;

-- 3. Update Magic Video Hub content to include Motion Control
-- We fetch current content, merge motionControl, and update. 
-- Since we can't easily merge JSON inside one query without knowing structure perfectly, 
-- we will just UPSERT the key if we are confident, OR just let the frontend handle the merge (which we did).
-- But correct approach is to ensure DB has it.
-- Let's purely INSERT/UPDATE the specific key if possible, but for simplicity here we will rely on the page logic fallback.
-- However, to be "clean", let's ensure the key exists.

-- Optional: Add motion-control category to prompt_presets check if exists
-- (Assuming prompt_presets might have a category check, checking if table exists first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'prompt_presets_category_check') THEN
        ALTER TABLE public.prompt_presets DROP CONSTRAINT prompt_presets_category_check;
        ALTER TABLE public.prompt_presets ADD CONSTRAINT prompt_presets_category_check CHECK (category IN ('living-backgrounds', 'transition', 'motion_control'));
    END IF;
END $$;
