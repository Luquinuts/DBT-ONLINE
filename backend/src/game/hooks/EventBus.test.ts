import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, registerPassives } from './EventBus';
import { GameStateManager } from '../state/GameState';
import { createCharacterState } from '../state/GameState';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('registers and emits a handler', () => {
    const handler = vi.fn();
    bus.on('pre_turn', handler);
    const state = {} as any;
    bus.emit('pre_turn', state, 1, 2);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(state, 1, 2);
  });

  it('emits to multiple handlers on the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('pre_turn', h1);
    bus.on('pre_turn', h2);
    bus.emit('pre_turn', {} as any);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('unregisters a handler via off()', () => {
    const handler = vi.fn();
    bus.on('post_damage', handler);
    bus.off('post_damage', handler);
    bus.emit('post_damage', {} as any);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when emitting an event with no handlers', () => {
    expect(() => {
      bus.emit('pre_turn', {} as any);
    }).not.toThrow();
  });

  it('clears all handlers via clear()', () => {
    const handler = vi.fn();
    bus.on('pre_turn', handler);
    bus.on('post_turn', handler);
    bus.clear();
    bus.emit('pre_turn', {} as any);
    bus.emit('post_turn', {} as any);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('registerPassives', () => {
  let bus: EventBus;
  let state: GameStateManager;

  function makeStateWithCharacters(player0Chars: string[], player1Chars: string[]): GameStateManager {
    const ALL = [
      'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
      'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
      'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
    ];
    const mgr = new GameStateManager('TEST', 'p1', 'p2', ALL);
    const gs = mgr.getState();
    gs.phase = 'WAITING_FOR_ACTION';

    for (const id of player0Chars) {
      const def = mgr.getCharacterDef(id);
      if (def) gs.players[0].characters.push(createCharacterState(def));
    }
    for (const id of player1Chars) {
      const def = mgr.getCharacterDef(id);
      if (def) gs.players[1].characters.push(createCharacterState(def));
    }
    return mgr;
  }

  beforeEach(() => {
    bus = new EventBus();
    registerPassives(bus);
  });

  it('SSJ3 Gotenks counter-damage fires on post_damage', () => {
    // Gotenks on P1, attacker is P0
    state = makeStateWithCharacters(['ssj-broly'], ['ssj3-gotenks']);
    const attackerChar = state.getPlayer(0).characters[0];
    const gotenksChar = state.getPlayer(1).characters[0];
    const beforeHp = attackerChar.currentVida;

    bus.emit('post_damage', state, 0, 1, gotenksChar.characterId);

    expect(attackerChar.currentVida).toBe(beforeHp - 1);
  });

  it('SSJ3 Gotenks counter-damage does not fire for non-Gotenks target', () => {
    state = makeStateWithCharacters(['ssj-broly'], ['ssj-blue-vegeta']);
    const attackerChar = state.getPlayer(0).characters[0];
    const targetChar = state.getPlayer(1).characters[0];
    const beforeHp = attackerChar.currentVida;

    bus.emit('post_damage', state, 0, 1, targetChar.characterId);

    expect(attackerChar.currentVida).toBe(beforeHp);
  });

  it('Kid Buu nullifies battlefield on pre_turn', () => {
    state = makeStateWithCharacters(['kid-buu'], ['ssj-broly']);
    // Set a battlefield
    const battlefield = { id: 'beerus-planet', name: 'Beerus Planet', effect: 'attack:2', description: '' };
    state.setBattlefield(battlefield);
    expect(state.getState().battlefield).not.toBeNull();

    bus.emit('pre_turn', state);

    expect(state.getState().battlefield).toBeNull();
  });

  it('Kid Buu nullify only triggers if Kid Buu is alive', () => {
    state = makeStateWithCharacters(['kid-buu'], ['ssj-broly']);
    // Kill Kid Buu
    state.getPlayer(0).characters[0].isAlive = false;
    const battlefield = { id: 'beerus-planet', name: 'Beerus Planet', effect: 'attack:2', description: '' };
    state.setBattlefield(battlefield);

    bus.emit('pre_turn', state);

    expect(state.getState().battlefield).not.toBeNull();
  });

  it('A17&A18 ki per turn fires on pre_turn', () => {
    state = makeStateWithCharacters(['a17-a18'], ['ssj-broly']);
    const p0kiBefore = state.getPlayer(0).ki;

    bus.emit('pre_turn', state);

    expect(state.getPlayer(0).ki).toBe(p0kiBefore + 1);
  });

  it('A17&A18 ki per turn does not fire if the android is dead', () => {
    state = makeStateWithCharacters(['a17-a18'], ['ssj-broly']);
    state.getPlayer(0).characters[0].isAlive = false;
    const p0kiBefore = state.getPlayer(0).ki;

    bus.emit('pre_turn', state);

    expect(state.getPlayer(0).ki).toBe(p0kiBefore);
  });

  it('multiple passives on the same event all fire (Kid Buu + A17&A18)', () => {
    state = makeStateWithCharacters(['kid-buu', 'a17-a18'], ['ssj-broly']);
    state.getPlayer(0).ki = 0;
    const battlefield = { id: 'beerus-planet', name: 'Beerus Planet', effect: 'attack:2', description: '' };
    state.setBattlefield(battlefield);

    bus.emit('pre_turn', state);

    // Kid Buu nullified the battlefield
    expect(state.getState().battlefield).toBeNull();
    // A17&A18 gave ki
    expect(state.getPlayer(0).ki).toBe(1);
  });
});
