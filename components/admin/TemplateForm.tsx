'use client';

import { useState } from 'react';
import { Upload, X, Loader2, Zap, Check, Edit, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoUploader } from './VideoUploader';
import { SegmentationModal } from '@/components/SegmentationModal';


interface TemplateFormProps {
  categories: string[];
  onSuccess: () => void;
  initialData?: any;
}

export interface FormData {
  title: string;
  description: string;
  category: string;
  videoUrl: string; // The base video
  hiddenPrompt: string; // "A giant hamburger"
  maskVideoUrl: string; // The generated mask video URL
  requiredImageCount: number;
  imageDescriptions: string[];
  imageInstructions: string;
}

export function TemplateForm({ categories, onSuccess, initialData }: TemplateFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || categories[0] || 'VISUAL',
    videoUrl: initialData?.videoUrl || initialData?.before_video_url || '',
    hiddenPrompt: initialData?.hiddenPrompt || initialData?.hidden_prompt || '',
    maskVideoUrl: initialData?.maskVideoUrl || initialData?.mask_video_url || '',
    requiredImageCount: initialData?.required_image_count || 1,
    imageDescriptions: initialData?.image_descriptions || [],
    imageInstructions: initialData?.image_instructions || ''
  });

  // Track ID locally to handle Create -> Update switch
  const [templateId, setTemplateId] = useState<string | null>(initialData?.id || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  // Segmentation State
  const [isSegmentationOpen, setIsSegmentationOpen] = useState(false);
  const [segmentationSource, setSegmentationSource] = useState<string | null>(null);
  const [isSegmentingVideo, setIsSegmentingVideo] = useState(false);

  // Preview Image State (for UI feedback only)
  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string | null>(initialData?.mask_video_url ? null : null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleVideoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, videoUrl: url, maskVideoUrl: '' })); // Reset mask if video changes
    setMaskPreviewUrl(null);
  };

  const openSegmentation = async () => {
    if (!formData.videoUrl) return;

    // Extract First Frame for Segmentation
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = formData.videoUrl;
    video.muted = true;
    video.currentTime = 0.1; // Seek to start

    // Wait for seek
    await new Promise((resolve) => {
      video.onseeked = resolve;
      video.onloadeddata = () => video.currentTime = 0.1;
      video.onerror = () => resolve(null); // Fallback
      // Force load
      video.load();
    });

    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
    setSegmentationSource(frameBase64);
    setIsSegmentationOpen(true);
  };

  const closeSegmentation = () => {
    setIsSegmentationOpen(false);
    setSegmentationSource(null);
  };

  // Helper to save current state to DB
  const saveTemplateToDb = async (currentData: FormData) => {
    setIsSubmitting(true);
    try {
      const url = '/api/admin/templates';
      const method = templateId ? 'PUT' : 'POST';
      const body = {
        ...currentData,
        id: templateId
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save template');
      }

      const savedData = await response.json();
      // If created, capture ID
      if (savedData.template && savedData.template.id) {
        setTemplateId(savedData.template.id);
      }

      return true;
    } catch (e: any) {
      console.error("Auto-save failed", e);
      setError("Auto-save failed: " + e.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSegmentationConfirm = async (maskUrl: string | null, points?: any[], maskIndex?: number) => {
    // 1. Close Modal Immediately
    closeSegmentation();
    setSegmentError(null);

    // If we have points and video, we need to generate the VIDEO mask
    if (maskUrl && points && formData.videoUrl) { // Video Workflow (Antigravity)
      setIsSegmentingVideo(true);
      setMaskPreviewUrl(maskUrl); // Show preview immediately!

      try {
        const response = await fetch('/api/segment-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: formData.videoUrl,
            points,
            maskIndex // Pass the user's ambiguity choice
          }),
        });

        const data = await response.json();

        if (data.mask_video_url) {
          let newData = { ...formData, maskVideoUrl: data.mask_video_url };

          // Ensure Title exists for Auto-Save
          if (!newData.title) {
            newData.title = "New Template " + new Date().toLocaleTimeString();
          }

          setFormData(newData);

          // AUTO-SAVE!
          await saveTemplateToDb(newData);

        } else {
          setSegmentError("Failed to generate video mask from AI.");
          setMaskPreviewUrl(null); // Clear preview on failure
        }
      } catch (e: any) {
        console.error("Video Segmentation Failed", e);
        setSegmentError("Video Segmentation Failed: " + (e as any).message);
        setMaskPreviewUrl(null);
      } finally {
        setIsSegmentingVideo(false);
      }
    } else if (maskUrl) {
      // Image Workflow or fallback
      let newData = { ...formData, maskVideoUrl: maskUrl };
      if (!newData.title) newData.title = "New Template " + new Date().toLocaleTimeString();

      setFormData(newData);
      setMaskPreviewUrl(maskUrl);
      await saveTemplateToDb(newData);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title || !formData.videoUrl || !formData.hiddenPrompt) {
      setError('Please fill in all required fields (Video, Title, Prompt)');
      return;
    }

    if (!formData.maskVideoUrl) {
      if (!confirm("No Object Mask defined. Are you sure? The Antigravity effect needs a mask.")) {
        return;
      }
    }

    const success = await saveTemplateToDb(formData);
    if (success) {
      onSuccess();
      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          category: categories[0] || 'VISUAL',
          videoUrl: '',
          hiddenPrompt: '',
          maskVideoUrl: '',
          requiredImageCount: 1,
          imageDescriptions: [],
          imageInstructions: ''
        });
        setTemplateId(null);
        setMaskPreviewUrl(null);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video Upload */}
      <VideoUploader
        onUploadComplete={handleVideoUpload}
        currentVideoUrl={formData.videoUrl}
      />

      {/* Segmentation Step */}
      {formData.videoUrl && (
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h3 className="text-zinc-300 font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            Antigravity Mask
          </h3>

          {!formData.maskVideoUrl && !isSegmentingVideo ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openSegmentation}
                disabled={isSegmentingVideo}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 w-full"
              >
                <Zap className="w-4 h-4" />
                Define Object Mask
              </button>
              {segmentError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                  {segmentError}
                </p>
              )}
            </div>
          ) : isSegmentingVideo ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm bg-zinc-800 text-zinc-400 px-4 py-3 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 w-full cursor-wait">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span>Generating Video Mask...</span>
              </div>
              <p className="text-xs text-center text-zinc-500">This may take ~10-20 seconds. Please wait.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/80 rounded-lg p-3 border border-green-500/30 flex items-center gap-3">
              {maskPreviewUrl && (
                <div className="h-12 w-12 bg-black rounded border border-zinc-700 overflow-hidden shrink-0">
                  <img src={maskPreviewUrl} alt="Mask Preview" className="h-full w-full object-contain" />
                </div>
              )}
              {!maskPreviewUrl && (
                <div className="bg-green-500/20 p-2 rounded-full">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
              )}

              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">Mask Saved!</h4>
                <p className="text-xs text-zinc-400">
                  {isSubmitting ? "Syncing to Supabase..." : "Synced to Database."}
                </p>
              </div>
              <button
                type="button"
                onClick={openSegmentation}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors text-white border border-zinc-700"
              >
                Change
              </button>
            </div>
          )}
        </div>
      )}

      {/* Título */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
          Título <span className="text-zinc-500">(visible al usuario)</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Ej: Video promocional moderno"
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800',
            'text-white placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
          Descripción <span className="text-zinc-500">(visible al usuario)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe brevemente el estilo del video..."
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800',
            'text-white placeholder:text-zinc-600 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Image Instructions */}
      <div className="space-y-2">
        <label htmlFor="imageInstructions" className="block text-sm font-medium text-zinc-300">
          Image Instructions <span className="text-zinc-500">(Specific rules for users)</span>
        </label>
        <textarea
          id="imageInstructions"
          name="imageInstructions"
          value={formData.imageInstructions}
          onChange={handleChange}
          placeholder="e.g. Please upload clear photos with a plain background. Avoid shadows..."
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800',
            'text-white placeholder:text-zinc-600 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Required Photos Configuration */}
      <div className="space-y-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-300">
            Minimum Photos Required
          </label>
          <input
            type="number"
            min="1"
            max="5"
            name="requiredImageCount"
            value={formData.requiredImageCount}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 1;
              const newDescriptions = [...formData.imageDescriptions];
              // Adjust array length
              if (count > newDescriptions.length) {
                for (let i = newDescriptions.length; i < count; i++) {
                  newDescriptions.push(`Photo ${i + 1}`);
                }
              } else if (count < newDescriptions.length) {
                newDescriptions.length = count;
              }
              setFormData(prev => ({ ...prev, requiredImageCount: count, imageDescriptions: newDescriptions }));
            }}
            className="w-20 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider font-medium">
            Photo Descriptions (Visible to user)
          </label>
          {Array.from({ length: formData.requiredImageCount }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-zinc-500 text-sm w-6">{idx + 1}.</span>
              <input
                type="text"
                value={formData.imageDescriptions[idx] || ''}
                onChange={(e) => {
                  const newDesc = [...formData.imageDescriptions];
                  newDesc[idx] = e.target.value;
                  setFormData(prev => ({ ...prev, imageDescriptions: newDesc }));
                }}
                placeholder={`e.g. Front View`}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <label htmlFor="category" className="block text-sm font-medium text-zinc-300">
          Categoría
        </label>
        <div className="relative">
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800',
              'text-white appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
              'transition-all duration-200'
            )}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Hidden Prompt */}
      <div className="space-y-2">
        <label htmlFor="hiddenPrompt" className="block text-sm font-medium text-zinc-300">
          Prompt Oculto (Objeto Original)
        </label>
        <p className="text-xs text-zinc-500 mb-2">
          Describe el objeto que has seleccionado en el video (ej: "una botella de perfume roja").
          Esto ayuda a Kling a realizar la sustitución correctamente.
        </p>
        <input
          type="text"
          id="hiddenPrompt"
          name="hiddenPrompt"
          value={formData.hiddenPrompt}
          onChange={handleChange}
          placeholder="Ej: A red perfume bottle on a wooden table"
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800',
            'text-white placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
            'transition-all duration-200'
          )}
        />
      </div>


      {/* Submit Button */}
      <div className="pt-4">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full py-4 rounded-xl font-medium text-lg',
            'bg-gradient-to-r from-orange-500 to-pink-500 text-white',
            'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200 shadow-lg shadow-orange-500/20'
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {initialData ? 'Updating Template...' : 'Creating Template...'}
            </span>
          ) : (
            initialData ? 'Update Template' : 'Create Template'
          )}
        </button>
      </div>

      {/* Modal */}
      <SegmentationModal
        isOpen={isSegmentationOpen}
        imageSource={segmentationSource || ''}
        onClose={closeSegmentation}
        onConfirm={handleSegmentationConfirm}
      />
    </form>
  );
}
