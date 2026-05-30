import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[db] SUPABASE_URL y SUPABASE_ANON_KEY no están definidos en .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
