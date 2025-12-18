'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { GenerationStatus as Status } from '@/types/generation.types';
import { cn } from '@/lib/utils/cn';

interface GenerationStatusProps {
  status: Status;
  progress?: number;
  className?: string;
}

const statusConfig = {
  idle: {
    icon: Clock,
    label: 'Idle',
    color: 'text-zinc-400',
    bg: 'bg-zinc-400/10',
  },
  uploading: {
    icon: Loader2,
    label: 'Uploading',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    animate: true,
  },
  queued: {
    icon: Clock,
    label: 'Queued',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
};

export function GenerationStatus({ status, progress, className }: GenerationStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-sm',
        config.bg,
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Icon
        className={cn('h-4 w-4', config.color, config.animate && 'animate-spin')}
      />
      <span className={cn('text-sm font-medium', config.color)}>
        {config.label}
        {progress !== undefined && status === 'processing' && ` (${progress}%)`}
      </span>

      {/* Progress bar for processing */}
      {progress !== undefined && status === 'processing' && (
        <div className="ml-2 h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className="h-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Pulse effect for processing states */}
      {config.animate && (
        <motion.div
          className={cn('absolute inset-0 rounded-full', config.bg)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}

