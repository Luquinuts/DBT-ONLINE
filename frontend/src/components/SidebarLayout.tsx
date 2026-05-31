'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import type { ReactNode } from 'react';

const links = [
  { href: '/', label: 'Jugar', icon: '🎮' },
  { href: '/catalog', label: 'Catálogo', icon: '📖' },
  { href: '/friends', label: 'Amigos', icon: '👥' },
  { href: '/account', label: 'Cuenta', icon: '👤' },
  { href: '/settings', label: 'Ajustes', icon: '⚙️' },
];

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Protección: si no está autenticado, redirect a login
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#1a1a2e]">
      {/* ─── Sidebar (Desktop) ─────────────────────────────── */}
      <aside className="hidden w-56 flex-col border-r border-gray-800 bg-[#16213e] p-4 md:flex">
        {/* Logo */}
        <Link href="/" className="mb-8 text-xl font-bold text-white">
          DBT Online
        </Link>

        {/* Navegación */}
        <nav className="flex-1 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#e94560]/20 text-[#e94560]'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-800 pt-4">
          <div className="mb-3 truncate text-sm text-gray-500">
            {user.email}
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Header mobile */}
        <header className="flex items-center justify-between border-b border-gray-800 bg-[#16213e] px-4 py-3 md:hidden">
          <Link href="/" className="text-lg font-bold text-white">
            DBT Online
          </Link>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-[#e94560]"
          >
            Salir
          </button>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>

      {/* ─── Bottom nav (Mobile) ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-[#16213e] md:hidden">
        <div className="flex justify-around py-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'text-[#e94560]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
