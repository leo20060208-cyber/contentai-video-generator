-- Add template_type column explicitly
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'recreate';

-- Add description column if it doesn't exist
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing templates
UPDATE templates SET template_type = 'recreate' WHERE template_type IS NULL;

-- Insert the test Inpainting Template (safe insert)
INSERT INTO templates (
    title, 
    category, 
    before_image_url, 
    after_image_url, 
    before_video_url, 
    after_video_url, 
    views_count, 
    is_trending, 
    template_type,
    description
) VALUES (
    'Magic Object Removal',
    'VIDEO_EDITING',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    '5.2k',
    true,
    'inpainting',
    'Remove unwanted objects or modify specific areas of your video.'
);
