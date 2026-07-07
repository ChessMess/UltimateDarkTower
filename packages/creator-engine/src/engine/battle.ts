// battle.ts — the battle subflow (§4 row 157): draw cards = foe level from the authored battleDef,
// spend Advantages, fire cleared cards' onResolve, tally strikes as warrior loss, then defeat/escalate
// (the adversary banks Advantages and may retreat). Depends on core, effects, and turn (heroic reward).

import { dir, fault } from './core';
import { applyEffect, winGame, raiseEvent, shuffleInPlace } from './effects';
import { awardHeroic } from './turn';
import type {
  EngineState,
  Directive,
  Input,
  Effect,
  BattleCursor,
  LadderBattleCard,
  LadderDeckCard,
  BattlePromptPayload,
  BattlePromptCard,
  HeroScope,
} from './types';

type HeroScopeEffect = Extract<Effect, { op: 'hero.scope' }>;

type TargetSel = Extract<Input, { requestId: 'target' }>['value'];
type AdvantageSpendDecision = Extract<Input, { requestId: 'advantageSpend' }>['value'];
type BattleCardDecision = Extract<Input, { requestId: 'battleCard' }>['value'];

const isLadderCard = (c: unknown): c is LadderBattleCard =>
  Array.isArray((c as LadderBattleCard).steps);

// ---------- battle subflow (§4 row 157; runs on AUTHORED battleDefs.cards, §389.3) ----------
// startBattle: select foe → draw cards = foe level (2–4; adversary 5) from the authored battleDef.
export function startBattle(state: EngineState, directives: Directive[], sel: TargetSel): void {
  const isAdversary = sel.foeId === state.adversary.foeId || sel.adversary === true;
  const foeId = isAdversary ? state.adversary.foeId : sel.foeId;
  // Cards are drawn from the battleDef keyed by the foe's optional battleDefId, defaulting to the
  // foeId (no fixture sets battleDefId, so this is a no-op for every legacy scenario).
  const defId = (foeId ? (state._lib.foes || {})[foeId]?.battleDefId : undefined) || (foeId as string);
  const def = foeId ? (state._lib.battleDefs || {})[defId] : undefined;
  // a battle with no authored cards would "clear" instantly (0 of 0) — fail loudly instead
  if (!def || !(def.cards || []).length)
    throw fault("foe '" + foeId + "' has no authored battleDef cards");
  // Resolve which specific foe instance is targeted: honor an explicit sel.instanceId (so two
  // same-type foes can be fought independently — deferred item 1), falling back to the first
  // matching foeId for legacy/compact input streams that don't disambiguate. This preserves
  // current behavior exactly when there's at most one foe per type (e.g. golden/goldenFull).
  const targetFoe = isAdversary
    ? null
    : sel.instanceId
      ? state.foes.find((f) => f.instanceId === sel.instanceId && f.foeId === foeId)
      : state.foes.find((f) => f.foeId === foeId);
  if (state._setup && state._setup.fullTurn) {
    // rules.md §Battle: you battle a foe ON YOUR SPACE; the adversary must be reached on the board.
    const hero = state.heroes[state.clock.activeHero];
    if (isAdversary) {
      if (!state.adversary.spawned)
        throw fault('battle: the adversary has not spawned (complete the main goal first)');
      if (state.adversary.location !== hero.location)
        throw fault('battle: the adversary is at ' + state.adversary.location + ', not on your space');
    } else if (!targetFoe || targetFoe.location !== hero.location) {
      throw fault('battle: no ' + foeId + ' on your space (' + (hero.location || 'nowhere') + ')');
    }
  }
  // level = cards drawn (rules): adversary 5; foes by selection tier (tier1→2, tier2→3, tier3→4);
  // the _lib.foes level read remains as the fallback for direct __internals test states.
  const level = isAdversary
    ? 5
    : (foeId ? (state._setup?.foeTiers || {})[foeId] : undefined) ||
      (foeId ? (state._lib.foes || {})[foeId]?.level : undefined) ||
      2;
  // Only carry instanceId forward when the caller explicitly disambiguated: `targetFoe` above also
  // resolves a bare foeId to its first match (for the fullTurn location check), but silently
  // switching foe.remove/foe.escalateStatus to single-instance semantics for callers who never
  // asked for it would change today's remove-all-matching behavior wherever >1 foe of a type
  // exists. Legacy/compact callers keep exactly that behavior; only an explicit sel.instanceId
  // narrows the later verbs to one instance.
  const resolvedInstanceId = sel.instanceId && targetFoe ? targetFoe.instanceId : undefined;
  // Gate on the authored card shape (schema guarantees a battleDef is all-legacy or all-ladder): a
  // ladder deck runs the new interactive flow; the legacy strikes shape stays byte-identical.
  if (isLadderCard(def.cards![0])) {
    startCardBattle(state, directives, {
      foeId: foeId as string,
      defId,
      isAdversary,
      level,
      instanceId: resolvedInstanceId,
    });
    return;
  }
  // draw `level` cards deterministically from the authored card pool (cycle if fewer)
  const pool = def.cards!.slice();
  shuffleInPlace(pool, state);
  const cards = [];
  for (let i = 0; i < level && pool.length; i++) cards.push(pool[i % pool.length]);
  state.clock.battle = {
    foeId: foeId as string,
    instanceId: resolvedInstanceId,
    isAdversary,
    level,
    cards: cards as BattleCursor['cards'],
    resolved: 0,
  };
  dir(directives, 'tower.program', { ops: [{ channel: 'sound', category: 'Battle' }] });
  dir(directives, 'ui.prompt', {
    kind: 'advantageSpend',
    text: 'Spend Advantages (≤10) or retreat',
    cards: cards.length,
  });
}

// resolveBattle: apply spent Advantages (capped 10/action and by the hero pool), fire each cleared
// card's onResolve, tally remaining strikes as warrior loss, then defeat / escalate. The adversary
// banks applied Advantages across battles (cumulative) and allows retreat after ≥1 card.
export function resolveBattle(state: EngineState, directives: Directive[], decision: AdvantageSpendDecision): void {
  const b = state.clock.battle;
  if (!b) throw fault('resolveBattle with no active battle');
  const hero = state.heroes[state.clock.activeHero];
  if (decision.retreat) {
    // retreat after ≥1 card; foe survives, adversary keeps banked Advantages
    state.clock.battle = null;
    dir(directives, 'log.entry', { event: 'retreat', foeId: b.foeId });
    return;
  }
  const spend = Math.min((decision.spend || 0) | 0, 10, hero.advantages | 0); // ≤10/action, no undo
  // Full-turn scenarios deduct the spent Advantages from the hero's pool (rules.md §Battle: spent
  // Advantages are gone). Legacy scenarios keep the frozen no-deduct behavior so `golden` and the
  // __internals verb states stay byte-identical.
  if (state._setup && state._setup.fullTurn && spend > 0) {
    hero.advantages -= spend;
    dir(directives, 'ui.update', {
      delta: { hero: state.clock.activeHero, advantages: hero.advantages },
    });
  }
  let pool = spend + (b.isAdversary ? state.adversary.advantagesBanked || 0 : 0);
  let remainingStrikes = 0,
    cleared = 0;
  for (const card of b.cards) {
    let s = card.strikes || 0;
    if (!card.critical) {
      const use = Math.min(pool, s);
      pool -= use;
      s -= use;
    }
    if (s === 0) {
      cleared++;
      for (const e of card.onResolve || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') break; // a card's onResolve ended the game
      }
    }
    remainingStrikes += s;
    if (state.outcome.status !== 'running') break;
  }
  if (b.isAdversary) state.adversary.advantagesBanked = (state.adversary.advantagesBanked || 0) + spend; // persists
  // if an onResolve effect already decided the game, do not run the strike/defeat tail on top of it
  if (state.outcome.status !== 'running') {
    state.clock.battle = null;
    return;
  }
  if (remainingStrikes > 0)
    applyEffect({ op: 'resource.lose', resource: 'warriors', amount: remainingStrikes }, state, directives);
  if (state.outcome.status !== 'running') {
    // warrior-loss shortfall drove a corruption loss — don't overwrite it with a defeat win
    state.clock.battle = null;
    return;
  }
  const defeated = cleared === b.cards.length;
  dir(directives, 'ui.update', {
    delta: { battle: { foeId: b.foeId, cleared, remainingStrikes, defeated } },
  });
  if (defeated) {
    if (b.isAdversary) {
      state.adversary.defeated = true;
      state.flags.adversaryDefeated = true;
      dir(directives, 'board.mutate', { command: 'removeFoe', args: { adversary: true } });
      raiseEvent(state, directives, 'foeDefeated');
      winGame(state, directives, 'adversary-defeated');
    } else {
      applyEffect({ op: 'foe.remove', foeId: b.foeId, instanceId: b.instanceId }, state, directives);
    }
  } else if (state.outcome.status === 'running') {
    applyEffect({ op: 'foe.escalateStatus', foeId: b.foeId, instanceId: b.instanceId }, state, directives);
  }
  // full turn: the battle heroic action is complete (all cards resolved) → +2 spirit (rules.md §100)
  if (state._setup && state._setup.fullTurn && state.outcome.status === 'running') awardHeroic(state, directives);
  state.clock.battle = null;
}

// ============================================================================
// New-format (card-ladder) battle flow — schema 0.4.2. Runs when a foe's battleDef uses the
// ladder card shape. The legacy resolveBattle above is untouched (byte-identical for strikes decks).
// ============================================================================

const ADV_MAX = 10; // Advantages per heroic action (rules.md §Battle)

// Expand a battleDef's ladder cards into a runtime deck of LadderDeckCard instances (copies applied).
function buildLadderDeck(cards: LadderBattleCard[]): LadderDeckCard[] {
  const deck: LadderDeckCard[] = [];
  cards.forEach((c, defIndex) => {
    const copies = Math.max(1, c.copies || 1);
    for (let copy = 1; copy <= copies; copy++) deck.push({ defIndex, copy, step: 0 });
  });
  return deck;
}

// startCardBattle: build/shuffle the deck, pre-draw `level` cards (the taps are cosmetic reveals of
// this pre-drawn order), set the cursor. Regular foes get a fresh deck each battle; the adversary's
// deck is instantiated once (lazily) and persists — its per-card improvements carry across battles.
export function startCardBattle(
  state: EngineState,
  directives: Directive[],
  args: { foeId: string; defId: string; isAdversary: boolean; level: number; instanceId?: string },
): void {
  const def = (state._lib.battleDefs || {})[args.defId];
  const cards = (def?.cards || []) as LadderBattleCard[];
  let deck: LadderDeckCard[] | undefined;
  if (args.isAdversary) {
    if (!state.adversary.cardDeck) state.adversary.cardDeck = buildLadderDeck(cards);
    shuffleInPlace(state.adversary.cardDeck, state);
    deck = undefined; // lives on state.adversary.cardDeck
  } else {
    deck = buildLadderDeck(cards);
    shuffleInPlace(deck, state);
  }
  const source = args.isAdversary ? state.adversary.cardDeck! : deck!;
  const hand: number[] = [];
  for (let i = 0; i < args.level && source.length; i++) hand.push(i % source.length);
  state.clock.battle = {
    foeId: args.foeId,
    instanceId: args.instanceId,
    isAdversary: args.isAdversary,
    level: args.level,
    cards: [],
    resolved: 0,
    defId: args.defId,
    deck,
    hand,
    revealedCount: 0,
    advantagesSpent: 0,
  };
  dir(directives, 'tower.program', { ops: [{ channel: 'sound', category: 'Battle' }] });
  emitBattlePrompt(state, directives);
}

// The deck a cursor draws from (adversary persistent deck, or the cursor's own fresh deck).
function battleDeck(state: EngineState, b: BattleCursor): LadderDeckCard[] {
  return b.isAdversary ? state.adversary.cardDeck! : b.deck!;
}
function cardDef(state: EngineState, b: BattleCursor, deckCard: LadderDeckCard): LadderBattleCard {
  return ((state._lib.battleDefs || {})[b.defId!]?.cards || [])[deckCard.defIndex] as LadderBattleCard;
}
// The active card = the one currently face-up and unresolved (index === resolved once revealed).
function activeDeckCard(state: EngineState, b: BattleCursor): LadderDeckCard | undefined {
  if ((b.revealedCount || 0) !== (b.resolved || 0) + 1) return undefined;
  return battleDeck(state, b)[b.hand![b.resolved]];
}

// Live per-battle Advantage pool (FAQ: advantages gained mid-battle are spendable this battle). In
// full-turn scenarios each improve deducts 1 from hero.advantages; legacy states cap without deduct.
function canImproveActive(state: EngineState, b: BattleCursor): boolean {
  const dc = activeDeckCard(state, b);
  if (!dc) return false;
  const def = cardDef(state, b, dc);
  if (dc.step >= def.steps.length - 1) return false;
  if ((b.advantagesSpent || 0) >= ADV_MAX) return false;
  const hero = state.heroes[state.clock.activeHero];
  if (state._setup && state._setup.fullTurn) return (hero.advantages | 0) >= 1;
  return (b.advantagesSpent || 0) < (hero.advantages | 0);
}

// Build the presentation payload the player UI renders from (no engine-internal reads on the client).
export function emitBattlePrompt(state: EngineState, directives: Directive[]): void {
  const b = state.clock.battle;
  if (!b || !b.hand) throw fault('emitBattlePrompt with no card battle');
  const deck = battleDeck(state, b);
  const cards: BattlePromptCard[] = b.hand.map((deckIdx, handPos) => {
    const dc = deck[deckIdx];
    const def = cardDef(state, b, dc);
    const revealed = handPos < (b.revealedCount || 0);
    const resolved = handPos < (b.resolved || 0);
    return {
      name: def.name,
      advantage: def.advantage,
      critical: !!def.critical,
      revealed,
      resolved,
      step: dc.step,
      stepCount: def.steps.length,
      text: revealed ? def.steps[dc.step]?.text : undefined,
      nextText: revealed && dc.step < def.steps.length - 1 ? def.steps[dc.step + 1]?.text : undefined,
      // 0.4.3 — presentational front-art passthrough; absent for legacy decks → byte-identical JSON.
      ...(def.artRef ? { artRef: def.artRef } : {}),
    };
  });
  const pending = b.pendingHeroChoice;
  // 0.4.3 — deck-level appearance passthrough (opaque); absent for legacy decks → byte-identical JSON.
  const appearance = (state._lib.battleDefs || {})[b.defId!]?.appearance;
  const payload: BattlePromptPayload = {
    foeId: b.foeId,
    isAdversary: b.isAdversary,
    deckSize: deck.length,
    handSize: b.hand.length,
    cards,
    revealedCount: b.revealedCount || 0,
    resolvedCount: b.resolved || 0,
    advantagesSpent: b.advantagesSpent || 0,
    advantagesMax: ADV_MAX,
    canReveal: !pending && (b.revealedCount || 0) === (b.resolved || 0) && (b.revealedCount || 0) < b.hand.length,
    canImprove: !pending && canImproveActive(state, b),
    canResolve: !pending && (b.revealedCount || 0) === (b.resolved || 0) + 1,
    canRetreat: !pending && b.isAdversary && (b.resolved || 0) >= 1,
    ...(appearance ? { appearance } : {}),
  };
  if (pending) {
    const activeId = state.clock.activeHero;
    const order = state.clock.turnOrder && state.clock.turnOrder.length
      ? state.clock.turnOrder.filter((h) => state.heroes[h])
      : Object.keys(state.heroes);
    payload.heroChoice = {
      text: 'Choose another hero to share the effect',
      candidates: order.filter((h) => h !== activeId).map((heroId) => ({ heroId })),
    };
  }
  dir(directives, 'ui.prompt', {
    kind: 'battleCard',
    requestId: 'battleCard',
    text: 'Reveal, improve, or resolve battle cards',
    battle: payload,
  });
}

type CardOutcome = 'continue' | 'done' | 'terminal';

// Apply the active card's current-step effects starting at resolveIndex. A choice-scope hero.scope
// with >1 candidates pauses the loop (pendingHeroChoice) and awaits a battleHeroTarget pick.
function resolveActiveCard(state: EngineState, directives: Directive[], b: BattleCursor): CardOutcome {
  const dc = battleDeck(state, b)[b.hand![b.resolved]];
  const def = cardDef(state, b, dc);
  const effects = def.steps[dc.step]?.effects || [];
  if (!b.cardCorrupted) b.cardCorrupted = [];
  for (let i = b.resolveIndex || 0; i < effects.length; i++) {
    const eff = effects[i];
    if (
      eff.op === 'hero.scope' &&
      (eff.scope === 'other' || eff.scope === 'selfAndOther') &&
      heroChoiceNeeded(state, eff.scope)
    ) {
      b.resolveIndex = i;
      b.pendingHeroChoice = { effectIndex: i, scope: eff.scope };
      emitBattlePrompt(state, directives);
      return 'continue';
    }
    applyEffect(eff, state, directives, { corruptionLatch: b.cardCorrupted });
    if (state.outcome.status !== 'running') return 'terminal';
  }
  return finishActiveCard(state, directives, b);
}

// A choice scope needs a pick only when >1 other heroes exist (0 skips, 1 auto-resolves — solo play
// degrades gracefully).
function heroChoiceNeeded(state: EngineState, _scope: HeroScope): boolean {
  const activeId = state.clock.activeHero;
  const order = state.clock.turnOrder && state.clock.turnOrder.length
    ? state.clock.turnOrder.filter((h) => state.heroes[h])
    : Object.keys(state.heroes);
  return order.filter((h) => h !== activeId).length > 1;
}

// Advance past the resolved card; if the whole hand is resolved, run the defeat tail.
function finishActiveCard(state: EngineState, directives: Directive[], b: BattleCursor): CardOutcome {
  b.resolveIndex = undefined;
  b.cardCorrupted = undefined;
  b.resolved = (b.resolved || 0) + 1;
  if (b.resolved < b.hand!.length) {
    emitBattlePrompt(state, directives);
    return 'continue';
  }
  return defeatFoe(state, directives, b);
}

// Defeat tail — mirrors resolveBattle's defeat branch (foe.remove w/ instanceId threading; adversary
// win path; full-turn +2 spirit). Duplicated deliberately so the frozen resolveBattle stays intact.
function defeatFoe(state: EngineState, directives: Directive[], b: BattleCursor): CardOutcome {
  dir(directives, 'ui.update', {
    delta: { battle: { foeId: b.foeId, cleared: b.resolved, remainingStrikes: 0, defeated: true } },
  });
  if (b.isAdversary) {
    state.adversary.defeated = true;
    state.flags.adversaryDefeated = true;
    dir(directives, 'board.mutate', { command: 'removeFoe', args: { adversary: true } });
    raiseEvent(state, directives, 'foeDefeated');
    winGame(state, directives, 'adversary-defeated');
  } else {
    applyEffect({ op: 'foe.remove', foeId: b.foeId, instanceId: b.instanceId }, state, directives);
  }
  if (state._setup && state._setup.fullTurn && state.outcome.status === 'running')
    awardHeroic(state, directives);
  state.clock.battle = null;
  return state.outcome.status === 'running' ? 'done' : 'terminal';
}

// battleCardInput: one interactive step (reveal / improve / resolve / retreat). Exactly one verb;
// ineligible verbs fault (fail-loudly, matching the closed-vocabulary ethos).
export function battleCardInput(
  state: EngineState,
  directives: Directive[],
  value: BattleCardDecision,
): CardOutcome {
  const b = state.clock.battle;
  if (!b || !b.hand) throw fault('battleCardInput with no card battle');
  if (b.pendingHeroChoice) throw fault('battle: awaiting a hero choice, not a card action');
  const verbs = [value.reveal, value.improve, value.resolve, value.retreat].filter(Boolean).length;
  if (verbs !== 1) throw fault('battleCard input needs exactly one of reveal/improve/resolve/retreat');

  if (value.retreat) {
    if (!(b.isAdversary && (b.resolved || 0) >= 1))
      throw fault('battle: retreat is only allowed from the adversary after resolving ≥1 card');
    dir(directives, 'log.entry', { event: 'retreat', foeId: b.foeId });
    state.clock.battle = null; // improvements persist on state.adversary.cardDeck
    return 'done';
  }

  if (value.reveal) {
    if (!((b.revealedCount || 0) === (b.resolved || 0) && (b.revealedCount || 0) < b.hand.length))
      throw fault('battle: nothing to reveal (resolve the face-up card first)');
    b.revealedCount = (b.revealedCount || 0) + 1;
    const dc = battleDeck(state, b)[b.hand[b.resolved]];
    dir(directives, 'log.entry', {
      event: 'battleCardRevealed',
      foeId: b.foeId,
      card: cardDef(state, b, dc).name,
      step: dc.step,
    });
    emitBattlePrompt(state, directives);
    return 'continue';
  }

  if (value.improve) {
    if (!canImproveActive(state, b)) throw fault('battle: cannot improve (top step, cap, or empty pool)');
    const dc = activeDeckCard(state, b)!;
    b.advantagesSpent = (b.advantagesSpent || 0) + 1;
    dc.step += 1;
    if (state._setup && state._setup.fullTurn) {
      const hero = state.heroes[state.clock.activeHero];
      hero.advantages -= 1;
      dir(directives, 'ui.update', {
        delta: { hero: state.clock.activeHero, advantages: hero.advantages },
      });
    }
    emitBattlePrompt(state, directives);
    return 'continue';
  }

  // resolve
  if (!((b.revealedCount || 0) === (b.resolved || 0) + 1))
    throw fault('battle: reveal a card before resolving it');
  return resolveActiveCard(state, directives, b);
}

// battleHeroChoiceInput: the player picked a hero for a paused choice-scope hero.scope effect. Apply
// it (self first for selfAndOther), then continue the resolve loop.
export function battleHeroChoiceInput(
  state: EngineState,
  directives: Directive[],
  value: { heroId: string },
): CardOutcome {
  const b = state.clock.battle;
  if (!b || !b.hand || !b.pendingHeroChoice) throw fault('battleHeroTarget with no pending hero choice');
  const activeId = state.clock.activeHero;
  if (value.heroId === activeId || !state.heroes[value.heroId])
    throw fault('battle: invalid hero choice ' + value.heroId);
  const { scope } = b.pendingHeroChoice;
  const dc = battleDeck(state, b)[b.hand[b.resolved]];
  const def = cardDef(state, b, dc);
  const eff = def.steps[dc.step].effects![b.pendingHeroChoice.effectIndex] as HeroScopeEffect;
  if (!b.cardCorrupted) b.cardCorrupted = [];
  const ctx = { corruptionLatch: b.cardCorrupted };
  const applyFor = (hero: string): boolean => {
    const saved = state.clock.activeHero;
    state.clock.activeHero = hero;
    try {
      for (const inner of eff.effects) {
        applyEffect(inner, state, directives, ctx);
        if (state.outcome.status !== 'running') return false;
      }
    } finally {
      state.clock.activeHero = saved;
    }
    return true;
  };
  // selfAndOther applies to the active hero first, then the chosen hero; other applies to the chosen.
  if (scope === 'selfAndOther' && !applyFor(activeId)) return 'terminal';
  if (!applyFor(value.heroId)) return 'terminal';
  b.pendingHeroChoice = undefined;
  b.resolveIndex = (b.resolveIndex || 0) + 1;
  return resolveActiveCard(state, directives, b);
}
