import { Hero } from '@/components/landing/Hero';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Revalidate immediately for fresh content
export const revalidate = 0;

// Server-side safe Supabase client for public data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getHeroTemplate(type: 'video' | 'image' | 'library') {
  try {
    const tag = `[HERO_${type.toUpperCase()}]`;
    const { data } = await supabase
      .from('templates')
      .select('*')
      .ilike('description', `%${tag}%`)
      .limit(1)
      .maybeSingle();
    return data;
  } catch (e) {
    return null;
  }
}

async function getSectionContent(sectionKey: string) {
  try {
    const { data } = await supabase
      .from('site_content')
      .select('content')
      .eq('section_key', sectionKey)
      .maybeSingle();
    return data?.content;
  } catch (e) {
    return null;
  }
}

async function getLandingPageData() {
  try {
    // We wrap everything in a promise that resolves anyway after 1.5 seconds if DB is slow
    const dataFetch = Promise.all([
      getSectionContent('what_we_do_v2'),
      getSectionContent('magic_video_hub'),
      getHeroTemplate('video'),
      getHeroTemplate('image')
    ]);

    const [libContent, magicConfig, heroVideo, heroImage] = await dataFetch;

    console.log('>>> [HomePage] Hero Video:', heroVideo?.title, heroVideo?.after_video_url);
    console.log('>>> [HomePage] Hero Image:', heroImage?.title, heroImage?.after_image_url);

    return {
      heroVideo,
      heroImage,
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
      <Hero initialData={initialData} />

      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-orange-500 font-black text-lg">contentai</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/videos" className="text-zinc-400 hover:text-white transition-colors">Library</Link>
            <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-zinc-500">© 2024 ContentAI</p>
        </div>
      </footer>
    </div>
  );
}
