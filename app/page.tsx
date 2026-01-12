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
