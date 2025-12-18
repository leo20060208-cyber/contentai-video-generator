'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Plus,
  Film,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit
} from 'lucide-react';
import { TemplateForm } from '@/components/admin/TemplateForm';
import { cn } from '@/lib/utils/cn';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  hiddenPrompt: string;
  maskVideoUrl?: string;
}

export default function AdminPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este video?')) return;

    try {
      const response = await fetch(`/api/admin/templates?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    setExpandedTemplate(null);
    fetchTemplates();
  };

  const handleEdit = (templateId: string) => {
    setExpandedTemplate(templateId);
    setShowForm(true);
  }

  // Get current editing template if expanded and form is shown
  const editingTemplate = showForm && expandedTemplate
    ? templates.find(t => t.id === expandedTemplate)
    : undefined;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-xs text-zinc-500">Gestión de Videos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchTemplates}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                title="Recargar"
              >
                <RefreshCw className={cn('w-5 h-5 text-zinc-400', isLoading && 'animate-spin')} />
              </button>

              <motion.button
                onClick={() => {
                  setShowForm(!showForm);
                  setExpandedTemplate(null); // Clear selection if canceling or adding new
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
                  showForm
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-primary text-black'
                )}
              >
                <Plus className={cn('w-5 h-5 transition-transform', showForm && 'rotate-45')} />
                {showForm ? 'Cancelar' : 'Nuevo Video'}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Form Section */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  {editingTemplate ? 'Editar Video' : 'Subir Nuevo Video'}
                </h2>
                <TemplateForm
                  categories={categories}
                  onSuccess={handleSuccess}
                  initialData={editingTemplate}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Videos List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              Videos Subidos
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({templates.length})
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-zinc-600 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No hay videos subidos</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-primary hover:underline"
              >
                Subir el primero
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden"
                >
                  {/* Template Header */}
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setExpandedTemplate(
                      expandedTemplate === template.id ? null : template.id
                    )}
                  >
                    {/* Video Thumbnail */}
                    <div className="w-24 h-14 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      <video
                        src={template.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {template.title}
                      </h3>
                      <p className="text-sm text-zinc-500 truncate">
                        {template.description}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                        {template.category}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPrompt(showPrompt === template.id ? null : template.id);
                        }}
                        className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                        title="Ver/ocultar prompt"
                      >
                        {showPrompt === template.id ? (
                          <EyeOff className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template.id);
                        }}
                        className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-zinc-400" />
                      </button>

                      {expandedTemplate === template.id ? (
                        <ChevronUp className="w-5 h-5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedTemplate === template.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 border-t border-zinc-800 mt-2">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Video Preview */}
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Preview</p>
                              <video
                                src={template.videoUrl}
                                controls
                                className="w-full rounded-lg"
                              />
                            </div>

                            {/* Hidden Prompt */}
                            <div>
                              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                                <span className="text-primary">Prompt Oculto</span>
                                (para IAs)
                              </p>
                              <div className="relative">
                                <pre className={cn(
                                  'p-3 rounded-lg bg-zinc-950 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-auto max-h-[200px]',
                                  showPrompt !== template.id && 'blur-sm select-none'
                                )}>
                                  {template.hiddenPrompt}
                                </pre>
                                {showPrompt !== template.id && (
                                  <button
                                    onClick={() => setShowPrompt(template.id)}
                                    className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 rounded-lg"
                                  >
                                    <span className="px-3 py-1.5 rounded-full bg-zinc-800 text-xs text-zinc-300">
                                      Click para ver
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
