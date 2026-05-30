'use client';

import SidebarLayout from '@/components/SidebarLayout';

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-white">Ajustes</h1>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="text-sm text-gray-400">
                Los ajustes estarán disponibles próximamente.
              </p>
            </div>

            {/* Placeholder para futuros settings */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">
                Sonido
              </h2>
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                <span className="text-sm text-gray-400">
                  Efectos de sonido
                </span>
                <span className="text-xs text-gray-600">Próximamente</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">
                Notificaciones
              </h2>
              <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                <span className="text-sm text-gray-400">
                  Notificaciones de juego
                </span>
                <span className="text-xs text-gray-600">Próximamente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
