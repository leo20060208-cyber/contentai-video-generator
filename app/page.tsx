import { Hero } from '@/components/landing/Hero';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Server-side safe Supabase client for public data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getHeroTemplate(type: 'video' | 'image' | 'library') {
  const tag = `[HERO_${type.toUpperCase()}]`;
  const { data } = await supabase
    .from('templates')
    .select('*')
    .ilike('description', `%${tag}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function getSectionContent(sectionKey: string) {
  const { data } = await supabase
    .from('site_content')
    .select('content')
    .eq('section_key', sectionKey)
    .single();
  return data?.content;
}

async function getLandingPageData() {
  try {
    const [vid, img, lib, libContent, magicConfig] = await Promise.all([
      getHeroTemplate('video'),
      getHeroTemplate('image'),
      getHeroTemplate('library'),
      getSectionContent('what_we_do_v2'),
      getSectionContent('magic_video_hub')
    ]);

    return {
      heroVideo: vid,
      heroImage: img,
      libraryContent: libContent,
      magicVideoConfig: magicConfig
    };
  } catch (e) {
    console.error("Failed to load hero content", e);
    return {
      heroVideo: null,
      heroImage: null,
      libraryContent: null,
      magicVideoConfig: null
    };
  }
}

export default async function HomePage() {
  const initialData = await getLandingPageData();

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <Hero
        initialData={initialData}
      />

      {/* Video Library Preview Removed as per user request */}

      {/* Simple Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-orange-500 font-black text-lg">
            contentai
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/videos" className="text-zinc-400 hover:text-white transition-colors">Library</Link>
            <Link
              href="/terms"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 hover:border-white/20 rounded-lg transition-all font-medium text-xs uppercase tracking-wider"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-lg transition-all font-bold text-xs uppercase tracking-wider"
            >
              Privacy
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            © 2024 ContentAI
          </p>
        </div>
      </footer>
    </div>
  );
}
