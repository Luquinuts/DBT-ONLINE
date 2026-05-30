'use client';

import { useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { useProfile } from '@/lib/useProfile';

export default function AccountPage() {
  const { profile, loading, updateUsername } = useProfile();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await updateUsername(username.trim());
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
    setSaving(false);
  };

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-white">Cuenta</h1>

          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : !profile ? (
            <p className="text-gray-400">No se pudo cargar el perfil</p>
          ) : (
            <>
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Email
                </label>
                <p className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-white">
                  {profile.email}
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Nombre de usuario
                </label>
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      placeholder="Tu nombre en el juego"
                      className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving || !username.trim()}
                        className="rounded-lg bg-[#e94560] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63850] disabled:opacity-50"
                      >
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {success && (
                      <p className="text-sm text-green-400">¡Guardado!</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2">
                    <span className="text-white">
                      {profile.username || (
                        <span className="text-gray-500">Sin definir</span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setUsername(profile.username || '');
                        setEditing(true);
                      }}
                      className="text-sm text-[#e94560] hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>

              {/* Info adicional */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase">
                  Información
                </h3>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Miembro desde</span>
                    <span className="text-white">Próximamente</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
