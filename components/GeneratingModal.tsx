import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, X, Play, Monitor, Film } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface GeneratingModalProps {
    isOpen: boolean;
    status: 'processing' | 'mixing_audio' | 'completed' | 'failed';
    videoUrl: string | null;
    errorMessage?: string | null;
    onClose: () => void;
    onGoToStudio: () => void;
    onGoToMyVideos: () => void;
}

export const GeneratingModal = ({
    isOpen,
    status,
    videoUrl,
    errorMessage,
    onClose,
    onGoToStudio,
    onGoToMyVideos
}: GeneratingModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-play video when completed
    useEffect(() => {
        if (status === 'completed' && videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    }, [status]);

    // Timer Logic
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if ((status === 'processing' || status === 'mixing_audio') && isOpen) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [status, isOpen]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={status === 'completed' || status === 'failed' ? onClose : undefined}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={`relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 my-8 mx-auto ${(status === 'processing' || status === 'mixing_audio') ? 'border-none' : 'border border-white/10'
                            }`}
                    >
                        {/* Custom Orange Pulse Animation for Processing/Mixing State */}
                        {(status === 'processing' || status === 'mixing_audio') && (
                            <div className="absolute inset-0 pointer-events-none z-0">
                                <div className="absolute inset-0 animate-pulse-slow box-decoration-clone bg-gradient-to-b from-orange-500/0 via-orange-500/5 to-orange-500/0" />
                                {/* Inner glow pulse */}
                                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(249,115,22,0.3)] animate-breath" />
                            </div>
                        )}

                        <div className="relative z-10 p-8 flex flex-col items-center text-center">

                            {/* Close button (only when done) */}
                            {(status === 'completed' || status === 'failed') && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {/* --- PROCESSING/MIXING STATE --- */}
                            {(status === 'processing' || status === 'mixing_audio') && (
                                <>
                                    <div className="w-20 h-20 mb-6 relative">
                                        {/* Animated Icon Background */}
                                        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping-slow" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
                                        </div>
                                        {/* Spinning ring */}
                                        <div className="absolute inset-0 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-2">
                                        {status === 'mixing_audio' ? 'Uniendo audio...' : 'Generant Màgia...'}
                                    </h3>

                                    {/* Timer & Progress */}
                                    <div className="w-full max-w-[80%] mb-6 space-y-2">
                                        <p className="text-zinc-400 text-sm text-center">
                                            {status === 'mixing_audio' ? 'Sincronitzant àudio original...' : 'La IA està creant el teu vídeo.'}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-orange-500 rounded-full"
                                                initial={{ width: "0%" }}
                                                animate={{ width: `${Math.min((elapsedSeconds / 180) * 100, 95)}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>

                                        <div className="flex justify-between text-xs text-zinc-500">
                                            <span>Temps: {formatTime(elapsedSeconds)}</span>
                                            <span>Estimat: ~3 min</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* --- COMPLETED STATE --- */}
                            {status === 'completed' && videoUrl && (
                                <>
                                    <div className="w-full aspect-[9/16] bg-zinc-800 rounded-2xl overflow-hidden mb-6 relative group shadow-lg border border-white/5">
                                        <video
                                            ref={videoRef}
                                            src={videoUrl}
                                            className="w-full h-full object-cover"
                                            controls
                                            loop
                                            playsInline
                                        />
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-6">Vídeo Completat!</h3>

                                    <div className="flex flex-col w-full gap-3">
                                        <Button
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = videoUrl;
                                                a.download = 'video-generated.mp4';
                                                a.target = '_blank';
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }}
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium"
                                        >
                                            Descarregar Vídeo
                                        </Button>

                                        <button
                                            onClick={onGoToMyVideos}
                                            className="text-sm text-zinc-500 hover:text-white underline decoration-zinc-800 underline-offset-4 mt-2"
                                        >
                                            Go to My Videos
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* --- FAILED STATE --- */}
                            {status === 'failed' && (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                        <X className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Vaja, alguna cosa ha fallat</h3>
                                    <p className="text-zinc-400 text-sm mb-6">
                                        {errorMessage
                                            ? errorMessage
                                            : 'No hem pogut generar el vídeo. Si us plau, torna-ho a intentar.'}
                                    </p>
                                    <Button onClick={onClose} variant="secondary" className="w-full">
                                        Tancar
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
