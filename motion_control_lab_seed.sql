-- Add Motion Control sections to site_content if they don't exist
-- Note: The application uses JSONB for the 'content' column.

-- 1. Motion Control Guide (Plus Info)
-- This usually goes into 'plus_info_pages' key, adding a new entry in the 'pages' object.
-- Since it's a JSONB update, it's easier to handle via application logic, but here is a seed for a new dedicated key if preferred, 
-- though the app expects it inside 'plus_info_pages'.

-- 2. Magic Video Hub - Motion Control Card
-- The app expects 'magic_video_hub' section to have a 'motionControl' key.

-- 3. What We Do - Motion Control Onboarding
-- The app expects 'what_we_do_v2' to have 'motionControlSteps' and 'motionControlTitle'.

-- 4. Seed some initial Motion Control Presets
INSERT INTO prompt_presets (category, name, description, prompt_template, is_default)
VALUES 
('motion_control', 'Cinematic Pan', 'Smooth horizontal camera movement.', 'Cinematic pan shot, high quality, professional lighting.', true),
('motion_control', 'Vertical Reveal', 'Slow vertical reveal for product showcases.', 'Vertical reveal shot from bottom to top, elegant timing.', false)
ON CONFLICT DO NOTHING;

-- If you have a preview video for these, you'd update them later via the Lab.
