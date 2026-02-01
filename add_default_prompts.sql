-- Add default prompts for Create Yours flows to site_content table
-- These prompts will be editable from the Lab's Default Prompts Editor

-- Create Yours Image default prompt
INSERT INTO site_content (section_key, content) VALUES 
('image_editing_default_prompt', '{"prompt": "RECREATE this reference image EXACTLY. Maintain the SAME composition, lighting, shadows, colors, perspective, and dimensions. The output must be IDENTICAL to the reference except for the modifications below. STRICT REQUIREMENT: The output MUST have the exact same aspect ratio and framing as the reference image. Do not crop or zoom."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;

-- Create Yours Video default prompt  
INSERT INTO site_content (section_key, content) VALUES
('video_editing_default_prompt', '{"prompt": "Recreate the reference video EXACTLY, shot by shot, frame by frame. The ONLY changes allowed are the instructions below. Maintain original camera movement, lighting, and physics. STRICT RECREATION REQUIREMENTS: EXACT DURATION: {{DURATION}} seconds. Do not change the speed. Preserve framing and aspect ratio perfectly."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;

-- Motion Control specific default prompt (used in MotionControlEditor.tsx)
INSERT INTO site_content (section_key, content) VALUES
('motion_control_default_prompt', '{"prompt": "Create a smooth, cinematic motion control video. Maintain consistency in lighting, style, and subject matter. Ensure natural movement and physics throughout the transformation."}') 
ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content;
