'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Sparkles, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { mockTemplates } from '@/lib/data/mock-templates';
import { useVideoStore } from '@/store/video-store';
import { VideoTemplate } from '@/types/template.types';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<VideoTemplate | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const { startGeneration, isGenerating, currentJob } = useVideoStore();

  // Fetch template from API
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${params.id}`);
        if (!response.ok) throw new Error('Template not found');
        
        const data = await response.json();
        if (data.success) {
          setTemplate(data.template);
        }
      } catch (error) {
        console.error('Failed to fetch template:', error);
        // Fallback to mock data
        const mockTemplate = mockTemplates.find(t => t.id === params.id);
        if (mockTemplate) setTemplate(mockTemplate);
      }
    };
    
    fetchTemplate();
  }, [params.id]);

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Template not found</h1>
          <Link href="/templates" className="text-primary hover:underline">
            Back to templates
          </Link>
        </div>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Preview local
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      
      // Upload to backend
      await uploadImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      
      if (data.success) {
        setUploadedImageUrl(data.imageUrl);
        console.log('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImageUrl || !template) {
      alert('Please upload an image first');
      return;
    }
    
    try {
      await startGeneration({
        type: 'image-to-video',
        templateId: template.id,
        imageUrl: uploadedImageUrl,
        aspectRatio: template.aspectRatio as '16:9' | '9:16' | '1:1',
      });
      
      // Redirect to animation page to see the result
      router.push('/animation');
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to start generation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Template Preview */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{template.title}</h1>
              <p className="text-zinc-400">{template.description}</p>
            </div>

            {/* Template video/image */}
            <div className="aspect-video rounded-xl border border-border bg-surface overflow-hidden">
              <div className="relative h-full w-full">
                <Image
                  src={template.thumbnailUrl}
                  alt={template.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-sm text-zinc-400 mb-1">Duration</div>
                <div className="font-semibold">{template.duration}s</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-sm text-zinc-400 mb-1">Aspect Ratio</div>
                <div className="font-semibold">{template.aspectRatio}</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-sm text-zinc-400 mb-1">Category</div>
                <div className="font-semibold capitalize">{template.category}</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface px-3 py-1 text-sm text-zinc-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Upload Section */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-elevated p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Your Product</h2>
              
              {!selectedImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />

                  <Upload className="mb-4 h-12 w-12 text-zinc-400" />
                  <p className="mb-2 text-lg font-semibold">Drop your image here</p>
                  <p className="text-sm text-zinc-400">or click to browse</p>
                  <p className="mt-4 text-xs text-zinc-500">PNG, JPG or WebP (max 10MB)</p>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <div className="relative h-64 w-full bg-black">
                    <Image
                      src={selectedImage}
                      alt="Preview"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-2 backdrop-blur-sm transition-all hover:bg-black/70"
                  >
                    <span className="text-white text-sm">✕</span>
                  </button>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!uploadedImageUrl || isUploading || isGenerating}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-primary to-purple-600 px-8 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate with My Product
                  </>
                )}
              </button>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold mb-4">How it works</h3>
              <ol className="space-y-3 text-sm text-zinc-400">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs">1</span>
                  <span>Upload an image of your product (PNG, JPG, or WebP)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs">2</span>
                  <span>Our AI will analyze your product and the template</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs">3</span>
                  <span>Generate a professional video with your product (1-3 minutes)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs">4</span>
                  <span>Download and use your video anywhere</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

