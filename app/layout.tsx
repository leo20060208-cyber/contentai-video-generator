import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkErrorHandler } from '@/components/ChunkErrorHandler';
import { StarBackground } from '@/components/ui/StarBackground';
import { AppFeaturePopup } from '@/components/AppFeaturePopup';

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
    <html lang="en" suppressHydrationWarning translate="no" style={{ backgroundColor: '#000', color: '#fff' }}>
      <body className={`${inter.className} min-h-screen relative`} suppressHydrationWarning>
        <StarBackground />
        <AppFeaturePopup />

        {/* Global Orange Glow Overlay */}


        <div className="relative z-10">
          <ChunkErrorHandler />
          <ChunkErrorBoundary>
            <Providers>{children}</Providers>
          </ChunkErrorBoundary>
        </div>
      </body>
    </html>
  );
}
