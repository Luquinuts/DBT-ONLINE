-- ─── DBT Online — Schema Inicial ───────────────────────────────
-- Esta migración crea las tablas base para persistencia.
-- Ejecutar en Supabase SQL Editor o via migración.

-- Salas
CREATE TABLE IF NOT EXISTS rooms (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code      VARCHAR(6) UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'waiting'
            CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INT NOT NULL DEFAULT 4,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);

-- Jugadores
CREATE TABLE IF NOT EXISTS players (
  id        TEXT PRIMARY KEY,  -- socket id por ahora, luego auth
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  is_host   BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);

-- Partidas (para historial)
CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'playing'
              CHECK (status IN ('playing', 'finished', 'cancelled')),
  winner_id   TEXT REFERENCES players(id),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

-- Rondas de cada partida
CREATE TABLE IF NOT EXISTS rounds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  number      INT NOT NULL,
  winner_id   TEXT REFERENCES players(id),
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jugadas de cada ronda
CREATE TABLE IF NOT EXISTS plays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES players(id),
  card_suit   TEXT NOT NULL,
  card_rank   TEXT NOT NULL,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
