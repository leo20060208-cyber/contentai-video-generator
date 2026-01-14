type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache: Record<string, CacheEntry<any>> = {};

export const getCache = <T>(key: string): T | null => {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        delete cache[key];
        return null;
    }
    return entry.data;
};

export const setCache = <T>(key: string, data: T) => {
    cache[key] = {
        data,
        timestamp: Date.now()
    };
};
