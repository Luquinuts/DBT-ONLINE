'use client';

import { useState, useEffect } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import type { CharacterDef, BattlefieldDef, CardDef } from '@dbt-online/shared';

interface CatalogData {
  characters: CharacterDef[];
  battlefields: BattlefieldDef[];
  cards: CardDef[];
}

type Tab = 'characters' | 'battlefields' | 'cards';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function CatalogPage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('characters');

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/data`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((d: CatalogData) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <h1 className="mb-6 text-2xl font-bold text-white">
          📖 Catálogo
        </h1>

        {loading && (
          <p className="text-sm text-gray-400">Cargando datos...</p>
        )}
        {error && (
          <p className="text-sm text-red-400">Error: {error}</p>
        )}

        {data && (
          <>
            {/* ─── Tabs ───────────────────────── */}
            <div className="mb-6 flex gap-1 rounded-lg bg-gray-800 p-1">
              {[
                { key: 'characters' as Tab, label: 'Personajes', count: data.characters.length },
                { key: 'battlefields' as Tab, label: 'Mapas', count: data.battlefields.length },
                { key: 'cards' as Tab, label: 'Cartas', count: data.cards.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-[#e94560] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {/* ─── Characters Tab ────────────── */}
            {tab === 'characters' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.characters.map((char) => (
                  <CharacterCard key={char.id} char={char} />
                ))}
              </div>
            )}

            {/* ─── Battlefields Tab ──────────── */}
            {tab === 'battlefields' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.battlefields.map((bf) => (
                  <BattlefieldCard key={bf.id} bf={bf} />
                ))}
              </div>
            )}

            {/* ─── Cards Tab ─────────────────── */}
            {tab === 'cards' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.cards.map((card) => (
                  <CardItem key={card.id} card={card} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// ─── Character Card ───────────────────────────────────────────

function CharacterCard({ char }: { char: CharacterDef }) {
  const typeLabel: Record<string, string> = {
    TANQUE: 'Tanque',
    DAMAGE: 'Daño',
    SUPPORT: 'Soporte',
  };

  const typeColor: Record<string, string> = {
    TANQUE: 'border-blue-500 text-blue-400',
    DAMAGE: 'border-red-500 text-red-400',
    SUPPORT: 'border-green-500 text-green-400',
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{char.name}</h3>
          <span
            className={`inline-block mt-1 rounded border px-2 py-0.5 text-xs font-medium ${typeColor[char.type] || 'border-gray-500 text-gray-400'}`}
          >
            {typeLabel[char.type] || char.type}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded bg-gray-700/50 p-1.5">
          <p className="text-xs text-gray-400">Vida</p>
          <p className="font-bold text-white">{char.stats.vida}</p>
        </div>
        <div className="rounded bg-gray-700/50 p-1.5">
          <p className="text-xs text-gray-400">Lentitud</p>
          <p className="font-bold text-white">{char.stats.lentitud}</p>
        </div>
        <div className="rounded bg-gray-700/50 p-1.5">
          <p className="text-xs text-gray-400">Ataque</p>
          <p className="font-bold text-white">{char.stats.ataque}</p>
        </div>
      </div>

      {/* Abilities */}
      <div className="space-y-2">
        {char.abilities.pasiva && (
          <AbilityBadge
            label="Pasiva"
            name={char.abilities.pasiva.name}
            desc={char.abilities.pasiva.description}
          />
        )}
        {char.abilities.habilidad && (
          <AbilityBadge
            label="Habilidad"
            name={char.abilities.habilidad.name}
            desc={char.abilities.habilidad.description}
            extra={
              char.abilities.habilidad.cooldown > 0
                ? `CD: ${char.abilities.habilidad.cooldown}`
                : char.abilities.habilidad.usesPerGame
                  ? `${char.abilities.habilidad.usesPerGame} uso/s`
                  : undefined
            }
          />
        )}
        {char.abilities.definitiva && (
          <AbilityBadge
            label="Definitiva"
            name={char.abilities.definitiva.name}
            desc={char.abilities.definitiva.description}
            extra={`${char.abilities.definitiva.kiCost} ki`}
          />
        )}
      </div>

      {/* Icons */}
      {Object.keys(char.icons).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {char.icons.rage && <IconTag label="Rage" />}
          {char.icons.change && <IconTag label="Cambio de forma" />}
          {char.icons.deathIcon && <IconTag label="Death icon" />}
        </div>
      )}
    </div>
  );
}

function AbilityBadge({
  label,
  name,
  desc,
  extra,
}: {
  label: string;
  name: string;
  desc: string;
  extra?: string;
}) {
  return (
    <div className="rounded bg-gray-700/30 p-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#e94560]">
          {label}
        </span>
        {extra && (
          <span className="text-xs text-gray-500">{extra}</span>
        )}
      </div>
      <p className="mt-0.5 font-medium text-white">{name}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
        {desc}
      </p>
    </div>
  );
}

function IconTag({ label }: { label: string }) {
  return (
    <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
      {label}
    </span>
  );
}

// ─── Battlefield Card ────────────────────────────────────────

function BattlefieldCard({ bf }: { bf: BattlefieldDef }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-2 text-lg font-bold text-white">{bf.name}</h3>
      <p className="text-sm leading-relaxed text-gray-400">
        {bf.description}
      </p>
      <span className="mt-2 inline-block rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-500">
        {bf.effect}
      </span>
    </div>
  );
}

// ─── Card Item ───────────────────────────────────────────────

const cardColors: Record<string, string> = {
  ACCION: 'border-blue-500/50',
  ITEM: 'border-purple-500/50',
  BATTLEFIELD: 'border-green-500/50',
};

const cardBgColors: Record<string, string> = {
  ACCION: 'bg-blue-500/10',
  ITEM: 'bg-purple-500/10',
  BATTLEFIELD: 'bg-green-500/10',
};

function CardItem({ card }: { card: CardDef }) {
  return (
    <div
      className={`rounded-lg border p-4 ${cardColors[card.category] || 'border-gray-700'} ${cardBgColors[card.category] || 'bg-gray-800/50'}`}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-base font-bold text-white">{card.name}</h3>
        <span className="rounded bg-gray-700/50 px-1.5 py-0.5 text-xs font-medium text-gray-400">
          {card.category}
        </span>
      </div>
      <p className="mb-2 text-sm leading-relaxed text-gray-400">
        {card.description}
      </p>
      <div className="flex flex-wrap gap-1">
        <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-500">
          {card.effect}
        </span>
        {card.isDefense && (
          <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
            Defensa
          </span>
        )}
        {card.isEquipable && (
          <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">
            Equipable
          </span>
        )}
        {card.usageLimit && (
          <span className="rounded bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400">
            ×{card.usageLimit}
          </span>
        )}
      </div>
    </div>
  );
}
