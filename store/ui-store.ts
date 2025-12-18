import { create } from 'zustand';
import { Notification, ModalState, UploadProgress } from '@/types/ui.types';

interface UIState {
  // Modals
  isTemplateDetailOpen: boolean;
  isUploadModalOpen: boolean;
  isGenerationPanelOpen: boolean;
  
  // Notifications
  notifications: Notification[];
  
  // Upload progress
  uploadProgress: UploadProgress | null;
  
  // Theme (si quieres toggle de dark mode en futuro)
  theme: 'dark' | 'light';
  
  // Actions - Modals
  openTemplateDetail: () => void;
  closeTemplateDetail: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  toggleGenerationPanel: () => void;
  
  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Actions - Upload Progress
  setUploadProgress: (progress: UploadProgress | null) => void;
  updateUploadProgress: (progress: number) => void;
  
  // Actions - Theme
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Estado inicial
  isTemplateDetailOpen: false,
  isUploadModalOpen: false,
  isGenerationPanelOpen: false,
  notifications: [],
  uploadProgress: null,
  theme: 'dark',
  
  // Modals
  openTemplateDetail: () => set({ isTemplateDetailOpen: true }),
  closeTemplateDetail: () => set({ isTemplateDetailOpen: false }),
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
  toggleGenerationPanel: () => 
    set(state => ({ isGenerationPanelOpen: !state.isGenerationPanelOpen })),
  
  // Notifications
  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      duration: notification.duration || 5000,
    };
    
    set(state => ({
      notifications: [...state.notifications, newNotification],
    }));
    
    // Auto-remove después de duration
    setTimeout(() => {
      get().removeNotification(id);
    }, newNotification.duration);
  },
  
  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },
  
  clearNotifications: () => set({ notifications: [] }),
  
  // Upload Progress
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  updateUploadProgress: (progress) => {
    const { uploadProgress } = get();
    if (uploadProgress) {
      set({
        uploadProgress: {
          ...uploadProgress,
          progress,
        },
      });
    }
  },
  
  // Theme
  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    }));
  },
}));

