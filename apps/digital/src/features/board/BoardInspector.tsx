/**
 * Token inspector (PRD-02 FR-02.9). Reflects whatever token is selected on the board (clicked
 * in 2D or 3D, via the stage's selection store) and offers the actions for that kind: foes get
 * status / move / remove, heroes move / remove, the adversary moves / clears, buildings add or
 * remove skulls (destroyed badge included), and markers can be removed. UTDD enforces nothing.
 */
import { useState } from 'react';
import { FOE_STATUSES } from '@/lib/udtData';
import type { BoardState, FoeStatus, TokenSelection } from 'ultimatedarktowerboard';
import { useBoardActions, useBoardSelection, useBoardState } from '@/lib/hooks';
import { SKULLS_TO_DESTROY } from '@/sources/ManualBoardSource';
import { adversaryName, foeName, heroName } from './boardData';
import { LocationSelect } from './LocationSelect';

type BoardActions = ReturnType<typeof useBoardActions>;

export function BoardInspector() {
  const selection = useBoardSelection();
  const boardState = useBoardState();
  const actions = useBoardActions();

  return (
    <section className="panel">
      <h2>Selected token</h2>
      {!selection || !boardState ? (
        <p className="muted">Click a token or building on the board to inspect it.</p>
      ) : (
        <TokenDetail
          key={`${selection.kind}:${selection.id}:${selection.location}`}
          selection={selection}
          boardState={boardState}
          actions={actions}
        />
      )}
    </section>
  );
}

function MoveRow({ from, onMove }: { from: string; onMove: (to: string) => void }) {
  const [to, setTo] = useState(from);
  return (
    <div className="board-move">
      <LocationSelect value={to} onChange={setTo} />
      <button disabled={to === from} onClick={() => onMove(to)}>
        Move
      </button>
    </div>
  );
}

function StatusRow({
  status,
  onChange,
}: {
  status: FoeStatus;
  onChange: (status: FoeStatus) => void;
}) {
  return (
    <label>
      Status
      <select value={status} onChange={(e) => onChange(e.target.value as FoeStatus)}>
        {FOE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

function TokenDetail({
  selection,
  boardState,
  actions,
}: {
  selection: TokenSelection;
  boardState: BoardState;
  actions: BoardActions;
}) {
  const { kind, id, location } = selection;

  if (kind === 'foe') {
    const foe = boardState.foes[id];
    if (!foe) return <Gone />;
    return (
      <>
        <h3 className="board-detail-title">
          {foeName(foe.foe)} <span className="muted">· foe</span>
        </h3>
        <ul className="rows">
          <li>
            <span>Location</span>
            <span>{foe.location}</span>
          </li>
        </ul>
        <StatusRow status={foe.status} onChange={(s) => actions.setFoeStatus(id, s)} />
        <MoveRow from={foe.location} onMove={(to) => actions.moveToken(id, to)} />
        <button className="board-remove" onClick={() => actions.removeFoe(id)}>
          Remove foe
        </button>
      </>
    );
  }

  if (kind === 'hero') {
    const hero = boardState.heroes[id];
    if (!hero) return <Gone />;
    return (
      <>
        <h3 className="board-detail-title">
          {heroName(id)} <span className="muted">· hero</span>
        </h3>
        <ul className="rows">
          <li>
            <span>Location</span>
            <span>{hero.location}</span>
          </li>
          {hero.owner && (
            <li>
              <span>Kingdom</span>
              <span>{hero.owner}</span>
            </li>
          )}
        </ul>
        <MoveRow from={hero.location} onMove={(to) => actions.moveToken(id, to)} />
        <button className="board-remove" onClick={() => actions.removeHero(id)}>
          Remove hero
        </button>
      </>
    );
  }

  if (kind === 'adversary') {
    const adv = boardState.adversary;
    if (!adv) return <Gone />;
    return (
      <>
        <h3 className="board-detail-title">
          {adversaryName(adv.id)} <span className="muted">· adversary</span>
        </h3>
        <ul className="rows">
          <li>
            <span>Location</span>
            <span>{adv.location ?? '—'}</span>
          </li>
        </ul>
        <MoveRow from={adv.location ?? ''} onMove={(to) => actions.moveToken(adv.id, to)} />
        <button className="board-remove" onClick={() => actions.clearAdversary()}>
          Clear adversary
        </button>
      </>
    );
  }

  // 'building' or 'marker' — both host on a location.
  const building = boardState.buildings[location];
  const markers = boardState.spaceMarkers[location] ?? [];
  return (
    <>
      <h3 className="board-detail-title">
        {location} <span className="muted">· space</span>
      </h3>
      {building && (
        <>
          <ul className="rows">
            <li>
              <span>Skulls</span>
              <span>
                {building.skulls} / {SKULLS_TO_DESTROY}
              </span>
            </li>
            <li>
              <span>Building</span>
              <span className={building.destroyed ? 'board-destroyed' : ''}>
                {building.destroyed ? 'destroyed' : 'standing'}
              </span>
            </li>
          </ul>
          <div className="board-detail-actions">
            <button onClick={() => actions.addSkull(location, 1)}>+ skull</button>
            <button
              disabled={building.skulls <= 0}
              onClick={() => actions.removeSkull(location, 1)}
            >
              − skull
            </button>
          </div>
        </>
      )}
      {markers.length > 0 && (
        <>
          <h3>Markers</h3>
          <ul className="pb-chips">
            {markers.map((m) => (
              <li className="pb-chip" key={m}>
                <span>{m}</span>
                <button
                  onClick={() => actions.setSpaceMarker(location, m, false)}
                  aria-label={`Remove ${m}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {!building && markers.length === 0 && <p className="muted">Nothing here.</p>}
    </>
  );
}

function Gone() {
  return <p className="muted">That token is no longer on the board.</p>;
}
