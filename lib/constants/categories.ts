import { TemplateCategory } from '@/types/template.types';

export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string; // Nombre del icono de Lucide
}

export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'VISUAL',
    name: 'Visual',
    description: 'High-impact visual templates',
    icon: 'Sparkles',
  },
  {
    id: 'CLOTHING BRANDS',
    name: 'Clothing Brands',
    description: 'Fashion and apparel focused templates',
    icon: 'Shirt',
  },
  {
    id: 'ASMR',
    name: 'ASMR',
    description: 'Satisfying, sensory-focused templates',
    icon: 'Waves',
  },
  {
    id: 'DROP SHIPPING',
    name: 'Drop Shipping',
    description: 'Templates optimized for dropshipping products',
    icon: 'Truck',
  },
  {
    id: 'ECOMMERCE',
    name: 'Ecommerce',
    description: 'Product showcase templates for ecommerce',
    icon: 'ShoppingCart',
  },
  {
    id: 'BRAND',
    name: 'Brand',
    description: 'Brand storytelling templates',
    icon: 'BadgeCheck',
  },
  {
    id: 'VISUAL TEMPLATES',
    name: 'Visual Templates',
    description: 'Additional visual template set',
    icon: 'LayoutGrid',
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

