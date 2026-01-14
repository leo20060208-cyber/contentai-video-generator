-- Migration: Add Living Backgrounds and Director's Cut to What We Do page
-- This initializes the content for the new Magic Video features

-- Insert or update the what_we_do_v2 content with Living Backgrounds and Director's Cut data
INSERT INTO public.site_content (section_key, content)
VALUES ('what_we_do_v2', '{
  "createVideoTitle": "VIDEO EDITING",
  "createVideoSteps": [
    {
      "title": "VIDEO EDITING",
      "description": "Upload your raw footage and let AI transform it into viral content.",
      "image": "/images/what-we-do/create-yours-video-1.png",
      "ctaText": "Next"
    },
    {
      "title": "AI Analysis",
      "description": "Our engine analyzes pacing, lighting, and composition to optimize for retention.",
      "image": "/images/what-we-do/create-yours-video-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Viral Result",
      "description": "Get a finished, polished video ready to dominate social media feeds.",
      "image": "/images/what-we-do/create-yours-video-3.png",
      "ctaText": "Start Creating"
    }
  ],
  "recreateVideoTitle": "Recreate Template Video",
  "recreateVideoSteps": [
    {
      "title": "Recreate Template Video",
      "description": "Browse our curated library of high-performing viral video templates.",
      "image": "/images/what-we-do/recreate-template-video-1.png",
      "ctaText": "Next"
    },
    {
      "title": "Insert Product",
      "description": "Seamlessly integrate your product into the narrative with one click.",
      "image": "/images/what-we-do/recreate-template-video-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Generate Magic",
      "description": "Watch as your product becomes the star of a proven viral format.",
      "image": "/images/what-we-do/recreate-template-video-3.png",
      "ctaText": "Browse Templates"
    }
  ],
  "createImageTitle": "IMAGE EDITING",
  "createImageSteps": [
    {
      "title": "IMAGE EDITING",
      "description": "Define your style and vision. From minimalist to extravagant.",
      "image": "/images/what-we-do/create-yours-image-1.png",
      "ctaText": "Next"
    },
    {
      "title": "AI Generation",
      "description": "Advanced algorithms generate stunning visuals tailored to your brand.",
      "image": "/images/what-we-do/create-yours-image-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Masterpiece",
      "description": "Download high-resolution images that stop the scroll instantly.",
      "image": "/images/what-we-do/create-yours-image-3.png",
      "ctaText": "Create Image"
    }
  ],
  "recreateImageTitle": "Recreate Template Image",
  "recreateImageSteps": [
    {
      "title": "Image Editing",
      "description": "Edit materials and details in any interior.",
      "image": "/images/what-we-do/recreate-template-image-1.png",
      "ctaText": "Next"
    },
    {
      "title": "Nano Banana Pro",
      "description": "Powered by Nano Banana Pro",
      "image": "/images/what-we-do/recreate-template-image-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Try Edits Now",
      "description": "Push your creativity to the limit",
      "image": "/images/what-we-do/recreate-template-image-3.png",
      "ctaText": "Try Now"
    }
  ],
  "livingBackgroundsTitle": "LIVING BACKGROUNDS",
  "livingBackgroundsSteps": [
    {
      "title": "Upload Product Photo",
      "description": "Start with a high-res static product image.",
      "image": "/images/what-we-do/create-yours-image-1.png",
      "ctaText": "Next"
    },
    {
      "title": "Paint Background",
      "description": "Brush the areas you want animated. AI keeps product still.",
      "image": "/images/what-we-do/create-yours-image-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Living Video",
      "description": "Get a premium looping video with subtle, natural motion.",
      "image": "/images/what-we-do/create-yours-video-3.png",
      "ctaText": "Animate Now",
      "redirectUrl": "/magic-video/living-backgrounds"
    }
  ],
  "directorsCutTitle": "DIRECTOR''S CUT",
  "directorsCutSteps": [
    {
      "title": "Select Frames",
      "description": "Pick start and end images for your transition.",
      "image": "/images/what-we-do/recreate-template-video-1.png",
      "ctaText": "Next"
    },
    {
      "title": "Add Keyframes",
      "description": "Optional: Add mid frames to guide the animation path.",
      "image": "/images/what-we-do/recreate-template-video-2.png",
      "ctaText": "Next"
    },
    {
      "title": "Cinematic Magic",
      "description": "AI generates smooth, professional transitions between scenes.",
      "image": "/images/what-we-do/recreate-template-video-3.png",
      "ctaText": "Create Cut",
      "redirectUrl": "/magic-video/directors-cut"
    }
  ]
}')
ON CONFLICT (section_key) 
DO UPDATE SET 
  content = site_content.content || EXCLUDED.content,
  updated_at = NOW();
