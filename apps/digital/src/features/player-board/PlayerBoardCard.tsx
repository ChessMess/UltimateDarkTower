/**
 * The full per-hero tracker (PRD-03 FR-03.2–FR-03.6). A player-owned tracker: it stores
 * and displays values but enforces no rules. Pools are steppers; treasures (≤4) and gear
 * (≤6) and the open-ended quest items / companions are picked from the base-game card
 * lists (`itemOptions.ts`); virtues are toggle tiles. Card *names* come from the box
 * inventory; the rules text on the cards is © Restoration Games and stays unbundled
 * (FR-03.6 / IP caveat), so virtue tiles remain generic.
 */
import { useState } from 'react';
import { HERO_BY_ID } from '@/lib/udtData';
import {
  CORRUPTION_LOSS,
  CORRUPTION_MAX,
  LIST_CAPS,
  isCorruptionLoss,
  withListAdded,
  withListRemoved,
  withResource,
  withVirtueToggled,
  type ListKey,
  type PlayerBoard,
  type ResourceKey,
} from '@/session';
import { ITEM_OPTIONS, type ItemOption } from './itemOptions';

type Update = (fn: (pb: PlayerBoard) => PlayerBoard) => void;

function Stepper({
  label,
  value,
  onDelta,
  max,
  suffix,
  danger,
  warn,
}: {
  label: string;
  value: number;
  onDelta: (delta: number) => void;
  max?: number;
  suffix?: string;
  danger?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`pb-stat${danger ? ' pb-stat-danger' : warn ? ' pb-stat-warn' : ''}`}>
      <span className="pb-stat-label">{label}</span>
      <div className="pb-stepper">
        <button onClick={() => onDelta(-1)} disabled={value <= 0} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="pb-stat-value">
          {value}
          {suffix ? <span className="muted">{suffix}</span> : null}
        </span>
        <button
          onClick={() => onDelta(1)}
          disabled={max !== undefined && value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ListSection({
  label,
  items,
  cap,
  placeholder,
  options,
  allowDuplicates,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  cap?: number;
  placeholder: string;
  options: ItemOption[];
  /** Only for lists whose box has multiple copies of a card (quest items). */
  allowDuplicates?: boolean;
  onAdd: (label: string) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState('');
  const full = cap !== undefined && items.length >= cap;
  // A card already on the board drops out of the picker — that's the gear rule ("one of
  // each of the 6 types") and the uniqueness of count-1 treasure/companion cards.
  const available = allowDuplicates ? options : options.filter((o) => !items.includes(o.value));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(draft);
    setDraft('');
  };
  return (
    <div className="pb-list">
      <div className="pb-list-head">
        <h4>{label}</h4>
        {cap !== undefined && (
          <span className="muted">
            {items.length}/{cap}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <ul className="pb-chips">
          {items.map((it, i) => (
            <li className="pb-chip" key={`${it}-${i}`}>
              <span>{it}</span>
              <button onClick={() => onRemove(i)} aria-label={`Remove ${it}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="muted pb-list-full">At capacity.</p>
      ) : available.length === 0 ? (
        <p className="muted pb-list-full">All added.</p>
      ) : (
        <form className="pb-add" onSubmit={submit}>
          {/* Bare select, not wrapped in a <label>: .pb-add is a flex row of
              [field, button] and a wrapper would become the flex item. */}
          <select value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={placeholder}>
            <option value="">{placeholder}</option>
            {available.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!draft}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}

export function PlayerBoardCard({ pb, update }: { pb: PlayerBoard; update: Update }) {
  const heroName = HERO_BY_ID[pb.heroId]?.name ?? pb.heroId;
  const resource = (key: ResourceKey) => (delta: number) =>
    update((b) => withResource(b, key, delta));
  const listAdd = (key: ListKey) => (label: string) => update((b) => withListAdded(b, key, label));
  const listRemove = (key: ListKey) => (index: number) =>
    update((b) => withListRemoved(b, key, index));

  return (
    <div className="pb-card">
      <header className="pb-card-head">
        <h3>{heroName}</h3>
        <span className="muted">{pb.homeKingdom}</span>
      </header>

      <div className="pb-stats">
        <Stepper label="Warriors" value={pb.warriors} onDelta={resource('warriors')} />
        <Stepper label="Spirit" value={pb.spirit} onDelta={resource('spirit')} />
        <Stepper label="Potions" value={pb.potions} onDelta={resource('potions')} />
        <Stepper
          label="Corruption"
          value={pb.corruption}
          onDelta={resource('corruption')}
          max={CORRUPTION_LOSS}
          suffix={` / ${CORRUPTION_MAX}`}
          danger={isCorruptionLoss(pb)}
          warn={pb.corruption === CORRUPTION_MAX}
        />
      </div>

      {isCorruptionLoss(pb) ? (
        <p className="pb-banner pb-banner-danger">
          {CORRUPTION_LOSS}rd corruption — this is a game loss (per the rules).
        </p>
      ) : pb.corruption === CORRUPTION_MAX ? (
        <p className="pb-banner pb-banner-warn">
          At {CORRUPTION_MAX} corruption — a 3rd ends the game.
        </p>
      ) : null}

      <div className="pb-section">
        <h4>Virtues</h4>
        <div className="pb-virtues">
          {pb.virtues.hero.map((tile, i) => (
            <button
              key={tile.id}
              className={`pb-virtue${tile.active ? ' is-active' : ''}`}
              onClick={() => update((b) => withVirtueToggled(b, i))}
              aria-pressed={tile.active}
            >
              <span>Virtue {i + 1}</span>
              <small>{tile.active ? 'active' : 'inactive'}</small>
            </button>
          ))}
          <button
            className={`pb-virtue pb-virtue-kingdom${pb.virtues.kingdom.active ? ' is-active' : ''}`}
            onClick={() => update((b) => withVirtueToggled(b, 'kingdom'))}
            aria-pressed={pb.virtues.kingdom.active}
          >
            <span>Kingdom</span>
            <small>{pb.virtues.kingdom.active ? 'active' : 'inactive'}</small>
          </button>
        </div>
      </div>

      <ListSection
        label="Gear"
        items={pb.gear}
        cap={LIST_CAPS.gear}
        placeholder="Choose gear…"
        options={ITEM_OPTIONS.gear}
        onAdd={listAdd('gear')}
        onRemove={listRemove('gear')}
      />
      <ListSection
        label="Treasures"
        items={pb.treasures}
        cap={LIST_CAPS.treasures}
        placeholder="Choose a treasure…"
        options={ITEM_OPTIONS.treasures}
        onAdd={listAdd('treasures')}
        onRemove={listRemove('treasures')}
      />
      <ListSection
        label="Quest items"
        items={pb.questItems}
        placeholder="Choose a quest item…"
        options={ITEM_OPTIONS.questItems}
        // The box has 4 Amulets Of Hope, so a second copy is legitimate.
        allowDuplicates
        onAdd={listAdd('questItems')}
        onRemove={listRemove('questItems')}
      />
      <ListSection
        label="Companions"
        items={pb.companions}
        placeholder="Choose a companion…"
        options={ITEM_OPTIONS.companions}
        onAdd={listAdd('companions')}
        onRemove={listRemove('companions')}
      />

      <p className="muted pb-ipnote">
        Card names come from the box inventory; card &amp; virtue <em>text</em> isn&apos;t bundled
        (© Restoration Games).
      </p>
    </div>
  );
}
