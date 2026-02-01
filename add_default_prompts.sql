-- Add default prompts for Create Yours flows to site_content table
-- These prompts will be editable from the Lab's Default Prompts Editor

-- Create Yours Image default prompt
INSERT INTO site_content (section_key, content) VALUES 
('image_editing_default_prompt', '{"prompt": "RECREATE reference image EXACTLY. Maintain original framing, lighting, and style. Only apply requested modifications."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;

-- Create Yours Video default prompt  
INSERT INTO site_content (section_key, content) VALUES
('video_editing_default_prompt', '{"prompt": "Recreate reference video EXACTLY ({{DURATION}}s). Maintain original camera movement and framing. Only apply specified changes."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;

-- Motion Control specific default prompt (used in MotionControlEditor.tsx)
INSERT INTO site_content (section_key, content) VALUES
('motion_control_default_prompt', '{"prompt": "Create smooth motion control transformation. Maintain lighting and subject consistency."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;
