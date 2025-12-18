import { useEffect } from 'react';
import { useTemplateStore } from '@/store/template-store';

export function useTemplates() {
  const {
    templates,
    selectedTemplate,
    filters,
    isLoading,
    error,
    fetchTemplates,
    setSelectedTemplate,
    selectTemplateById,
    setCategory,
    setSearch,
    setAspectRatio,
    resetFilters,
    getFilteredTemplates,
    getFeaturedTemplates,
    getTemplatesByCategory,
  } = useTemplateStore();

  // Fetch templates on mount
  useEffect(() => {
    if (templates.length === 0) {
      fetchTemplates();
    }
  }, [fetchTemplates, templates.length]);

  return {
    templates,
    selectedTemplate,
    filters,
    isLoading,
    error,
    filteredTemplates: getFilteredTemplates(),
    featuredTemplates: getFeaturedTemplates(),
    // Actions
    fetchTemplates,
    setSelectedTemplate,
    selectTemplateById,
    setCategory,
    setSearch,
    setAspectRatio,
    resetFilters,
    getTemplatesByCategory,
  };
}

