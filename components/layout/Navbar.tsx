'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';


export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left Side: Logo + Nav Items */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/" className="font-bold text-xl">
              <span className="text-orange-500">contentai</span>
            </Link>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/videos"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Library
              </Link>
              <Link
                href="/create-yours"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Create Yours
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-6">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              // Logged in: Pricing + Profile Icon
              <div className="flex items-center gap-6">
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
                  className="px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
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
            <div className="flex flex-col gap-2">
              <Link
                href="/videos"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Library
              </Link>
              <Link
                href="/create-yours"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Create Yours
              </Link>
              <Link
                href="/pricing"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Pricing
              </Link>
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
