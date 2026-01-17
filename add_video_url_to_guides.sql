-- SQL to add 'videoUrl' field to all existing guide pages within the 'plus_info_pages' section.
-- This script preserves existing content (title, description, html content) and simply appends the empty videoUrl field.

UPDATE site_content
SET content = jsonb_set(
    content, 
    '{pages}', 
    (
        SELECT jsonb_object_agg(
            key, 
            value || '{"videoUrl": ""}'::jsonb
        )
        FROM jsonb_each(content->'pages')
    )
)
WHERE section_key = 'plus_info_pages';

-- If you want to verify the update:
-- SELECT content FROM site_content WHERE section_key = 'plus_info_pages';
