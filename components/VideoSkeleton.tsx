export function VideoSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-zinc-800 ${className}`}>
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent animate-shimmer" />

            {/* Content placeholders */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                {/* Top badges placeholder */}
                <div className="flex justify-between">
                    <div className="w-20 h-6 bg-zinc-700 rounded-lg animate-pulse" />
                    <div className="w-6 h-6 bg-zinc-700 rounded-full animate-pulse" />
                </div>

                {/* Bottom content placeholder */}
                <div className="space-y-2">
                    <div className="w-24 h-4 bg-zinc-700 rounded animate-pulse" />
                    <div className="w-3/4 h-6 bg-zinc-700 rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
}
