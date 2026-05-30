'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Friend {
  id: string;
  friendId: string;
  email: string;
  since: string;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  email: string;
  since: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadData() {
    const token = await getToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    const [friendsRes, requestsRes] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends`,
        { headers }
      ),
      fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends/requests`,
        { headers }
      ),
    ]);

    if (friendsRes.ok) {
      const data = await friendsRes.json();
      setFriends(data.friends);
    }
    if (requestsRes.ok) {
      const data = await requestsRes.json();
      setRequests(data.requests);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function sendRequest() {
    setError(null);
    setSuccess(null);

    const token = await getToken();
    if (!token) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendEmail }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(`Solicitud enviada a ${friendEmail}`);
      setFriendEmail('');
    }
  }

  async function respondToRequest(
    requestId: string,
    action: 'accepted' | 'rejected'
  ) {
    const token = await getToken();
    if (!token) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends/respond`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, action }),
      }
    );

    loadData();
  }

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <div className="mx-auto w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-white">Amigos</h1>

          {/* Agregar amigo */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">
              Agregar amigo por email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="amigo@email.com"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                className="flex-1 rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
              />
              <button
                onClick={sendRequest}
                disabled={!friendEmail.trim()}
                className="rounded-lg bg-[#e94560] px-4 py-2 font-semibold text-white hover:bg-[#d63850] disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}
          </div>

          {/* Solicitudes pendientes */}
          {requests.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-400 uppercase">
                Solicitudes ({requests.length})
              </h2>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
                  >
                    <span className="text-white">{r.email}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(r.id, 'accepted')}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => respondToRequest(r.id, 'rejected')}
                        className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-500"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de amigos */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-400 uppercase">
              Tus amigos ({friends.length})
            </h2>
            {loading ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-gray-500">
                No tenés amigos todavía. Agregálos por email arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
                  >
                    <span className="text-white">{f.email}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(f.since).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
