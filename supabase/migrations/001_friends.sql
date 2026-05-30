-- ─── Profiles (sincronizado con auth.users) ────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-crear profile al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS: cualquier usuario autenticado puede leer profiles (para buscar amigos)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ─── Amigos ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friends (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(addressee_id);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Ver tus amigos y solicitudes
CREATE POLICY "friends_select_own"
  ON public.friends
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Enviar solicitud
CREATE POLICY "friends_insert_own"
  ON public.friends
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Aceptar/rechazar (solo el destinatario)
CREATE POLICY "friends_update_as_addressee"
  ON public.friends
  FOR UPDATE
  TO authenticated
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid() AND status IN ('accepted', 'rejected'));

-- Una solicitud no puede existir en ambas direcciones
CREATE OR REPLACE FUNCTION check_friends_unique_pair()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.friends
    WHERE requester_id = NEW.addressee_id
      AND addressee_id = NEW.requester_id
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud entre estos usuarios';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_friends_unique_pair ON public.friends;
CREATE TRIGGER trg_friends_unique_pair
  BEFORE INSERT ON public.friends
  FOR EACH ROW EXECUTE FUNCTION check_friends_unique_pair();
