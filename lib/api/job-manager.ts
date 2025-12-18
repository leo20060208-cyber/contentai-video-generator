/**
 * Job Manager - Sistema en memoria para trackear trabajos de generación
 */

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoJob {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  createdAt: Date;
  completedAt?: Date;
  
  // Input data
  prompt: string;
  imageUrl?: string;
  aspectRatio: string;
  
  // Result
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// In-memory storage (se pierde al reiniciar el servidor)
const jobs = new Map<string, VideoJob>();

/**
 * Crear un nuevo job
 */
export function createJob(data: {
  prompt: string;
  imageUrl?: string;
  aspectRatio: string;
}): VideoJob {
  const id = generateJobId();
  
  const job: VideoJob = {
    id,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
    prompt: data.prompt,
    imageUrl: data.imageUrl,
    aspectRatio: data.aspectRatio,
  };
  
  jobs.set(id, job);
  
  // Limpiar jobs viejos
  cleanOldJobs();
  
  return job;
}

/**
 * Obtener un job por ID
 */
export function getJob(id: string): VideoJob | null {
  return jobs.get(id) || null;
}

/**
 * Actualizar estado de un job
 */
export function updateJob(id: string, updates: Partial<VideoJob>): VideoJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  
  const updatedJob = { ...job, ...updates };
  jobs.set(id, updatedJob);
  
  return updatedJob;
}

/**
 * Simular procesamiento de un job
 * En producción, esto consultaría Vertex AI
 */
export function startJobProcessing(jobId: string) {
  const job = getJob(jobId);
  if (!job) return;
  
  // Cambiar a processing
  updateJob(jobId, { status: 'processing', progress: 10 });
  
  // Simular progreso incremental
  const duration = 8000 + Math.random() * 4000; // 8-12 segundos
  const steps = 10;
  const stepDuration = duration / steps;
  
  let currentStep = 0;
  
  const interval = setInterval(() => {
    currentStep++;
    const progress = Math.min(10 + (currentStep * 9), 100);
    
    if (currentStep >= steps) {
      clearInterval(interval);
      
      // Completar job con video mock
      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Video de ejemplo
        thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80',
      });
    } else {
      updateJob(jobId, { progress });
    }
  }, stepDuration);
}

/**
 * Limpiar jobs con más de 1 hora
 */
function cleanOldJobs() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt.getTime() < oneHourAgo) {
      jobs.delete(id);
    }
  }
}

/**
 * Generar ID único para jobs
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtener todos los jobs (para debugging)
 */
export function getAllJobs(): VideoJob[] {
  return Array.from(jobs.values());
}

