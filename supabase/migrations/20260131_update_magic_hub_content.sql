-- Migration: Update Magic Video Hub content to include all 4 cards
-- This ensures they can be edited via the CMS (modifying the JSON).

-- We use jsonb_set or straight update to merge the new structure.
-- Structure:
-- {
--   "livingBackgrounds": { ... },
--   "directorsCut": { ... },
--   "recreateVideo": { ... },   <-- Previously missing or hardcoded
--   "motionControl": { ... }    <-- New
-- }

INSERT INTO public.site_content (section_key, content)
VALUES ('magic_video_hub', '{
    "livingBackgrounds": {
        "mediaType": "image",
        "mediaUrl": "/images/what-we-do/recreate-template-video-1.png",
        "link": "/magic-video/living-backgrounds",
        "title": "Living Backgrounds",
        "description": "POWERED BY KLING AI"
    },
    "directorsCut": {
        "mediaType": "image",
        "mediaUrl": "/images/what-we-do/create-yours-video-1.png",
        "link": "/magic-video/directors-cut",
        "title": "Image to Video",
        "description": "POWERED BY SORA 2"
    },
    "recreateVideo": {
        "mediaType": "image",
        "mediaUrl": "/images/what-we-do/recreate-template-video-3.png",
        "link": "/create-yours",
        "title": "Video Editing",
        "description": "POWERED BY KLING AI"
    },
    "motionControl": {
        "mediaType": "image",
        "mediaUrl": "/images/what-we-do/recreate-template-video-2.png",
        "link": "/magic-video/motion-control",
        "title": "Motion Control",
        "description": "POWERED BY LUMA DREAM MACHINE"
    }
}')
ON CONFLICT (section_key) DO UPDATE 
SET content = EXCLUDED.content;
