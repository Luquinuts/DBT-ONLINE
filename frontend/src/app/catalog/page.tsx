'use client';

import { useState, useEffect } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { GameImage } from '@/components/game/GameImage';
import { HoloCard } from '@/components/game/HoloCard';
import { getCharacterImageSrc, getBattlefieldImageSrc, getCardImageSrc } from '@/lib/assets';
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

  // Modal state
  const [selectedChar, setSelectedChar] = useState<CharacterDef | null>(null);
  const [selectedBf, setSelectedBf] = useState<BattlefieldDef | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDef | null>(null);

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

  const closeModal = () => {
    setSelectedChar(null);
    setSelectedBf(null);
    setSelectedCard(null);
  };

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col p-4 pb-20 md:pb-4">
        <h1 className="mb-6 text-2xl font-bold text-white">📖 Catálogo</h1>

        {loading && <p className="text-sm text-gray-400">Cargando datos...</p>}
        {error && <p className="text-sm text-red-400">Error: {error}</p>}

        {data && (
          <>
            {/* ─── Tabs ───────────────────────── */}
            <div className="mb-6 flex gap-1 rounded-lg bg-gray-800 p-1">
              {([
                { key: 'characters' as Tab, label: 'Personajes', count: data.characters.length },
                { key: 'battlefields' as Tab, label: 'Mapas', count: data.battlefields.length },
                { key: 'cards' as Tab, label: 'Cartas', count: data.cards.length },
              ] as const).map((t) => (
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

            {/* ─── Characters Grid ───────────── */}
            {tab === 'characters' && (
              <div className="space-y-8">
                {typeOrder.map((t) => {
                  const chars = data.characters.filter((c) => c.type === t);
                  if (chars.length === 0) return null;
                  return (
                    <div key={t}>
                      <h3 className={`mb-3 border-b pb-1 text-sm font-semibold uppercase tracking-wider ${typeSectionColor[t]}`}>
                        {typeLabel[t]} ({chars.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {chars.map((char) => (
                          <button
                            key={char.id}
                            onClick={() => setSelectedChar(char)}
                            className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 transition hover:border-[#e94560]/50 hover:shadow-lg hover:shadow-[#e94560]/10"
                          >
                            <HoloCard className="absolute inset-0">
                              <GameImage
                                src={getCharacterImageSrc(char.id)}
                                alt={char.name}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                fallback={<span className="text-4xl text-gray-600">?</span>}
                              />
                            </HoloCard>
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-sm font-bold text-white truncate">{char.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Battlefields Grid ─────────── */}
            {tab === 'battlefields' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.battlefields.map((bf) => (
                  <button
                    key={bf.id}
                    onClick={() => setSelectedBf(bf)}
                    className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 transition hover:border-[#e94560]/50 hover:shadow-lg hover:shadow-[#e94560]/10"
                  >
                    <HoloCard className="absolute inset-0">
                      <GameImage
                        src={getBattlefieldImageSrc(bf.id)}
                        alt={bf.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        fallback={
                          <span className="text-4xl text-gray-600">🗺️</span>
                        }
                      />
                    </HoloCard>
                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-sm font-bold text-white truncate">
                        {bf.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ─── Cards Grid ─────────────────── */}
            {tab === 'cards' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 transition hover:border-[#e94560]/50 hover:shadow-lg hover:shadow-[#e94560]/10"
                  >
                    <HoloCard className="absolute inset-0">
                      <GameImage
                        src={getCardImageSrc(card.id) ?? ''}
                        alt={card.name}
                        className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                        fallback={
                          <span className="text-4xl text-gray-600">🃏</span>
                        }
                      />
                    </HoloCard>
                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-sm font-bold text-white truncate">
                        {card.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Detail Modals ──────────────────────────────── */}

      {/* Character Detail Modal */}
      {selectedChar && (
        <DetailModal onClose={closeModal}>
          <CharacterDetail char={selectedChar} />
        </DetailModal>
      )}

      {/* Battlefield Detail Modal */}
      {selectedBf && (
        <DetailModal onClose={closeModal}>
          <BattlefieldDetail bf={selectedBf} />
        </DetailModal>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <DetailModal onClose={closeModal}>
          <CardDetail card={selectedCard} />
        </DetailModal>
      )}
    </SidebarLayout>
  );
}

// ─── Modal Shell ─────────────────────────────────────────────

function DetailModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-gray-700 bg-[#1a1a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Character Detail ────────────────────────────────────────

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

const typeSectionColor: Record<string, string> = {
  TANQUE: 'text-blue-400 border-blue-500/30',
  DAMAGE: 'text-red-400 border-red-500/30',
  SUPPORT: 'text-green-400 border-green-500/30',
};

const typeOrder = ['TANQUE', 'DAMAGE', 'SUPPORT'] as const;

function CharacterDetail({ char }: { char: CharacterDef }) {
  return (
    <div className="flex gap-4">
      {/* Image — left */}
      <div className="w-52 flex-shrink-0 overflow-hidden rounded-lg">
        <HoloCard className="w-full">
          <GameImage
            src={getCharacterImageSrc(char.id)}
            alt={char.name}
            className="w-full object-cover"
            fallback={<div className="h-72 w-full bg-gray-800" />}
          />
        </HoloCard>
      </div>

      {/* Data — right */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{char.name}</h2>
            <span className={`inline-block mt-1 rounded border px-2 py-0.5 text-xs font-medium ${typeColor[char.type] || 'border-gray-500 text-gray-400'}`}>
              {typeLabel[char.type] || char.type}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-gray-700/50 p-2">
            <p className="text-xs text-gray-400">Vida</p>
            <p className="text-lg font-bold text-white">{char.stats.vida}</p>
          </div>
          <div className="rounded bg-gray-700/50 p-2">
            <p className="text-xs text-gray-400">Lentitud</p>
            <p className="text-lg font-bold text-white">{char.stats.lentitud}</p>
          </div>
          <div className="rounded bg-gray-700/50 p-2">
            <p className="text-xs text-gray-400">Ataque</p>
            <p className="text-lg font-bold text-white">{char.stats.ataque}</p>
          </div>
        </div>

        {/* Abilities */}
        <div className="space-y-2">
          {char.abilities.pasiva && (
            <AbilityDetail label="Pasiva" name={char.abilities.pasiva.name} desc={char.abilities.pasiva.description} />
          )}
          {char.abilities.habilidad && (
            <AbilityDetail
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
            <AbilityDetail
              label="Definitiva"
              name={char.abilities.definitiva.name}
              desc={char.abilities.definitiva.description}
              extra={`${char.abilities.definitiva.kiCost} ki`}
            />
          )}
        </div>

        {/* Icons */}
        {Object.keys(char.icons).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {char.icons.rage && <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">Rage</span>}
            {char.icons.change && <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">Cambio de forma</span>}
            {char.icons.deathIcon && <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Death icon</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AbilityDetail({ label, name, desc, extra }: { label: string; name: string; desc: string; extra?: string }) {
  return (
    <div className="rounded bg-gray-700/30 p-3 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#e94560]">{label}</span>
        {extra && <span className="text-xs text-gray-500">{extra}</span>}
      </div>
      <p className="font-medium text-white">{name}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-400">{desc}</p>
    </div>
  );
}

// ─── Battlefield Detail ──────────────────────────────────────

function BattlefieldDetail({ bf }: { bf: BattlefieldDef }) {
  return (
    <div className="flex gap-4">
      <div className="w-60 flex-shrink-0 overflow-hidden rounded-lg">
        <HoloCard className="w-full">
          <GameImage
            src={getBattlefieldImageSrc(bf.id)}
            alt={bf.name}
            className="w-full object-cover"
            fallback={<div className="h-40 w-full bg-gray-800" />}
          />
        </HoloCard>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-xl font-bold text-white">{bf.name}</h2>
        <p className="text-sm leading-relaxed text-gray-400">{bf.description}</p>
        <span className="inline-block self-start rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-500">
          {bf.effect}
        </span>
      </div>
    </div>
  );
}

// ─── Card Detail ─────────────────────────────────────────────

const cardColors: Record<string, string> = {
  ACCION: 'bg-blue-500/10 border-blue-500/30',
  ITEM: 'bg-purple-500/10 border-purple-500/30',
  BATTLEFIELD: 'bg-green-500/10 border-green-500/30',
};

function CardDetail({ card }: { card: CardDef }) {
  const styleClass = cardColors[card.category] || 'bg-gray-800 border-gray-700';
  return (
    <div className="flex gap-4">
      <div className={`w-48 flex-shrink-0 overflow-hidden rounded-lg border ${styleClass}`}>
        <HoloCard className="w-full">
          <GameImage
            src={getCardImageSrc(card.id) ?? ''}
            alt={card.name}
            className="w-full object-contain p-4"
            fallback={<div className="h-64 w-full bg-gray-800" />}
          />
        </HoloCard>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">{card.name}</h2>
          <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs font-medium text-gray-400">
            {card.category}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-gray-400">{card.description}</p>

        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-500">
            {card.effect}
          </span>
          {card.isDefense && (
            <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">Defensa</span>
          )}
          {card.isEquipable && (
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">Equipable</span>
          )}
          {card.usageLimit && (
            <span className="rounded bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400">×{card.usageLimit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
