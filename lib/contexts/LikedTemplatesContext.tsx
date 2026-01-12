
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSavedTemplates, saveTemplate, unsaveTemplate } from '@/lib/db/videos';
import { linkUserMask, unlinkUserMask } from '@/lib/db/masks-link';

interface LikedTemplatesContextType {
    likedIds: Set<number>;
    isLiked: (id: number) => boolean;
    toggleLike: (template: any) => Promise<void>;
    isLoading: boolean;
}

const LikedTemplatesContext = createContext<LikedTemplatesContextType | undefined>(undefined);

export function LikedTemplatesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Load initial liked state
    useEffect(() => {
        if (!user) {
            setLikedIds(new Set());
            return;
        }

        let isMounted = true;

        async function loadLikes() {
            try {
                const ids = await getSavedTemplates(user!.id);
                if (isMounted) {
                    setLikedIds(new Set(ids));
                }
            } catch (e) {
                console.error("Error loading liked templates:", e);
            }
        }

        loadLikes();

        return () => { isMounted = false; };
    }, [user]);

    const isLiked = useCallback((id: number) => {
        return likedIds.has(id);
    }, [likedIds]);

    const toggleLike = useCallback(async (template: any) => {
        if (!user) {
            alert("Please sign in to save templates");
            return;
        }

        const id = template.id;
        const currentlyLiked = likedIds.has(id);

        // Optimistic update
        setLikedIds(prev => {
            const next = new Set(prev);
            if (currentlyLiked) next.delete(id);
            else next.add(id);
            return next;
        });

        try {
            if (currentlyLiked) {
                await unsaveTemplate(user.id, id);
                // Also remove associated mask if present
                const maskUrl = template.maskUrl || template.replaced_object_mask_url || template.mask_video_url;
                if (maskUrl) {
                    console.log("Unlinking mask:", maskUrl);
                    await unlinkUserMask(user.id, maskUrl);
                }
            } else {
                await saveTemplate(user.id, id);
                // Also save associated mask if present
                const maskUrl = template.maskUrl || template.replaced_object_mask_url || template.mask_video_url;
                if (maskUrl) {
                    console.log("Linking mask:", maskUrl);
                    await linkUserMask(user.id, maskUrl, (template.title || 'Untitled') + ' Mask');
                }
            }
        } catch (e) {
            console.error("Error toggling like:", e);
            // Revert on error
            setLikedIds(prev => {
                const next = new Set(prev);
                if (currentlyLiked) next.add(id);
                else next.delete(id);
                return next;
            });
            alert("Failed to update like status");
        }
    }, [user, likedIds]);

    return (
        <LikedTemplatesContext.Provider value={{ likedIds, isLiked, toggleLike, isLoading }}>
            {children}
        </LikedTemplatesContext.Provider>
    );
}

export function useLikedTemplates() {
    const context = useContext(LikedTemplatesContext);
    if (context === undefined) {
        throw new Error('useLikedTemplates must be used within a LikedTemplatesProvider');
    }
    return context;
}
