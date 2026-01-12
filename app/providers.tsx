'use client';

import { Navbar } from '@/components/layout/Navbar';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { LikedTemplatesProvider } from '@/lib/contexts/LikedTemplatesContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LikedTemplatesProvider>
                <Navbar />
                <main className="min-h-screen">{children}</main>
            </LikedTemplatesProvider>
        </AuthProvider>
    );
}
