import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { GenerationJob, GenerationConfig } from '@/types/generation.types';

interface VideoState {
  // Estado de generaciones
  currentJob: GenerationJob | null;
  jobHistory: GenerationJob[];
  isGenerating: boolean;
  
  // Polling
  pollingInterval: NodeJS.Timeout | null;
  
  // Actions - Generación
  startGeneration: (config: GenerationConfig) => Promise<void>;
  checkJobStatus: (jobId: string) => Promise<void>;
  updateJobProgress: (jobId: string, progress: number) => void;
  completeJob: (jobId: string, resultUrl: string) => void;
  failJob: (jobId: string, error: string) => void;
  
  // Actions - Historial
  addToHistory: (job: GenerationJob) => void;
  clearHistory: () => void;
  removeFromHistory: (jobId: string) => void;
  
  // Actions - Current Job
  setCurrentJob: (job: GenerationJob | null) => void;
  clearCurrentJob: () => void;
  
  // Actions - Polling
  startPolling: (jobId: string, callback?: (job: GenerationJob) => void) => void;
  stopPolling: () => void;
}

export const useVideoStore = create<VideoState>()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        currentJob: null,
        jobHistory: [],
        isGenerating: false,
        pollingInterval: null,
        
        // Iniciar generación
        startGeneration: async (config: GenerationConfig) => {
          set({ isGenerating: true });
          
          try {
            // Llamada a la API unificada
            const response = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                templateId: config.templateId,
                imageUrl: config.imageUrl,
                userPrompt: config.prompt,
                aspectRatio: config.aspectRatio || '16:9',
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to start generation');
            }
            
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || 'Generation failed');
            }
            
            const newJob: GenerationJob = {
              id: data.jobId,
              type: config.type,
              status: 'queued',
              prompt: config.prompt,
              imageUrl: config.imageUrl,
              templateId: config.templateId,
              createdAt: new Date(),
            };
            
            set({ currentJob: newJob });
            get().addToHistory(newJob);
            
            // Iniciar polling
            get().startPolling(data.jobId);
            
          } catch (error) {
            console.error('Generation error:', error);
            set({ isGenerating: false });
            throw error;
          }
        },
        
        // Verificar estado del job
        checkJobStatus: async (jobId: string) => {
          try {
            const response = await fetch(`/api/jobs/${jobId}`);
            if (!response.ok) throw new Error('Failed to check job status');
            
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || 'Failed to get status');
            }
            
            const { currentJob, jobHistory } = get();
            
            // Actualizar currentJob si es el mismo
            if (currentJob?.id === jobId) {
              const updatedJob: GenerationJob = {
                ...currentJob,
                status: data.status,
                progress: data.progress,
                resultUrl: data.videoUrl, // API retorna videoUrl, no resultUrl
                thumbnailUrl: data.thumbnailUrl,
                error: data.error,
              };
              
              set({ currentJob: updatedJob });
              
              // Si está completado o falló, detener polling
              if (data.status === 'completed' || data.status === 'failed') {
                get().stopPolling();
                set({ isGenerating: false });
                
                // Actualizar en historial
                const updatedHistory = jobHistory.map(job => 
                  job.id === jobId ? updatedJob : job
                );
                set({ jobHistory: updatedHistory });
              }
            }
          } catch (error) {
            console.error('Status check error:', error);
          }
        },
        
        // Actualizar progreso
        updateJobProgress: (jobId: string, progress: number) => {
          const { currentJob, jobHistory } = get();
          
          if (currentJob?.id === jobId) {
            set({ currentJob: { ...currentJob, progress } });
          }
          
          const updatedHistory = jobHistory.map(job =>
            job.id === jobId ? { ...job, progress } : job
          );
          set({ jobHistory: updatedHistory });
        },
        
        // Completar job
        completeJob: (jobId: string, resultUrl: string) => {
          const { currentJob, jobHistory } = get();
          
          if (currentJob?.id === jobId) {
            set({
              currentJob: {
                ...currentJob,
                status: 'completed',
                resultUrl,
                completedAt: new Date(),
              },
              isGenerating: false,
            });
          }
          
          const updatedHistory = jobHistory.map(job =>
            job.id === jobId
              ? { ...job, status: 'completed' as const, resultUrl, completedAt: new Date() }
              : job
          );
          set({ jobHistory: updatedHistory });
        },
        
        // Fallar job
        failJob: (jobId: string, error: string) => {
          const { currentJob, jobHistory } = get();
          
          if (currentJob?.id === jobId) {
            set({
              currentJob: {
                ...currentJob,
                status: 'failed',
                error,
              },
              isGenerating: false,
            });
          }
          
          const updatedHistory = jobHistory.map(job =>
            job.id === jobId
              ? { ...job, status: 'failed' as const, error }
              : job
          );
          set({ jobHistory: updatedHistory });
        },
        
        // Añadir al historial
        addToHistory: (job: GenerationJob) => {
          set(state => ({
            jobHistory: [job, ...state.jobHistory].slice(0, 50), // Máximo 50
          }));
        },
        
        // Limpiar historial
        clearHistory: () => set({ jobHistory: [] }),
        
        // Eliminar del historial
        removeFromHistory: (jobId: string) => {
          set(state => ({
            jobHistory: state.jobHistory.filter(job => job.id !== jobId),
          }));
        },
        
        // Set current job
        setCurrentJob: (job: GenerationJob | null) => set({ currentJob: job }),
        
        // Limpiar job actual
        clearCurrentJob: () => set({ currentJob: null, isGenerating: false }),
        
        // Iniciar polling
        startPolling: (jobId: string, callback?: (job: GenerationJob) => void) => {
          const { pollingInterval } = get();
          
          // Limpiar polling anterior si existe
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          // Polling cada 3 segundos
          const interval = setInterval(async () => {
            await get().checkJobStatus(jobId);
            
            if (callback) {
              const { currentJob } = get();
              if (currentJob) callback(currentJob);
            }
          }, 3000);
          
          set({ pollingInterval: interval });
        },
        
        // Detener polling
        stopPolling: () => {
          const { pollingInterval } = get();
          if (pollingInterval) {
            clearInterval(pollingInterval);
            set({ pollingInterval: null });
          }
        },
      }),
      {
        name: 'video-store',
        partialize: (state) => ({
          jobHistory: state.jobHistory,
          // No persistir currentJob ni polling
        }),
      }
    )
  )
);

