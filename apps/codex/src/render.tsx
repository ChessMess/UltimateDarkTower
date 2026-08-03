/**
 * The generic record renderer. One <Fields> walks Object.entries() and handles every shape
 * `ultimatedarktowerdata` exports — strings, string arrays, numbers, and one level of nested
 * object (FOE_CARDS.acts, TREASURES.advantage, BOARD_LOCATIONS.dungeon, hero virtue lists).
 * That is why the registry carries no per-dataset render config.
 */
import type { Dataset, Link, Row } from './datasets';
import { DATASET_BY_ID } from './datasets';
import { href, titleOf } from './search';

/** Fields that are chrome, not content — already shown as the title or the card's header band. */
const SUPPRESSED = new Set(['name', 'id', 'key', 'needsReview', 'sourceNote']);

const LABELS: Record<string, string> = {
  whenBattling: 'When battling',
  cardText: 'Card text',
  eventText: 'Event text',
  eventTextAlternate: 'Event text (alternate)',
  dungeonType: 'Dungeon',
  startLocation: 'Starts at',
  bannerAction: 'Banner action',
  defaultVirtues: 'Starting virtues',
  unlockableVirtues: 'Unlockable virtues',
  reinforce1: 'Reinforce',
  reinforce2: 'Reinforce (alt)',
};

/** `dungeonType` -> "Dungeon"; otherwise camelCase -> "Camel case". */
function label(field: string): string {
  if (LABELS[field]) return LABELS[field];
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** One value, rendered by shape. */
function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    // An array of objects (hero virtues) reads as a definition list; strings read as a list.
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      return (
        <ul className="v-list">
          {(value as Row[]).map((o, i) => (
            <li key={i}>
              {Object.values(o)
                .filter((x) => !isEmpty(x))
                .map((x, j) => (
                  <span key={j} className={j === 0 ? 'v-strong' : undefined}>
                    {String(x)}
                    {j === 0 ? ' — ' : ''}
                  </span>
                ))}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="v-tags">
        {(value as unknown[]).map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );
  }

  if (value !== null && typeof value === 'object') {
    return (
      <dl className="v-sub">
        {Object.entries(value as Row)
          .filter(([, v]) => !isEmpty(v))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{label(k)}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
      </dl>
    );
  }

  return <p className="v-text">{String(value)}</p>;
}

export function Fields({ record, limit }: { record: Row; limit?: number }) {
  const entries = Object.entries(record).filter(([k, v]) => !SUPPRESSED.has(k) && !isEmpty(v));
  const shown = limit ? entries.slice(0, limit) : entries;
  if (shown.length === 0) return null;
  return (
    <dl className="fields">
      {shown.map(([k, v]) => (
        <div className="field" key={k}>
          <dt>{label(k)}</dt>
          <dd>
            <Value value={v} />
          </dd>
        </div>
      ))}
      {limit && entries.length > shown.length ? (
        <div className="field more">
          <dt />
          <dd>+{entries.length - shown.length} more</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Badges. `needsReview` renders as a rubber stamp because that is what it means: a row the source
 * author could not fully observe. Six rows in the package carry it, and they should be unmissable.
 */
export function Badges({ dataset, record }: { dataset: Dataset; record: Row }) {
  const flags = dataset.flags?.(record) ?? [];
  if (!record.needsReview && flags.length === 0) return null;
  return (
    <span className="badges">
      {record.needsReview ? (
        <span className="stamp" title={String(record.sourceNote ?? '')}>
          needs review
        </span>
      ) : null}
      {flags.map((f) => (
        <span className="flag" key={f}>
          {f}
        </span>
      ))}
    </span>
  );
}

export function Related({ links }: { links: Link[] }) {
  if (links.length === 0) return null;
  return (
    <div className="related">
      <span className="related-label">See also</span>
      <ul>
        {links.map((l, i) => (
          <li key={i}>
            <a href={href(l)}>
              {l.label}
              <span className="related-in">{DATASET_BY_ID.get(l.dataset)?.name ?? l.dataset}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A catalog card: ruled header band, title, then the record's fields. */
export function RecordCard({
  dataset,
  record,
  index,
}: {
  dataset: Dataset;
  record: Row;
  index: number;
}) {
  return (
    <a
      className="card reveal"
      style={{ '--i': index } as React.CSSProperties}
      href={`#/${dataset.id}/${encodeURIComponent(dataset.key(record))}`}
    >
      <span className="card-band">
        <span className="card-band-set">{dataset.name}</span>
        <span className="card-band-id">{dataset.key(record)}</span>
      </span>
      <h3>
        {titleOf(dataset, record)}
        <Badges dataset={dataset} record={record} />
      </h3>
      <Fields record={record} limit={5} />
    </a>
  );
}

export function Detail({ dataset, record }: { dataset: Dataset; record: Row }) {
  const links = dataset.related?.(record) ?? [];
  return (
    <article className="detail">
      <nav className="crumbs">
        <a href="#/">Codex</a>
        <span aria-hidden="true">/</span>
        <a href={`#/${dataset.id}`}>{dataset.name}</a>
      </nav>

      <h2 className="detail-title">
        {titleOf(dataset, record)}
        <Badges dataset={dataset} record={record} />
      </h2>
      <p className="detail-id">{dataset.key(record)}</p>

      {record.sourceNote ? (
        <aside className="source-note">
          <strong>Not fully observed.</strong> {String(record.sourceNote)}
        </aside>
      ) : null}

      <Fields record={record} />
      <Related links={links} />

      <details className="raw">
        <summary>Raw record</summary>
        <pre>{JSON.stringify(record, null, 2)}</pre>
      </details>
    </article>
  );
}
