'use client';

import { Navbar } from '@/components/layout/Navbar';
import { AuthProvider } from '@/lib/auth/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
        </AuthProvider>
    );
}
