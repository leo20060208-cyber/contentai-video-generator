-- Add default prompts for various creation modes
INSERT INTO site_content (section_key, content, updated_at)
VALUES 
    ('living_background_default_prompt', '{"prompt": "Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion. Maintain original style and lighting."}', NOW()),
    ('directors_cut_default_prompt', '{"prompt": "Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence."}', NOW()),
    ('video_editing_default_prompt', '{"prompt": "Edit this video to enhance visual quality, stability, and color grading while maintaining the original content and duration."}', NOW()),
    ('image_editing_default_prompt', '{"prompt": "Edit the image according to the mask and instructions. Maintain the style, lighting, and composition of the original image in the unmasked areas."}', NOW())
ON CONFLICT (section_key) DO NOTHING;
