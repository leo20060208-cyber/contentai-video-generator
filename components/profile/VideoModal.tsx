import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Video } from '@/lib/db/videos';

interface VideoModalProps {
    video: Video | null;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export function VideoModal({ video, onClose, onDelete }: VideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Sync Audio with Video
    useEffect(() => {
        if (!video || !videoRef.current) return;

        const vid = videoRef.current;
        const aud = audioRef.current;

        const handlePlay = () => {
            setIsPlaying(true);
            if (aud && video.audio_url) aud.play().catch(() => { });
        };

        const handlePause = () => {
            setIsPlaying(false);
            if (aud) aud.pause();
        };

        const handleTimeUpdate = () => {
            // Sync audio time if it drifts significantly (only if audio exists)
            if (aud && video.audio_url && Math.abs(aud.currentTime - vid.currentTime) > 0.3) {
                aud.currentTime = vid.currentTime;
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            if (aud) {
                aud.pause();
                aud.currentTime = 0;
            }
        }

        vid.addEventListener('play', handlePlay);
        vid.addEventListener('pause', handlePause);
        vid.addEventListener('timeupdate', handleTimeUpdate);
        vid.addEventListener('ended', handleEnded);

        // Auto-play when opened
        vid.play().catch(() => { });

        return () => {
            vid.removeEventListener('play', handlePlay);
            vid.removeEventListener('pause', handlePause);
            vid.removeEventListener('timeupdate', handleTimeUpdate);
            vid.removeEventListener('ended', handleEnded);
        };
    }, [video]);

    // Handle Mute Toggle
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted; // Actually video track is always muted if we rely on external audio, but good for safety
            setIsMuted(!isMuted);
            if (audioRef.current) {
                audioRef.current.muted = !isMuted;
            }
        }
    };

    if (!video) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start pointer-events-none">
                        <h3 className="text-white font-medium text-shadow pointer-events-auto truncate max-w-[70%] drop-shadow-md">
                            {video.title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors pointer-events-auto"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Video Player */}
                    <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px]">
                        <video
                            ref={videoRef}
                            src={video.video_url || undefined}
                            className="w-full h-full max-h-[75vh] object-contain"
                            playsInline
                            loop={false} // Handle loop manually to sync audio
                            muted // Always mute video track to rely on audio track if present, or controlled by state
                            controls={false}
                            onClick={() => {
                                if (videoRef.current?.paused) videoRef.current.play();
                                else videoRef.current?.pause();
                            }}
                        />

                        {/* Hidden Audio Player if audio_url exists */}
                        {video.audio_url && (
                            <audio ref={audioRef} src={video.audio_url} preload="auto" />
                        )}

                        {/* Mute Control Overlay */}
                        <div className="absolute bottom-4 right-4 z-20">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-zinc-900 border-t border-white/5 flex gap-3">
                        <a
                            href={video.video_url || undefined}
                            download={`video-${video.id}.mp4`}
                            target="_blank"
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this video?')) {
                                    onDelete(video.id);
                                    onClose();
                                }
                            }}
                            className="px-4 py-3 bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
