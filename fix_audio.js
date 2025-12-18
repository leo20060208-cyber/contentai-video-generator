const fs = require('fs');

// Read the file
let content = fs.readFileSync('c:/Users/Convidats/Downloads/videosandanimations/videosandanimations/app/studio/page.tsx', 'utf8');

// Simple string replacement - find the problematic lines
content = content.replace(
    /\/\/ Audio loaded in tracks/g,
    `} else {
            // Extract audio from video URL
            setIsExtractingAudio(true);
            try {
                const response = await fetch(video.video_url);
                const blob = await response.blob();
                const file = new File([blob], 'video.mp4', { type: 'video/mp4' });
                await extractAudioFromVideo(file);
            } catch (error) {
                console.error('Error extracting audio:', error);
                setIsExtractingAudio(false);
            }`
);

// Write back
fs.writeFileSync('c:/Users/Convidats/Downloads/videosandanimations/videosandanimations/app/studio/page.tsx', content, 'utf8');

console.log('✅ Function fixed successfully!');
