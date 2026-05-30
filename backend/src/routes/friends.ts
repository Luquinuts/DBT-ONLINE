import { Router } from 'express';
import { supabase } from '../db/client';
import { getAuthClient } from '../db/auth-client';
import type { SupabaseClient } from '@supabase/supabase-js';

const router = Router();

// ─── Middleware: extraer token + crear cliente autenticado ──────
async function getAuth(req: any): Promise<{
  user: any;
  sb: SupabaseClient;
  token: string;
} | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const sb = getAuthClient(token);
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, sb, token };
}

// ─── GET /api/friends — amigos aceptados ───────────────────────
router.get('/', async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { user, sb } = auth;

  const { data, error } = await sb
    .from('friends')
    .select('id, requester_id, addressee_id, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) return res.status(500).json({ error: error.message });

  // IDs de los amigos
  const friendIds = data.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Traer emails + usernames de los perfiles
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, email, username')
    .in('id', friendIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { email: p.email, username: p.username }])
  );

  const friends = data.map((f) => {
    const friendId =
      f.requester_id === user.id ? f.addressee_id : f.requester_id;
    const profile = profileMap.get(friendId);
    return {
      id: f.id,
      friendId,
      email: profile?.email ?? 'Desconocido',
      username: profile?.username ?? undefined,
      since: f.created_at,
    };
  });

  res.json({ friends });
});

// ─── GET /api/friends/requests — solicitudes pendientes ────────
router.get('/requests', async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { user, sb } = auth;

  const { data, error } = await sb
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('addressee_id', user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ error: error.message });

  // Traer emails + usernames de quienes solicitaron
  const requesterIds = data.map((r) => r.requester_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, email, username')
    .in('id', requesterIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { email: p.email, username: p.username }])
  );

  const requests = data.map((r) => {
    const profile = profileMap.get(r.requester_id);
    return {
      id: r.id,
      requesterId: r.requester_id,
      email: profile?.email ?? 'Desconocido',
      username: profile?.username ?? undefined,
      since: r.created_at,
    };
  });

  res.json({ requests });
});

// ─── POST /api/friends/request — enviar solicitud ──────────────
router.post('/request', async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { user, sb } = auth;
  const { friendEmail, friendUsername } = req.body;

  if (!friendEmail && !friendUsername) {
    return res.status(400).json({
      error: 'Email o nombre de usuario del amigo requerido',
    });
  }

  // Buscar perfil por email o username
  let profileQuery = sb.from('profiles').select('id, email, username');

  if (friendEmail) {
    profileQuery = profileQuery.eq('email', friendEmail);
  } else {
    profileQuery = profileQuery.eq('username', friendUsername);
  }

  const { data: profile, error: profileError } =
    await profileQuery.maybeSingle();

  if (profileError)
    return res.status(500).json({ error: profileError.message });

  if (!profile) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // No podés agregarte a vos mismo
  if (profile.id === user.id) {
    return res.status(400).json({ error: 'No podés agregarte a vos mismo' });
  }

  // Verificar si ya son amigos o hay solicitud pendiente
  const { data: existing } = await sb
    .from('friends')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),` +
        `and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: 'Ya son amigos' });
    }
    if (existing.status === 'pending') {
      const isMine = existing.id; // doesn't matter who sent it
      return res.status(400).json({ error: 'Ya hay una solicitud pendiente' });
    }
  }

  // Crear solicitud
  const { error: insertError } = await sb.from('friends').insert({
    requester_id: user.id,
    addressee_id: profile.id,
    status: 'pending',
  });

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  res.json({ success: true });
});

// ─── POST /api/friends/respond — aceptar/rechazar ──────────────
router.post('/respond', async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { user, sb } = auth;
  const { requestId, action } = req.body;

  if (!['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida' });
  }

  // Verificar que la solicitud existe y soy el destinatario
  const { data: request, error: reqError } = await sb
    .from('friends')
    .select('id, addressee_id')
    .eq('id', requestId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (reqError) return res.status(500).json({ error: reqError.message });
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const { error: updateError } = await sb
    .from('friends')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ success: true });
});

export default router;
