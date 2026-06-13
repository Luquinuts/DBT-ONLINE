'use client';

import SidebarLayout from '@/components/SidebarLayout';

export default function ShopPage() {
  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-white">Tienda</h1>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <p className="text-sm text-gray-400">
              La tienda estará disponible próximamente.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-gray-400">
              Próximamente
            </h2>

            <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
              <div>
                <p className="text-sm text-gray-400">Paquete de personajes</p>
                <p className="text-xs text-gray-600">Desbloquea personajes exclusivos</p>
              </div>
              <span className="text-xs text-gray-600">Próximamente</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
