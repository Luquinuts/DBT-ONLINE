export const CARD_DISPLAY: Record<
  string,
  {
    displayName: string;
    effect: string;
    type: 'ACCION' | 'ITEM';
    icon: string;
    color: string;
  }
> = {
  carga_ki: {
    displayName: 'Carga de Ki',
    effect: '+1 ki al equipo',
    type: 'ACCION',
    icon: '⚡',
    color: '#fbbf24',
  },
  super_carga_ki: {
    displayName: 'Super Carga de Ki',
    effect: '+2 ki al equipo',
    type: 'ACCION',
    icon: '⚡⚡',
    color: '#f59e0b',
  },
  esquive: {
    displayName: 'Esquive',
    effect: 'Esquiva un ataque normal',
    type: 'ACCION',
    icon: '💨',
    color: '#38bdf8',
  },
  semilla_senzu: {
    displayName: 'Semilla Senzu',
    effect: 'Recupera +3 de vida',
    type: 'ACCION',
    icon: '🫘',
    color: '#22c55e',
  },
  plus_vida: {
    displayName: '+1 de Vida',
    effect: 'Agrega +1 de vida (equipable)',
    type: 'ACCION',
    icon: '❤️',
    color: '#ef4444',
  },
  maquina_tiempo: {
    displayName: 'Máquina del Tiempo',
    effect: '2 turnos seguidos',
    type: 'ACCION',
    icon: '⏰',
    color: '#a855f7',
  },
  ultimate: {
    displayName: 'ULTIMATE',
    effect: 'Todos atacan sin lentitud',
    type: 'ACCION',
    icon: '💥',
    color: '#ec4899',
  },
  escudo: {
    displayName: 'Escudo',
    effect: 'Cubre cualquier ataque',
    type: 'ACCION',
    icon: '🛡️',
    color: '#6366f1',
  },
  nube_kinton: {
    displayName: 'Nube Kinton',
    effect: 'Ataca sin lentitud (1/personaje)',
    type: 'ITEM',
    icon: '☁️',
    color: '#e0e7ff',
  },
  nave_espacial: {
    displayName: 'Nave Espacial',
    effect: 'Cambia el campo de batalla',
    type: 'ITEM',
    icon: '🚀',
    color: '#f97316',
  },
  baculo_sagrado: {
    displayName: 'Báculo Sagrado',
    effect: '1 daño, rompe escudos',
    type: 'ITEM',
    icon: '🏏',
    color: '#fde68a',
  },
  rage: {
    displayName: 'Rage',
    effect: '+1 ATK permanente (símbolo mejora)',
    type: 'ITEM',
    icon: '👑',
    color: '#fb923c',
  },
  esfera_dragon: {
    displayName: 'Esferas del Dragón',
    effect: 'Revive un personaje (1 uso)',
    type: 'ITEM',
    icon: '🔮',
    color: '#fbbf24',
  },
};
