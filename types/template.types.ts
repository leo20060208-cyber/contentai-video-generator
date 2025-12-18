export type TemplateCategory =
  | 'VISUAL'
  | 'CLOTHING BRANDS'
  | 'ASMR'
  | 'DROP SHIPPING'
  | 'ECOMMERCE'
  | 'BRAND'
  | 'VISUAL TEMPLATES';

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // en segundos
  tags: string[];
  aspectRatio: '16:9' | '9:16' | '1:1';
  createdAt: Date;
  featured?: boolean;
}

export interface TemplateFilters {
  category: TemplateCategory | 'all';
  search: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | 'all';
}

