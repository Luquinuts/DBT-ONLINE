import { createClient } from '@supabase/supabase-js';

/**
 * Crea un cliente Supabase autenticado con el JWT del usuario.
 * Esto permite que las consultas pasen por RLS como `authenticated`.
 */
export function getAuthClient(token: string) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}
