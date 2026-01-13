'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Menu, X, User, Coins } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';


import { usePathname } from 'next/navigation';

import Image from 'next/image';

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left Side: Logo + Nav Items */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link href="/" className="relative h-16 w-16">
              <Image
                src="/logo-c.png"
                alt="ContentAI"
                fill
                className="object-contain"
                priority
              />
            </Link>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-3">
              <div className="h-4 w-px bg-white/10" />

              {/* VIDEO GROUP */}
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-sm tracking-wider">VIDEO</span>
                <div className="h-4 w-px bg-white/20" />
                <Link
                  href="/create-yours"
                  className={`text-sm font-medium transition-all ${pathname === '/create-yours' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  VIDEO EDITING
                </Link>
                <div className="h-4 w-px bg-white/20" />
                <Link
                  href="/videos"
                  className={`text-sm font-medium transition-all ${pathname === '/videos' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  LIBRARY
                </Link>
              </div>

              <div className="h-4 w-px bg-white/20" />

              {/* IMAGE GROUP */}
              <div className="flex items-center gap-4">

                <span className="text-[10px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-sm tracking-wider">IMAGE</span>
                <div className="h-4 w-px bg-white/20" />
                <Link
                  href="/create-image"
                  className={`text-sm font-medium transition-all ${pathname === '/create-image' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  IMAGE EDITING
                </Link>
                <div className="h-4 w-px bg-white/20" />
                <Link
                  href="/images"
                  className={`text-sm font-medium transition-all ${pathname === '/images' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  LIBRARY
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-6">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              // Logged in: Pricing + Profile Icon
              <div className="flex items-center gap-6">

                <div className="flex items-center gap-6">
                  <Link href="/pricing" className="group">
                    <div className="flex items-center gap-2 bg-transparent px-3 py-1.5 rounded-full transition-colors">
                      {/* Plan Badge */}
                      {profile?.subscription_status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                          {profile?.plan || 'Pro'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                          Free
                        </span>
                      )}
                      <Coins className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-white">
                        {profile?.credits?.toLocaleString() ?? 0}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium group-hover:text-zinc-400">
                        Credits
                      </span>
                    </div>
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                  <Link href="/profile">
                    <div className="w-9 h-9 rounded-full border-2 border-orange-500 flex items-center justify-center hover:bg-orange-500/10 transition-colors">
                      <User className="w-4 h-4 text-orange-500" />
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              // Not logged in: Pricing + Acceso + Inscribirse
              <div className="flex items-center gap-4">
                <Link
                  href="/pricing"
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-white border border-zinc-700 rounded-lg hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  Acceso
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Inscribirse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-zinc-900 bg-black"
          >
            <div className="flex flex-col gap-4">
              {/* Mobile Video Section */}
              <div className="px-4">
                <span className="text-[10px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-sm tracking-wider mb-2 inline-block">VIDEO</span>
                <div className="flex flex-col gap-2 pl-2 border-l border-white/10 ml-1">
                  <Link
                    href="/create-yours"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    VIDEO EDITING
                  </Link>
                  <Link
                    href="/videos"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    LIBRARY
                  </Link>
                </div>
              </div>

              {/* Mobile Image Section */}
              <div className="px-4">
                <span className="text-[10px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-sm tracking-wider mb-2 inline-block">IMAGE</span>
                <div className="flex flex-col gap-2 pl-2 border-l border-white/10 ml-1">
                  <Link
                    href="/create-image"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    IMAGE EDITING
                  </Link>
                  <Link
                    href="/images"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm text-zinc-400 hover:text-white transition-colors py-1"
                  >
                    LIBRARY
                  </Link>
                </div>
              </div>

              {/* General Links */}
              <div className="px-4">
                <Link
                  href="/pricing"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors block py-1"
                >
                  Pricing
                </Link>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-white flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-orange-500" />
                      Profile
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="px-4 py-2 text-zinc-500 hover:text-white transition-colors w-full text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-white"
                    >
                      Acceso
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-orange-500 font-medium"
                    >
                      Inscribirse
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
