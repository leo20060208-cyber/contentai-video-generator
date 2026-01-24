'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { TemplateUploader } from '@/components/admin/TemplateUploader';
import { DefaultPromptsEditor } from '@/components/lab/DefaultPromptsEditor';
import { SiteContentEditor } from '@/components/lab/SiteContentEditor';
import { PlusInfoEditor } from '@/components/lab/PlusInfoEditor';
import { Button } from '@/components/ui/Button';
import {
    Trash2,
    Edit2,
    Plus,
    Loader2,
    Video,
    Search,
    Sparkles,
    Monitor,
    ImageIcon,
    LayoutGrid
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CollectionsManager } from '@/components/lab/CollectionsManager';
import { MagicVideoManager } from '@/components/lab/MagicVideoManager';

import { PromptPresetsManager } from '@/components/lab/PromptPresetsManager';
import { FaqsManager } from '@/components/lab/FaqsManager';
import { InquiriesManager } from '@/components/lab/InquiriesManager';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LabPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'templates' | 'collections' | 'content' | 'guides' | 'magic' | 'presets' | 'faqs' | 'inquiries'>('templates');

    // Auth State
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

    // Edit State
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Check user auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || user.email !== 'leo20060208@gmail.com') {
                    setIsAuthorized(false);
                } else {
                    setIsAuthorized(true);
                    setUserEmail(user.email);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthorized(false);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    // Fetch Templates
    const fetchTemplates = async () => {
        setLoading(true);
        try {
            if (!isSupabaseConfigured) {
                setTemplates([]);
                return;
            }

            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error: any) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-zinc-400 mb-8">
                        You do not have permission to access the ContentAI Lab. This area is restricted to administrators only.
                    </p>
                    <Button
                        onClick={() => router.push('/')}
                        className="w-full bg-white text-black hover:bg-zinc-200"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }



    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            const { error } = await supabase.from('templates').delete().eq('id', id);
            if (error) throw error;
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    return (
        <div className="min-h-screen bg-black pt-20 pb-10 px-4">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">ContentAI Lab</h1>
                    <div className="text-xs text-zinc-500 font-mono">
                        {userEmail ? `Logged in as: ${userEmail}` : 'Not logged in'}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'templates' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('collections')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'collections' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Collections
                    </button>
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'content' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Site Content
                    </button>
                    <button
                        onClick={() => setActiveTab('guides')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'guides' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Plus Info
                    </button>
                    <button
                        onClick={() => setActiveTab('magic')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'magic' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Magic Video
                    </button>
                    <button
                        onClick={() => setActiveTab('presets')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'presets' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Presets
                    </button>
                    <button
                        onClick={() => setActiveTab('faqs')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'faqs' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        FAQs
                    </button>
                    <button
                        onClick={() => setActiveTab('inquiries')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'inquiries' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Inquiries
                    </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'templates' && (
                        <motion.div
                            key="templates"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* ... Template Uploader & List ... */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <TemplateUploader onUploadComplete={fetchTemplates} onClose={() => { setEditingTemplate(null); setIsEditModalOpen(false); }} initialData={editingTemplate} />
                                </div>
                                <div className="lg:col-span-2">
                                    <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                                        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-zinc-950">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search templates..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                                                />
                                            </div>
                                            <div className="text-xs text-zinc-500 font-mono">
                                                {templates.length} TEMPLATES
                                            </div>
                                        </div>
                                        <div className="divide-y divide-white/5 max-h-[800px] overflow-y-auto">
                                            {loading ? (
                                                <div className="p-8 text-center text-zinc-500">Loading templates...</div>
                                            ) : templates.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                                <div className="p-8 text-center text-zinc-500">No templates found.</div>
                                            ) : (
                                                templates.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map((template) => (
                                                    <div key={template.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                                                                {template.after_video_url || template.video_url ? (
                                                                    <video src={template.after_video_url || template.video_url} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600"><Video className="w-6 h-6" /></div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-white text-sm">{template.title}</h3>
                                                                <p className="text-xs text-zinc-500 line-clamp-1">{template.description}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400 capitalize">{template.category}</span>
                                                                    {template.is_pro && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] uppercase font-bold">PRO</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { setEditingTemplate(template); setIsEditModalOpen(true); }}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(template.id)}
                                                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'collections' && (
                        <motion.div
                            key="collections"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <CollectionsManager />
                        </motion.div>
                    )}

                    {activeTab === 'content' && (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <SiteContentEditor />
                        </motion.div>
                    )}

                    {activeTab === 'guides' && (
                        <motion.div
                            key="guides"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PlusInfoEditor />
                        </motion.div>
                    )}

                    {activeTab === 'magic' && (
                        <motion.div
                            key="magic"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <MagicVideoManager />
                            <div className="mt-8">
                                <DefaultPromptsEditor />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'presets' && (
                        <motion.div
                            key="presets"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PromptPresetsManager />
                        </motion.div>
                    )}

                    {activeTab === 'faqs' && (
                        <motion.div
                            key="faqs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <FaqsManager />
                        </motion.div>
                    )}


                    {activeTab === 'inquiries' && (
                        <motion.div
                            key="inquiries"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <InquiriesManager />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
