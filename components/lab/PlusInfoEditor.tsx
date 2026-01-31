'use client';

import { useState, useEffect } from 'react';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';
import { Button } from '@/components/ui/Button';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GuideData {
    title: string;
    description: string;
    content: string;
    videoUrl?: string;
}

interface GuidesContent {
    pages: {
        [key: string]: GuideData;
    };
}

const defaultContent: GuidesContent = {
    pages: {
        'video-editing': {
            title: 'Video Editing Guide',
            description: 'Guide for Video Editing',
            videoUrl: '',
            content: '<h2>Video Editing Guide</h2><p>Learn how to use our professional video editing tools.</p>'
        },
        'videos-library': {
            title: 'Using the Video Library',
            description: 'Guide for Video Library',
            videoUrl: '',
            content: '<h2>Video Library Guide</h2><p>How to organize and manage your generated videos.</p>'
        },
        'image-editing': {
            title: 'Image Editing Guide',
            description: 'Guide for Image Editing',
            videoUrl: '',
            content: '<h2>Image Editing Guide</h2><p>Master the art of AI image substitution and masking.</p>'
        },
        'images-library': {
            title: 'Using the Image Library',
            description: 'Guide for Image Library',
            videoUrl: '',
            content: '<h2>Image Library Guide</h2><p>Everything you need to know about your image assets.</p>'
        },
        'living-backgrounds': {
            title: 'Living Backgrounds Guide',
            description: 'Transform static product photos into captivating animated content',
            videoUrl: '',
            content: `<div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> Upload Your Product Image</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Start with a <strong>high-resolution product photo</strong> (minimum 1080p). Ensure your product is well-lit with crisp edges. The AI analyzes the static image to understand depth, lighting, and composition before animating it.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Paint the Background</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Use the <strong>brush tool</strong> to paint over areas you want to animate. Paint the background, atmosphere, or environmental elements—anything EXCEPT your product. The AI will keep your product perfectly still while bringing the painted areas to life with subtle, natural motion.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Choose Duration & Generate</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Select between <strong>5s or 10s</strong> duration. Shorter videos work better for social feeds. Add optional context images to guide the animation style. Click Generate and watch as your static photo transforms into a premium, looping video perfect for ads and social media.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">💡</span> Pro Tips</h2>
                    <ul class="text-zinc-400 leading-relaxed pl-11 space-y-2 list-disc list-inside">
                        <li>Paint broadly for <strong>atmospheric effects</strong> (smoke, mist, light rays)</li>
                        <li>Avoid painting on the product itself to maintain crisp focus</li>
                        <li>Use the <strong>eraser</strong> to refine your mask precisely</li>
                        <li>Works best with products that have distinct separation from background</li>
                    </ul>
                </section>
            </div>`
        },
        'directors-cut': {
            title: "Director's Cut Guide",
            description: 'Create cinematic transitions between multiple scenes',
            videoUrl: '',
            content: `<div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> Select Start & End Frames</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Upload your <strong>start image</strong> and <strong>end image</strong>. These define the beginning and end of your video. Choose images with similar lighting and perspective for smoother transitions. The AI will generate the motion between them.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Add Middle Keyframes (Optional)</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">For complex transitions, add <strong>mid frames</strong> to guide the animation path. Each mid frame acts as a waypoint the AI must pass through. Perfect for showing product transformations, color changes, or multi-step reveals.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Customize the Transition</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Write a custom prompt to describe how the transition should behave: "smooth morph," "explosive reveal," "dreamy dissolve," etc. Choose <strong>5s or 10s</strong> duration and aspect ratio. Then generate your cinematic sequence.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">💡</span> Best Use Cases</h2>
                    <ul class="text-zinc-400 leading-relaxed pl-11 space-y-2 list-disc list-inside">
                        <li><strong>Product transformations</strong>: Show before/after, color variants</li>
                        <li><strong>Scene transitions</strong>: Move from one environment to another</li>
                        <li><strong>Story sequences</strong>: Create multi-shot narratives</li>
                        <li><strong>Brand reveals</strong>: Build anticipation with staged reveals</li>
                    </ul>
                </section>
            </div>`
        },
        'motion-control': {
            title: 'Motion Control Guide',
            description: 'Precise AI camera control for your products',
            videoUrl: '',
            content: `<div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> Reference Video</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Upload a <strong>reference video</strong> that contains the motion you want to replicate. The AI will analyze the camera movement and subject interaction from this video.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Target Image</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Upload your <strong>product photo</strong>. This is the content that will be animated. For best results, use high-quality images with good lighting that match the general vibe of the reference.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Select Preset & Generate</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Choose a <strong>motion preset</strong> from the library on the right to stack additional camera effects, or leave it blank to just follow the reference video. Choose Quality and hit Generate.</p>
                </section>
            </div>`
        },
        'instant-clips': {
            title: 'Instant Clips Guide',
            description: 'One-click product videos',
            videoUrl: '',
            content: '<h2>Instant Clips</h2><p>Generate high-converting ads from a single photo.</p>'
        },
        'terms': {
            title: 'Terms of Service',
            description: 'Policies and Legal',
            videoUrl: '',
            content: '<h2>Terms of Service</h2><p>User agreement and AI rights.</p>'
        },
        'privacy': {
            title: 'Privacy Policy',
            description: 'Data and Privacy',
            videoUrl: '',
            content: '<h2>Privacy Policy</h2><p>How we handle your data.</p>'
        }
    }
};

export function PlusInfoEditor() {
    const [content, setContent] = useState<GuidesContent>(defaultContent);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('video-editing');

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        setLoading(true);
        try {
            const data = await getSectionContent('plus_info_pages');
            if (data && data.pages) {
                setContent(data);
            }
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSectionContent('plus_info_pages', content);
            alert('Guides content saved successfully!');
        } catch (error) {
            console.error('Failed to save content:', error);
            alert('Failed to save content');
        } finally {
            setSaving(false);
        }
    };

    const updateGuide = (slug: string, field: keyof GuideData, value: string) => {
        setContent(prev => ({
            ...prev,
            pages: {
                ...prev.pages,
                [slug]: {
                    ...prev.pages[slug],
                    [field]: value
                }
            }
        }));
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `guides/${activeTab}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            updateGuide(activeTab, 'videoUrl', publicUrl);
        } catch (error) {
            console.error('Error uploading video:', error);
            alert('Error uploading video. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

    const tabs = [
        { id: 'video-editing', label: 'Video Edit' },
        { id: 'image-editing', label: 'Image Edit' },
        { id: 'living-backgrounds', label: 'Living BG' },
        { id: 'directors-cut', label: "Director's" },
        { id: 'motion-control', label: 'Motion' },
        { id: 'instant-clips', label: 'Clips' },
        { id: 'terms', label: 'Terms' },
        { id: 'privacy', label: 'Privacy' },
    ];

    const currentGuide = content.pages[activeTab] || defaultContent.pages[activeTab] || {
        title: '',
        description: '',
        content: ''
    };

    return (
        <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-white/5">
            <div className="flex justify-between items-center pb-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Edit "+ Info" Guides</h2>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-transparent'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Editor */}
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Page Title</label>
                    <input
                        type="text"
                        value={currentGuide?.title || ''}
                        onChange={(e) => updateGuide(activeTab, 'title', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none font-bold"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Description</label>
                    <input
                        type="text"
                        value={currentGuide?.description || ''}
                        onChange={(e) => updateGuide(activeTab, 'description', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-orange-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Video Tutorial URL (Upload or Paste)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="https://example.com/video.mp4"
                            value={currentGuide?.videoUrl || ''}
                            onChange={(e) => updateGuide(activeTab, 'videoUrl', e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-orange-500 outline-none font-mono"
                        />
                        <div className="relative">
                            <input
                                type="file"
                                id="video-upload"
                                className="hidden"
                                accept="video/mp4,video/webm"
                                onChange={handleVideoUpload}
                                disabled={uploading}
                            />
                            <label
                                htmlFor="video-upload"
                                className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? 'Uploading...' : 'Upload'}
                            </label>
                        </div>
                    </div>
                    {currentGuide?.videoUrl && (
                        <div className="mt-2 relative aspect-video w-48 rounded overflow-hidden border border-white/10 group">
                            <video src={currentGuide.videoUrl} className="w-full h-full object-cover" />
                            <button
                                onClick={() => updateGuide(activeTab, 'videoUrl', '')}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Content (HTML)</label>
                    <textarea
                        value={currentGuide?.content || ''}
                        onChange={(e) => updateGuide(activeTab, 'content', e.target.value)}
                        className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded p-4 text-sm text-zinc-300 focus:border-orange-500 outline-none font-mono"
                    />
                    <p className="text-[10px] text-zinc-500 mt-2">
                        Use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; for formatting. No emoticons.
                    </p>
                </div>
            </div>
        </div>
    );
}
