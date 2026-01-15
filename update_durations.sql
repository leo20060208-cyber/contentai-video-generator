-- Check existing durations
SELECT id, title, duration FROM templates;

-- Update template durations (Example values, user needs to run this or we need to extract metadata)
-- For the specific case mentioned (User likely wants accurate durations)
-- Since we can't automatically know the duration of existing video URLs without processing them,
-- we'll set a default that isn't 5 if it's missing, OR the user might need to manually update them.
-- BUT, primarily, we should ensure the column exists and has reasonable defaults.

-- If the user specifically mentioned an 11s video, likely ID 57 (from URL in screenshot recreate/57).
UPDATE templates SET duration = 11 WHERE id = 57;

-- Generic update for testing (if needed, but better to target specific ones)
-- UPDATE templates SET duration = 10 WHERE duration IS NULL;
