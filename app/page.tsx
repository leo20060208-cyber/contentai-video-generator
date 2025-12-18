'use client';

import { useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy load the video library preview to speed up initial page load
const VideoLibraryPreview = dynamic(
  () => import('@/components/landing/VideoLibraryPreview').then(mod => mod.VideoLibraryPreview),
  {
    loading: () => <div className="h-[500px] w-full bg-zinc-950 flex items-center justify-center text-zinc-600">Loading library...</div>,
    ssr: true
  }
);

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      {/* Hero Section */}
      <Hero
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Video Library Preview - Filtered by selected category */}
      <VideoLibraryPreview selectedCategory={selectedCategory} />

      {/* Simple Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-orange-500 font-black text-lg">
            contentai
          </Link>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/videos" className="hover:text-white transition-colors">Library</Link>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
          <p className="text-xs text-zinc-500">
            © 2024 ContentAI
          </p>
        </div>
      </footer>
    </div>
  );
}
