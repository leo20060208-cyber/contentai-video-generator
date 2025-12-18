import { TemplateCategory } from '@/types/template.types';

export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string; // Nombre del icono de Lucide
}

export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Promotional videos for campaigns and advertising',
    icon: 'Megaphone',
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Short-form content optimized for social platforms',
    icon: 'Share2',
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Highlight your products with stunning visuals',
    icon: 'Package',
  },
  {
    id: 'explainer',
    name: 'Explainer',
    description: 'Educational and tutorial content',
    icon: 'BookOpen',
  },
  {
    id: 'promo',
    name: 'Promo',
    description: 'Quick promotional clips and teasers',
    icon: 'Zap',
  },
];

export const getCategoryInfo = (id: TemplateCategory): CategoryInfo | undefined => {
  return TEMPLATE_CATEGORIES.find(cat => cat.id === id);
};

export const ASPECT_RATIOS = [
  { id: '16:9', name: 'Landscape (16:9)', description: 'YouTube, TV' },
  { id: '9:16', name: 'Portrait (9:16)', description: 'TikTok, Instagram Reels' },
  { id: '1:1', name: 'Square (1:1)', description: 'Instagram Feed' },
] as const;

