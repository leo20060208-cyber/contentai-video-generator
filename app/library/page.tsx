'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LibraryPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to /videos
        router.replace('/videos');
    }, [router]);

    return null;
}
