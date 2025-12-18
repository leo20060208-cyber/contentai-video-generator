import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { VideoTemplate, TemplateFilters } from '@/types/template.types';

interface TemplateState {
  // Estado
  templates: VideoTemplate[];
  selectedTemplate: VideoTemplate | null;
  filters: TemplateFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions - Fetch
  fetchTemplates: () => Promise<void>;
  setTemplates: (templates: VideoTemplate[]) => void;
  
  // Actions - Selection
  setSelectedTemplate: (template: VideoTemplate | null) => void;
  selectTemplateById: (id: string) => void;
  
  // Actions - Filters
  setCategory: (category: TemplateFilters['category']) => void;
  setSearch: (search: string) => void;
  setAspectRatio: (aspectRatio: TemplateFilters['aspectRatio']) => void;
  resetFilters: () => void;
  
  // Getters
  getFilteredTemplates: () => VideoTemplate[];
  getFeaturedTemplates: () => VideoTemplate[];
  getTemplatesByCategory: (category: string) => VideoTemplate[];
}

const initialFilters: TemplateFilters = {
  category: 'all',
  search: '',
  aspectRatio: 'all',
};

export const useTemplateStore = create<TemplateState>()(
  devtools((set, get) => ({
    // Estado inicial
    templates: [],
    selectedTemplate: null,
    filters: initialFilters,
    isLoading: false,
    error: null,
    
    // Fetch templates desde API
    fetchTemplates: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');
        
        const data = await response.json();
        set({ templates: data.data || data, isLoading: false });
      } catch (error) {
        console.error('Fetch templates error:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false 
        });
      }
    },
    
    // Set templates manualmente
    setTemplates: (templates: VideoTemplate[]) => set({ templates }),
    
    // Seleccionar template
    setSelectedTemplate: (template: VideoTemplate | null) => 
      set({ selectedTemplate: template }),
    
    // Seleccionar por ID
    selectTemplateById: (id: string) => {
      const template = get().templates.find(t => t.id === id);
      set({ selectedTemplate: template || null });
    },
    
    // Filtros
    setCategory: (category) => 
      set(state => ({ filters: { ...state.filters, category } })),
    
    setSearch: (search) => 
      set(state => ({ filters: { ...state.filters, search } })),
    
    setAspectRatio: (aspectRatio) => 
      set(state => ({ filters: { ...state.filters, aspectRatio } })),
    
    resetFilters: () => set({ filters: initialFilters }),
    
    // Obtener templates filtrados
    getFilteredTemplates: () => {
      const { templates, filters } = get();
      
      return templates.filter(template => {
        // Filtro de categoría
        const categoryMatch = filters.category === 'all' || 
          template.category === filters.category;
        
        // Filtro de búsqueda (título, descripción, tags)
        const searchLower = filters.search.toLowerCase();
        const searchMatch = !filters.search || 
          template.title.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower) ||
          template.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        // Filtro de aspect ratio
        const aspectRatioMatch = !filters.aspectRatio || 
          filters.aspectRatio === 'all' ||
          template.aspectRatio === filters.aspectRatio;
        
        return categoryMatch && searchMatch && aspectRatioMatch;
      });
    },
    
    // Obtener templates destacados
    getFeaturedTemplates: () => {
      return get().templates.filter(t => t.featured);
    },
    
    // Obtener por categoría
    getTemplatesByCategory: (category: string) => {
      return get().templates.filter(t => t.category === category);
    },
  }))
);

