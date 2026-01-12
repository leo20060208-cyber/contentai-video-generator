-- Add default prompts for Create Yours flows to site_content table
-- These prompts will be editable from the Lab's Default Prompts Editor

-- Create Yours Image default prompt
INSERT INTO site_content (section_key, content) VALUES 
('create_yours_image_default_prompt', '{"prompt": "RECREATE this reference image EXACTLY. Maintain the SAME composition, lighting, shadows, colors, perspective, and dimensions. The output must be IDENTICAL to the reference except for the modifications below."}') 
ON CONFLICT (section_key) DO NOTHING;

-- Create Yours Video default prompt  
INSERT INTO site_content (section_key, content) VALUES
('create_yours_video_default_prompt', '{"prompt": "Transform this video while maintaining the core action, movement, and camera work. Replace the specified product seamlessly into the scene, matching lighting, perspective, and physics perfectly."}')
ON CONFLICT (section_key) DO NOTHING;
