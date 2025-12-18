'use client';

import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { VideoTemplate } from '@/types/template.types';
import { Template as DBTemplate } from '@/lib/db/videos';
import { cn } from '@/lib/utils/cn';
import { useState, memo } from 'react';
import { supabase } from '@/lib/supabase';

interface TemplateCardProps {
  template: VideoTemplate | DBTemplate;
  className?: string;
}

const TemplateCardComponent = ({ template, className }: TemplateCardProps) => {
  const [isTrending, setIsTrending] = useState((template as any).is_trending || false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper to extract common fields
  const getThumbnail = (t: any) => t.thumbnailUrl || t.before_image_url || t.before_video_url;
  const getId = (t: any) => t.id;
  const getTitle = (t: any) => t.title;
  const getDescription = (t: any) => t.description;
  const getCategory = (t: any) => t.category;

  const id = getId(template);

  const toggleTrending = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🌟 Toggle trending clicked for template ID:', id);
    console.log('📊 Current trending status:', isTrending);
    console.log('📦 Template object:', template);

    if (isUpdating) {
      console.log('⏳ Already updating, skipping...');
      return;
    }

    setIsUpdating(true);
    const newTrendingStatus = !isTrending;
    console.log('✨ New trending status will be:', newTrendingStatus);

    try {
      console.log('💾 Updating database...');
      const { data, error } = await supabase
        .from('templates')
        .update({ is_trending: newTrendingStatus })
        .eq('id', id)
        .select();

      console.log('📡 Database response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Successfully updated! Setting local state...');
      setIsTrending(newTrendingStatus);
      console.log('🎯 Local state updated to:', newTrendingStatus);

      // Show success message
      alert(`Template ${newTrendingStatus ? 'marked as' : 'removed from'} trending!`);
    } catch (error: any) {
      console.error('💥 Error updating trending status:', error);
      alert('Failed to update trending status: ' + error.message);
    } finally {
      setIsUpdating(false);
      console.log('🏁 Update complete');
    }
  };

  return (
    <Link href={`/recreate/${id}`}>
      <motion.div
        className={cn(
          'group relative rounded-2xl overflow-hidden bg-[#111] border border-white/10 hover:border-primary/50 transition-all duration-300',
          className
        )}
        whileHover={{ y: -5 }}
      >
        {/* Thumbnail */}
        <div className="aspect-[9/16] relative overflow-hidden bg-zinc-900">
          {getThumbnail(template) ? (
            <Image
              src={getThumbnail(template)}
              alt={getTitle(template)}
              fill
              className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700">
              <Play className="w-12 h-12 opacity-20" />
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Star Button - Top Right */}
          <button
            onClick={toggleTrending}
            disabled={isUpdating}
            className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg ${isTrending
              ? 'bg-orange-500 text-white shadow-orange-500/50'
              : 'bg-black/60 text-zinc-300 hover:bg-black/80 hover:text-white'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
            title={isTrending ? 'Remove from trending (homepage)' : 'Mark as trending (show on homepage)'}
          >
            <Star className={`w-5 h-5 ${isTrending ? 'fill-current' : ''}`} />
          </button>

          {/* Play Icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-primary/20 transform scale-75 group-hover:scale-100 transition-transform">
              <Play className="w-5 h-5 fill-black text-black ml-1" />
            </div>
          </div>

          {/* Category Tag */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              {getCategory(template)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {getTitle(template)}
          </h3>
          <p className="text-sm text-zinc-500 line-clamp-2 min-h-[40px]">
            {getDescription(template)}
          </p>
        </div>
      </motion.div>
    </Link>
  );
};

// Export memoized component for performance
export const TemplateCard = memo(TemplateCardComponent);
