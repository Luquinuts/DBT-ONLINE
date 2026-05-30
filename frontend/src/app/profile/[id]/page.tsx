'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { useAuth } from '@/lib/auth';

interface ProfileData {
  id: string;
  email: string;
  username: string | null;
  createdAt: string;
  friendCount: number;
}

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isOwnProfile = user?.id === profileId;

  async function loadProfile() {
    setLoading(true);
    setNotFound(false);
    setFetchError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profiles/${profileId}`
      );

      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setFetchError(`Error al cargar el perfil (${res.status})`);
        setLoading(false);
        return;
      }

      const data: ProfileData = await res.json();
      setProfile(data);
    } catch {
      setFetchError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profileId) loadProfile();
  }, [profileId]);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* ─── Loading ─────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-gray-400">Cargando perfil...</p>
            </div>
          )}

          {/* ─── Not found ───────────────────────────── */}
          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-4xl mb-2">😕</p>
              <p className="text-lg font-medium text-white">
                Perfil no encontrado
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Este usuario no existe o no tiene un perfil público.
              </p>
              <Link
                href="/"
                className="mt-6 text-sm text-[#e94560] hover:text-[#d63850]"
              >
                ← Volver al inicio
              </Link>
            </div>
          )}

          {/* ─── Error ───────────────────────────────── */}
          {!loading && fetchError && !notFound && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {fetchError}
              </p>
              <button
                onClick={loadProfile}
                className="mt-4 rounded-lg bg-[#e94560] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63850] transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ─── Profile content ─────────────────────── */}
          {!loading && !fetchError && !notFound && profile && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                {/* Avatar placeholder */}
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#e94560]/20 text-3xl font-bold text-[#e94560]">
                  {(profile.username || profile.email)[0].toUpperCase()}
                </div>

                <h1 className="text-2xl font-bold text-white">
                  {profile.username || 'Sin nombre'}
                </h1>
                {isOwnProfile && (
                  <p className="mt-1 text-sm text-[#e94560]">Tu perfil</p>
                )}
              </div>

              {/* Info card */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 divide-y divide-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Email</span>
                  <span className="text-sm text-white">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Miembro desde</span>
                  <span className="text-sm text-white">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Amigos</span>
                  <span className="text-sm text-white">
                    {profile.friendCount}
                  </span>
                </div>
              </div>

              {/* Own profile link */}
              {isOwnProfile && (
                <Link
                  href="/account"
                  className="block rounded-lg border border-gray-600 px-4 py-3 text-center text-sm text-white hover:bg-gray-800 transition-colors"
                >
                  Ir a mi cuenta →
                </Link>
              )}

              {/* Back link */}
              <div className="text-center">
                <Link
                  href="/friends"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Volver a amigos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
