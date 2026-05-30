'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const err = await register(email, password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">¡Registrado!</h1>
          <p className="text-gray-400">
            Revisá tu correo para confirmar la cuenta.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white hover:bg-[#d63850]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">DBT Online</h1>
          <p className="mt-2 text-gray-400">Crear cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">
              Repetir contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[#e94560] hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
