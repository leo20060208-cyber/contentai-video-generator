-- Update Video Editing Prompt with Full Template using Placeholders
UPDATE site_content 
SET content = '{"prompt": "Recreate the reference video EXACTLY, shot by shot, frame by frame. The ONLY changes allowed are the instructions below. Maintain original camera movement, lighting, and physics.\n\n{{INSERTIONS}}\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: {{DURATION}} seconds. Do not change the speed.\n- Camera movement: identical to original.\n- Lighting: identical direction, intensity, shadows.\n- Physics: realistic material behavior.\n- 8K resolution, high fidelity, photorealistic.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE VIDEO."}'
WHERE section_key = 'video_editing_default_prompt';

-- Update Living Background Prompt with Full Template
UPDATE site_content
SET content = '{"prompt": "Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion.\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: {{DURATION}} seconds. Do not change the speed.\n- Maintain original style and lighting.\n- Photorealistic, high fidelity.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE."}'
WHERE section_key = 'living_background_default_prompt';
