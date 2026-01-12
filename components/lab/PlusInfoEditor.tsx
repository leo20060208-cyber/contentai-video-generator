'use client';

import { useState, useEffect } from 'react';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';
import { Button } from '@/components/ui/Button';
import { Loader2, Save } from 'lucide-react';

interface GuideData {
    title: string;
    description: string;
    content: string;
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
            content: '<p>Content here...</p>'
        },
        'videos-library': {
            title: 'Using the Video Library',
            description: 'Guide for Video Library',
            content: '<p>Content here...</p>'
        },
        'image-editing': {
            title: 'Image Editing Guide',
            description: 'Guide for Image Editing',
            content: '<p>Content here...</p>'
        },
        'images-library': {
            title: 'Using the Image Library',
            description: 'Guide for Image Library',
            content: '<p>Content here...</p>'
        }
    }
};

export function PlusInfoEditor() {
    const [content, setContent] = useState<GuidesContent>(defaultContent);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

    const tabs = [
        { id: 'video-editing', label: 'Video Editing' },
        { id: 'videos-library', label: 'Video Library' },
        { id: 'image-editing', label: 'Image Editing' },
        { id: 'images-library', label: 'Image Library' },
    ];

    const currentGuide = content.pages[activeTab] || defaultContent.pages[activeTab];

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
                        value={currentGuide.title}
                        onChange={(e) => updateGuide(activeTab, 'title', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none font-bold"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Description</label>
                    <input
                        type="text"
                        value={currentGuide.description}
                        onChange={(e) => updateGuide(activeTab, 'description', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-orange-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Content (HTML)</label>
                    <textarea
                        value={currentGuide.content}
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
