'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/useProfile';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Jugar' },
  { href: '/catalog', label: 'Personajes' },
  { href: '/shop', label: 'Tienda' },
  { href: '/account', label: 'Tu Cuenta' },
  { href: '/settings', label: 'Opciones' },
];

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { profile } = useProfile();

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a192f]">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a192f]">
      {/* Stars background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, #eee, transparent),
            radial-gradient(1px 1px at 40px 70px, #fff, transparent),
            radial-gradient(1px 1px at 50px 160px, #ddd, transparent),
            radial-gradient(2px 2px at 90px 40px, #fff, transparent),
            radial-gradient(2px 2px at 130px 80px, #fff, transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* ─── Top header bar ────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 md:px-8 md:py-4 bg-gradient-to-b from-black/80 to-transparent">
        {/* User profile */}
        <Link href="/account" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-gray-400 bg-gray-800 transition-colors group-hover:border-[#64ffda] md:h-12 md:w-12">
            <svg className="h-6 w-6 text-gray-400 group-hover:text-[#64ffda]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="hidden md:block">
            <div className="text-lg font-bold tracking-wide text-white transition-colors group-hover:text-[#64ffda]">
              {profile?.username || 'Jugador'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-bold text-yellow-500">Lvl 1</span>
              <span className="h-1 w-1 rounded-full bg-gray-400" />
              <span className="font-bold text-blue-400">Rango: Bronce</span>
            </div>
          </div>
        </Link>

        {/* Currency */}
        <div className="flex gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 rounded border border-gray-600 bg-black/40 px-2.5 py-1 md:px-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-black md:h-6 md:w-6">
              Z
            </div>
            <span className="font-mono text-sm font-bold text-white md:text-lg">0</span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-gray-600 bg-black/40 px-2.5 py-1 md:px-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white shadow-[0_0_8px_rgba(168,85,247,0.8)] md:h-6 md:w-6">
              DS
            </div>
            <span className="font-mono text-sm font-bold text-purple-300 md:text-lg">0</span>
          </div>
        </div>
      </header>

      {/* ─── Navigation tabs ───────────────────────────────── */}
      <nav className="relative z-20 flex justify-center gap-6 px-4 pt-2 text-lg tracking-widest text-gray-400 md:gap-12 md:text-2xl">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item relative font-bold uppercase transition-colors ${
                isActive ? 'text-[#64ffda]' : 'text-gray-400 hover:text-[#64ffda]'
              }`}
            >
              {item.label}
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-[#64ffda] transition-all duration-300 ${
                  isActive ? 'w-full' : 'w-0'
                }`}
              />
            </Link>
          );
        })}
      </nav>

      {/* ─── Main content ──────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>

      {/* ─── Bottom nav (Mobile) ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-[#112240] md:hidden">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition ${
                  isActive ? 'text-[#64ffda]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
