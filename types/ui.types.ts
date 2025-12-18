export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
  createdAt: Date;
}

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

