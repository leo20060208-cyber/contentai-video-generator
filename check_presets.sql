-- Query to check preset toggle values in the database
SELECT 
    section_key,
    content,
    content->>'enabled' as enabled_value,
    pg_typeof(content) as content_type,
    updated_at
FROM site_content
WHERE section_key IN ('living_background_presets_enabled', 'transition_presets_enabled')
ORDER BY section_key;
