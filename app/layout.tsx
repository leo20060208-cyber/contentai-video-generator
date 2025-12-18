import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkErrorHandler } from '@/components/ChunkErrorHandler';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContentAI - Recreate Viral Product Videos',
  description: 'Turn any product into a viral video ad. No editing skills needed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <body className={inter.className} suppressHydrationWarning>
        <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_180px_rgba(255,107,0,0.15)]" />
        <ChunkErrorHandler />
        <ChunkErrorBoundary>
          <Providers>{children}</Providers>
        </ChunkErrorBoundary>
      </body>
    </html>
  );
}

