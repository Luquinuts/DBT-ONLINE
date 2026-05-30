import { Router } from 'express';
import { supabase } from '../db/client';

const router = Router();

// ─── Middleware: extraer usuario ────────────────────────────────
async function getUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return data.user;
}

// ─── GET /api/friends — amigos aceptados ───────────────────────
router.get('/', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { data, error } = await supabase
    .from('friends')
    .select('id, requester_id, addressee_id, created_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) return res.status(500).json({ error: error.message });

  // IDs de los amigos
  const friendIds = data.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Traer emails de los perfiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', friendIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.email]));

  const friends = data.map((f) => {
    const friendId =
      f.requester_id === user.id ? f.addressee_id : f.requester_id;
    return {
      id: f.id,
      friendId,
      email: profileMap.get(friendId) ?? 'Desconocido',
      since: f.created_at,
    };
  });

  res.json({ friends });
});

// ─── GET /api/friends/requests — solicitudes pendientes ────────
router.get('/requests', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { data, error } = await supabase
    .from('friends')
    .select('id, requester_id, created_at')
    .eq('addressee_id', user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ error: error.message });

  // Traer emails de quienes solicitaron
  const requesterIds = data.map((r) => r.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', requesterIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p.email]));

  const requests = data.map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    email: profileMap.get(r.requester_id) ?? 'Desconocido',
    since: r.created_at,
  }));

  res.json({ requests });
});

// ─── POST /api/friends/request — enviar solicitud ──────────────
router.post('/request', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { friendEmail } = req.body;
  if (!friendEmail) {
    return res.status(400).json({ error: 'Email del amigo requerido' });
  }

  if (friendEmail === user.email) {
    return res.status(400).json({ error: 'No podés agregarte a vos mismo' });
  }

  // Buscar perfil por email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', friendEmail)
    .maybeSingle();

  if (profileError)
    return res.status(500).json({ error: profileError.message });

  if (!profile) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Verificar si ya son amigos o hay solicitud pendiente
  const { data: existing } = await supabase
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
      return res.status(400).json({ error: 'Ya hay una solicitud pendiente' });
    }
  }

  // Crear solicitud
  const { error: insertError } = await supabase.from('friends').insert({
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
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { requestId, action } = req.body; // action: 'accepted' | 'rejected'

  if (!['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida' });
  }

  // Verificar que la solicitud existe y soy el destinatario
  const { data: request, error: reqError } = await supabase
    .from('friends')
    .select('id, addressee_id')
    .eq('id', requestId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (reqError) return res.status(500).json({ error: reqError.message });
  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const { error: updateError } = await supabase
    .from('friends')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ success: true });
});

export default router;
