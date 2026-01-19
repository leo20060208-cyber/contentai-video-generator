-- Update the magic_video_hub configuration to include new titles and descriptions
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
                    '"POWERED BY KLING AI"'
                ),
                '{directorsCut,title}',
                '"Image to Video"'
            ),
            '{directorsCut,description}',
            '"POWERED BY SORA 2"'
        ),
        '{instantClips,title}',
        '"Instant Product Clips"'
    ),
    '{instantClips,description}',
    '"COMING SOON"'
)
WHERE section_key = 'magic_video_hub';
