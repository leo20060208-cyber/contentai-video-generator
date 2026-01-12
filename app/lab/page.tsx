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
import { motion, AnimatePresence } from 'framer-motion';
import { CollectionsManager } from '@/components/lab/CollectionsManager';

export default function LabPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'templates' | 'collections' | 'content' | 'guides'>('templates');

    // Auth State
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Allowed email for Lab access
    const ALLOWED_EMAIL = 'leo20060208@gmail.com';

    // Edit State
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);



    // Debug State
    const [debugInfo, setDebugInfo] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [debugError, setDebugError] = useState<string | null>(null);

    // Check user auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUserEmail(user?.email || null);
            } catch (error) {
                console.error('Auth check failed:', error);
                setUserEmail(null);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, []);

    // Fetch Templates
    const fetchTemplates = async () => {
        setLoading(true);
        try {
            // 1. Check for Offline Mode
            if (!isSupabaseConfigured) {
                console.warn('⚠️ Lab Page: Offline Mode - no templates available.');
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
            // Suppress generic "Failed to fetch" errors
            const isNetworkError =
                error.message?.includes('fetch') ||
                error.message?.includes('network') ||
                (typeof error === 'string' && error.includes('fetch'));

            if (isNetworkError) {
                console.warn('⚠️ Lab Page: Offline/Network Error - no templates available.');
                setTemplates([]);
            } else {
                console.error('Error fetching templates:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    // Delete Template
    const handleDelete = async (id: string | number, title: string) => {
        if (!window.confirm(`Are you sure you want to delete "${title}" ? This cannot be undone.`)) return;

        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Refresh templates from database
            await fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    };

    // Access Control
    if (authLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 pt-24 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-zinc-400">Checking access...</p>
                </div>
            </div>
        );
    }

    if (userEmail !== ALLOWED_EMAIL) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 pt-24 text-white flex items-center justify-center">
                <div className="text-center max-w-md bg-zinc-900 p-8 rounded-2xl border border-red-500/20">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-red-400">Access Denied</h1>
                    <p className="text-zinc-500 mb-4">
                        This area is restricted to authorized users only.
                    </p>
                    {userEmail && (
                        <p className="text-xs text-zinc-600">
                            Logged in as: {userEmail}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Offline Check
    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 pt-24 text-white flex items-center justify-center">
                <div className="text-center max-w-md bg-zinc-900 p-8 rounded-2xl border border-white/5">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Supabase Not Configured</h1>
                    <p className="text-zinc-500 mb-6">
                        The application is running in <strong>Offline Mode</strong> because the Supabase URL or Key is missing or invalid in your environment variables.
                    </p>
                    <div className="bg-black/50 p-4 rounded-lg text-xs font-mono text-left space-y-2 overflow-x-auto">
                        <p className={process.env.NEXT_PUBLIC_SUPABASE_URL ? "text-green-400" : "text-red-400"}>
                            URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? `"${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}..."` : "undefined"}
                            <span className="opacity-50 ml-2">({process.env.NEXT_PUBLIC_SUPABASE_URL ? "Loaded" : "Missing"})</span>
                        </p>
                        <p className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-400" : "text-red-400"}>
                            Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `"${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}..."` : "undefined"}
                            <span className="opacity-50 ml-2">({process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Loaded" : "Missing"})</span>
                        </p>
                    </div>
                    <p className="text-xs text-zinc-600 mt-4">Check your .env.local file.</p>
                </div>
            </div>
        );
    }

    // Filter Templates
    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-950 p-8 pt-24 text-white">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex flex-col gap-6 border-b border-zinc-800 pb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                🧪 Template Lab
                            </h1>
                            <p className="text-zinc-400 mt-1">Manage, Create, and Edit your video templates.</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <DefaultPromptsEditor />

                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-4 border-b border-zinc-800">
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Video Templates
                        </button>
                        <button
                            onClick={() => setActiveTab('collections')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'collections' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Collections
                        </button>
                        <button
                            onClick={() => setActiveTab('content')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'content' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Site Content
                        </button>
                        <button
                            onClick={() => setActiveTab('guides')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'guides' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            + Info Guides
                        </button>
                    </div>

                    {activeTab === 'templates' && (
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-end gap-3">
                                {/* Hero Controls - 3 Explicit Buttons */}
                                <div className="flex items-center gap-2 mr-4">
                                    <span className="text-xs text-zinc-600 font-mono mr-2 hidden md:inline-block">PAGE CONTENT:</span>

                                    {/* 1. HERO VIDEO */}
                                    <input
                                        type="file"
                                        id="hero-video-upload"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (!confirm(`Upload ${file.name} as Hero Video?`)) return;
                                            try {
                                                const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                                                const { data, error } = await supabase.storage
                                                    .from('videos')
                                                    .upload(`hero/${filename}`, file);

                                                if (error) throw error;

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('videos')
                                                    .getPublicUrl(`hero/${filename}`);

                                                const { updateHeroContent } = await import('@/lib/db/videos');
                                                await updateHeroContent(publicUrl, 'video');
                                                alert('Hero Video Updated!');
                                            } catch (err) { console.error(err); alert('Error uploading video'); }
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => document.getElementById('hero-video-upload')?.click()}
                                        className="w-10 h-10 p-0 rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                        title="Hero Video Card"
                                    >
                                        <Monitor className="w-4 h-4" />
                                    </Button>

                                    {/* 2. HERO IMAGE */}
                                    <input
                                        type="file"
                                        id="hero-image-upload"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (!confirm(`Upload ${file.name} as Hero Image?`)) return;
                                            try {
                                                const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                                                const { data, error } = await supabase.storage
                                                    .from('videos')
                                                    .upload(`hero/${filename}`, file);

                                                if (error) throw error;

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('videos')
                                                    .getPublicUrl(`hero/${filename}`);

                                                const { updateHeroContent } = await import('@/lib/db/videos');
                                                await updateHeroContent(publicUrl, 'image');
                                                alert('Hero Image Updated!');
                                            } catch (err) { console.error(err); alert('Error uploading image'); }
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => document.getElementById('hero-image-upload')?.click()}
                                        className="w-10 h-10 p-0 rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                        title="Hero Image Card"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                    </Button>

                                    {/* 3. LIBRARY CARD (New) */}
                                    <input
                                        type="file"
                                        id="hero-library-upload"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (!confirm(`Upload ${file.name} as Library Card Content?`)) return;
                                            try {
                                                const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
                                                const { data, error } = await supabase.storage
                                                    .from('videos')
                                                    .upload(`hero/${filename}`, file);

                                                if (error) throw error;

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('videos')
                                                    .getPublicUrl(`hero/${filename}`);

                                                const { updateHeroContent } = await import('@/lib/db/videos');
                                                // @ts-ignore - type 'library' added recently
                                                await updateHeroContent(publicUrl, 'library');
                                                alert('Library Card Content Updated!');
                                            } catch (err) { console.error(err); alert('Error uploading content'); }
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => document.getElementById('hero-library-upload')?.click()}
                                        className="w-10 h-10 p-0 rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                        title="Library Card (Bottom)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h10" /></svg>
                                    </Button>
                                </div>

                                {/* ADD TEMPLATE BUTTON */}
                                <TemplateUploader onUploadComplete={fetchTemplates} />
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'collections' && (
                    <div className="max-w-7xl mx-auto">
                        <CollectionsManager />
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="max-w-4xl mx-auto">
                        <SiteContentEditor />
                    </div>
                )}

                {activeTab === 'guides' && (
                    <div className="max-w-4xl mx-auto">
                        <PlusInfoEditor />
                    </div>
                )}

                {activeTab === 'templates' && (
                    <>
                        {/* Templates Grid */
                            loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredTemplates.map(template => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            key={template.id}
                                            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden group hover:border-orange-500/30 transition-colors"
                                        >
                                            {/* Preview */}
                                            <div className="aspect-[9/16] bg-black relative">
                                                {template.before_video_url ? (
                                                    <video
                                                        src={template.before_video_url}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        loop
                                                        onMouseEnter={e => e.currentTarget.play()}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.pause();
                                                            e.currentTarget.currentTime = 0;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-zinc-700">
                                                        <Video className="w-12 h-12" />
                                                    </div>
                                                )}

                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingTemplate(template);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg"
                                                        title="Edit Template"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(template.id, template.title)}
                                                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                    <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded mb-2 inline-block">
                                                        {template.category}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="p-4">
                                                <h3 className="font-semibold text-white truncate" title={template.title}>{template.title}</h3>
                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                                    {template.description || 'No description'}
                                                </p>

                                                {/* Stats / Requirements */}
                                                <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                                                    <div>
                                                        <span className="block text-zinc-600">ID</span>
                                                        <span className="font-mono truncate">{String(template.id).slice(0, 8)}...</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-zinc-600">Req. Photos</span>
                                                        <span>{template.required_image_count || 1}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                        {!loading && filteredTemplates.length === 0 && (
                            <div className="text-center py-20 text-zinc-500">
                                No templates found. Create one to get started!
                            </div>
                        )}

                        {/* DEBUG SECTION - Only visible when empty */}
                        {filteredTemplates.length === 0 && !loading && (
                            <div className="max-w-7xl mx-auto mt-12 p-6 bg-red-950/20 border border-red-500/20 rounded-xl">
                                <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-xl">🛠️</span> Diagnostics
                                </h3>
                                <p className="text-zinc-400 text-sm mb-4">You are seeing this because the list is empty. Let's find out why.</p>

                                <div className="grid gap-2 text-xs font-mono bg-black/50 p-4 rounded mb-4">
                                    <div>Config Status: <span className={isSupabaseConfigured ? "text-green-500" : "text-red-500"}>{isSupabaseConfigured ? "OK" : "OFFLINE"}</span></div>
                                    <div>Supabase URL: <span className="text-zinc-500">{process.env.NEXT_PUBLIC_SUPABASE_URL}</span></div>
                                    {debugError && <div className="text-red-400 font-bold mt-2">Last Fetch Error: {debugError}</div>}
                                </div>

                                <Button
                                    onClick={async () => {
                                        setDebugInfo("Running test...");
                                        try {
                                            const { count, error } = await supabase.from('templates').select('*', { count: 'exact', head: true });
                                            if (error) throw error;
                                            setDebugInfo({ success: true, count, message: "Connection OK. Table exists." });
                                        } catch (e: any) {
                                            setDebugInfo({ success: false, message: e.message, details: e });
                                        }
                                    }}
                                    variant="secondary"
                                    className="text-xs"
                                >
                                    Run Connection Test
                                </Button>

                                {debugInfo && (
                                    <div className="mt-4">
                                        <pre className="text-[10px] text-zinc-300 overflow-auto max-h-40 bg-black p-2 rounded border border-white/10">
                                            {JSON.stringify(debugInfo, null, 2)}
                                        </pre>

                                        <div className="mt-4 pt-4 border-t border-red-500/20">
                                            <p className="text-xs text-zinc-400 mb-2">If tables are missing, run this in Supabase SQL Editor:</p>
                                            <div className="bg-black p-2 rounded border border-white/10 relative group">
                                                <div className="text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre">
                                                    {`create table if not exists site_content (
  id bigint generated by default as identity primary key,
  section_key text not null unique,
  content jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table site_content enable row level security;
create policy "Public Read" on site_content for select using (true);
create policy "Auth Write" on site_content for insert with check (auth.role() = 'authenticated');
create policy "Auth Update" on site_content for update using (auth.role() = 'authenticated');`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* EDIT MODAL */}
                {isEditModalOpen && editingTemplate && (
                    <TemplateUploader
                        initialData={editingTemplate}
                        isOpen={true}
                        onClose={() => setIsEditModalOpen(false)}
                        onUploadComplete={() => {
                            setIsEditModalOpen(false);
                            fetchTemplates();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// Icon helper since X wasn't imported
function X({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>;
}
