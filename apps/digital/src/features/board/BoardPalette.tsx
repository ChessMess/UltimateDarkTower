/**
 * Placement palette (PRD-02 FR-02.3–FR-02.8). The official app says *what* goes *where*; the
 * player mirrors it here. Pick a token kind + its details, then either choose a target from the
 * grouped location list and press Place, or arm "click a space" and tap the 2D/3D board.
 *
 * All mutations route through the board source via the store — never the controller directly.
 */
import { useEffect, useRef, useState } from 'react';
import { ADVERSARY_ROSTER, FOE_STATUSES } from '@/lib/udtData';
import type { FoeStatus, TokenSelection } from 'ultimatedarktowerboard';
import { adversaryOf, foesOf, heroesOf } from 'ultimatedarktowerboard';
import { useBoardActions, useBoardLocationPick, useBoardState, useSession } from '@/lib/hooks';
import {
  BUILDING_LOCATIONS,
  FOE_LEVELS,
  LOCATIONS,
  MARKER_PRESETS,
  adversaryName,
  foeName,
  heroName,
} from './boardData';
import { LocationSelect } from './LocationSelect';

type PlaceKind = 'foe' | 'hero' | 'adversary' | 'skull' | 'marker';

/** Map a palette kind to the renderer's selection kind + which spaces are valid targets. */
const ARM_KIND: Record<PlaceKind, { kind: TokenSelection['kind']; targets: 'all' | 'buildings' }> =
  {
    foe: { kind: 'foe', targets: 'all' },
    hero: { kind: 'hero', targets: 'all' },
    adversary: { kind: 'adversary', targets: 'all' },
    skull: { kind: 'building', targets: 'buildings' },
    marker: { kind: 'marker', targets: 'all' },
  };

let foeSeq = 0;

export function BoardPalette() {
  const boardState = useBoardState();
  const session = useSession();
  const locationPick = useBoardLocationPick();
  const { placeFoe, placeHero, setAdversary, addSkull, setSpaceMarker } = useBoardActions();

  const heroes = session.config.heroes;

  const [kind, setKind] = useState<PlaceKind>('foe');
  const [foeType, setFoeType] = useState(FOE_LEVELS[0]?.foes[0]?.id ?? '');
  const [foeStatus, setFoeStatus] = useState<FoeStatus>('ready');
  const [heroId, setHeroId] = useState(heroes[0]?.heroId ?? '');
  const [advId, setAdvId] = useState(session.config.adversary ?? ADVERSARY_ROSTER[0]?.id ?? '');
  const [marker, setMarker] = useState<string>(MARKER_PRESETS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]?.name ?? '');
  const [armed, setArmed] = useState(false);

  // Derive (rather than store-via-effect) the effective hero + target, so the controls stay
  // valid as the game/kind changes: fall back to a real hero, and to a building when placing skulls.
  const effectiveHeroId = heroes.some((h) => h.heroId === heroId)
    ? heroId
    : (heroes[0]?.heroId ?? '');
  const isBuilding = (name: string) => BUILDING_LOCATIONS.some((b) => b.name === name);
  const placeLocation =
    kind === 'skull' && !isBuilding(location) ? (BUILDING_LOCATIONS[0]?.name ?? '') : location;

  const ready = Boolean(boardState);
  const canPlace =
    kind === 'hero' ? Boolean(effectiveHeroId) : kind === 'foe' ? Boolean(foeType) : true;

  /** Perform the current placement at `loc` (used by both the dropdown and click-to-place). */
  const placeAt = (loc: string) => {
    if (!loc) return;
    switch (kind) {
      case 'foe':
        if (foeType) placeFoe(`${foeType}-${++foeSeq}`, foeType, loc, foeStatus);
        break;
      case 'hero':
        if (effectiveHeroId) placeHero(effectiveHeroId, loc);
        break;
      case 'adversary':
        if (advId) setAdversary(advId, loc);
        break;
      case 'skull':
        addSkull(loc, 1);
        break;
      case 'marker':
        setSpaceMarker(loc, marker, true);
        break;
    }
  };

  // The arm subscription is registered once per stage; a ref (updated in an effect, not during
  // render) lets its callback use the latest selections without re-subscribing each render.
  const placeAtRef = useRef(placeAt);
  useEffect(() => {
    placeAtRef.current = placeAt;
  });
  useEffect(() => {
    if (!locationPick) return;
    return locationPick.subscribe((event) => {
      if (event.type === 'picked') {
        placeAtRef.current(event.location);
        locationPick.disarm();
        setArmed(false);
      } else if (event.type === 'disarmed') {
        setArmed(false);
      }
    });
  }, [locationPick]);

  const armLabel = () => {
    switch (kind) {
      case 'foe':
        return `${foeName(foeType)} (foe)`;
      case 'hero':
        return `${heroName(effectiveHeroId)} (hero)`;
      case 'adversary':
        return `${adversaryName(advId)} (adversary)`;
      case 'skull':
        return 'skull (building)';
      case 'marker':
        return `${marker} (marker)`;
    }
  };

  const armOnBoard = () => {
    if (!locationPick) return;
    locationPick.arm({
      kind: ARM_KIND[kind].kind,
      label: armLabel(),
      targets: ARM_KIND[kind].targets,
    });
    setArmed(true);
  };
  const cancelArm = () => {
    locationPick?.disarm();
    setArmed(false);
  };

  const buildingsOnly = kind === 'skull';

  return (
    <section className="panel">
      <h2>Board</h2>
      {!ready && <p className="muted">Loading board…</p>}

      <h3>Place on board</h3>
      <label>
        What
        <select value={kind} onChange={(e) => setKind(e.target.value as PlaceKind)}>
          <option value="foe">Foe (L2–4)</option>
          <option value="hero">Hero</option>
          <option value="adversary">Adversary (L5)</option>
          <option value="skull">Skull (on building)</option>
          <option value="marker">Space marker</option>
        </select>
      </label>

      {kind === 'foe' && (
        <>
          <label>
            Foe
            <select value={foeType} onChange={(e) => setFoeType(e.target.value)}>
              {FOE_LEVELS.map((group) => (
                <optgroup key={group.level} label={`Level ${group.level}`}>
                  {group.foes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={foeStatus} onChange={(e) => setFoeStatus(e.target.value as FoeStatus)}>
              {FOE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {kind === 'hero' &&
        (heroes.length ? (
          <label>
            Hero
            <select value={effectiveHeroId} onChange={(e) => setHeroId(e.target.value)}>
              {heroes.map((h) => (
                <option key={h.heroId} value={h.heroId}>
                  {heroName(h.heroId)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted">No heroes in play — start a game with “New”.</p>
        ))}

      {kind === 'adversary' && (
        <label>
          Adversary
          <select value={advId} onChange={(e) => setAdvId(e.target.value)}>
            {ADVERSARY_ROSTER.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === 'marker' && (
        <label>
          Marker
          <select value={marker} onChange={(e) => setMarker(e.target.value)}>
            {MARKER_PRESETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Location
        <LocationSelect
          value={placeLocation}
          onChange={setLocation}
          buildingsOnly={buildingsOnly}
        />
      </label>

      <div className="board-place-actions">
        <button disabled={!ready || !canPlace} onClick={() => placeAt(placeLocation)}>
          Place
        </button>
        {armed ? (
          <button className="board-arm-cancel" onClick={cancelArm}>
            Cancel — tap a space…
          </button>
        ) : (
          <button disabled={!ready || !canPlace || !locationPick} onClick={armOnBoard}>
            Pick on board
          </button>
        )}
      </div>

      {boardState && (
        <p className="muted board-counts">
          {foesOf(boardState).length} foes · {heroesOf(boardState).length} heroes
          {adversaryOf(boardState)?.location ? ' · adversary placed' : ''}
        </p>
      )}
    </section>
  );
}
