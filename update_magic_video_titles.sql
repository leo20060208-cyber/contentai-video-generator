-- Update the magic_video_hub configuration to include custom titles and descriptions
UPDATE site_content
SET content = jsonb_set(
    jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        content,
                        '{livingBackgrounds,title}',
                        '"Living Backgrounds"'
                    ),
                    '{livingBackgrounds,description}',
                    '"Animate products with high-end motion"'
                ),
                '{directorsCut,title}',
                '"Director''s Cut"'
            ),
            '{directorsCut,description}',
            '"Professional scene-to-scene transitions"'
        ),
        '{instantClips,title}',
        '"Instant Product Clips"'
    ),
    '{instantClips,description}',
    '"Magic is cooking..."'
)
WHERE section_key = 'magic_video_hub';
