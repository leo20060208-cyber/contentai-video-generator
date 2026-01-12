CREATE TABLE IF NOT EXISTS site_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_key TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default content for 'what_we_do'
INSERT INTO site_content (section_key, content)
VALUES (
    'what_we_do',
    '{
        "title": "WHY TOP BRANDS CHOOSE CONTENTAI",
        "description": "Stop guessing. Start dominating. We replace products in viral videos and images with YOURS using military-grade AI technology.",
        "features": [
            {
                "title": "Viral Video Recreation",
                "description": "Upload a viral video template and your product image. Our AI seamlessly inserts your product into the video, matching lighting, physics, and movement.",
                "tags": ["Physics Engine", "Real-time Rendering"],
                "icon": "Sparkles",
                "color": "orange",
                "reference_image": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=100&auto=format&fit=crop",
                "product_image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=100&auto=format&fit=crop",
                "result_image": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop",
                "result_label": "AI GENERATED RESULT"
            },
            {
                "title": "Viral Image Recreation",
                "description": "Turn boring product photos into lifestyle masterpieces. Insert your product into any viral setting, luxury environment, or dynamic background instantly.",
                "tags": ["4K Quality", "Generative Fill"],
                "icon": "Sparkles",
                "color": "purple",
                "reference_image": "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=100&auto=format&fit=crop",
                "product_image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=100&auto=format&fit=crop",
                "result_image": "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&auto=format&fit=crop",
                "result_label": "AI STUDIOSHOT"
            },
            {
                "title": "Pre-Vetted Analytics Library",
                "description": "Don''t know what works? We analyze millions of videos to curate templates guaranteed to stop the scroll. High-retention formats ready for your brand.",
                "tags": ["ROI Optimized", "Trend Analysis"],
                "icon": "Film",
                "color": "blue"
            }
        ]
    }'::jsonb
) ON CONFLICT (section_key) DO NOTHING;
