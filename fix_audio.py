import re

# Read the file
with open('c:/Users/Convidats/Downloads/videosandanimations/videosandanimations/app/studio/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the handleVideoSelect function
old_pattern = r'const handleVideoSelect = async \(video: Video\) => \{[^}]*setCurrentVideo\(video\.video_url\);[^}]*setShowVideoSelector\(false\);[^}]*if \(video\.audio_url\) \{[^}]*setAudioTracks\(\[\{[^}]*\}\]\);[^}]*// Audio loaded in tracks[^}]*\}[^}]*\};'

new_function = '''const handleVideoSelect = async (video: Video) => {
        setCurrentVideo(video.video_url);
        setShowVideoSelector(false);
        
        // Load audio if available
        if (video.audio_url) {
            setAudioTracks([{
                id: '1',
                url: video.audio_url,
                duration: video.audio_duration || 0,
                trimStart: 0,
                trimEnd: video.audio_duration || 0,
                volume: 1,
                name: 'Audio Original'
            }]);
        } else {
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
            }
        }
    };'''

# Replace
content = re.sub(old_pattern, new_function, content, flags=re.DOTALL)

# Write back
with open('c:/Users/Convidats/Downloads/videosandanimations/videosandanimations/app/studio/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Function replaced successfully!")
