'use client';

import { useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import Link from 'next/link';
import dynamic from 'next/dynamic';




export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <Hero
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
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
