import { GenerationStatus, GenerationType } from './generation.types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerateVideoRequest {
  type: GenerationType;
  templateId?: string;
  imageUrl?: string;
  prompt?: string;
  styleId?: string;
  aspectRatio?: string;
  duration?: number;
}

export interface GenerateVideoResponse {
  jobId: string;
  status: GenerationStatus;
  estimatedTime?: number; // segundos
  webhookUrl?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: GenerationStatus;
  progress?: number;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  completedAt?: string;
}

export interface UploadImageResponse {
  success: boolean;
  imageUrl: string;
  thumbnailUrl?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

