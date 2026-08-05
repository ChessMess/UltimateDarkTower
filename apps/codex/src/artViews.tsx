/**
 * The Art section's views — the media counterpart to `render.tsx`/`views.tsx`.
 *
 * These live apart from the dataset renderers because art is not a `Row`: it renders as an image,
 * an audio player or a download card, keyed off `Asset.kind` rather than off the runtime shape of
 * a value. Everything else — the shell, the sidebar, the breadcrumbs, the field list — is codex's
 * own, reused rather than re-implemented.
 *
 * Named `artViews.tsx`, not `art.tsx`: a `.ts` and a `.tsx` of the same basename in one directory
 * makes `./art` ambiguous, and the explicit-extension import needed to disambiguate would require
 * `allowImportingTsExtensions`.
 */
import { useEffect, useRef, useState } from 'react';
import { ART_GROUPS, ART_GROUP_BY_ID, ART_SECTION_ORDER, type Asset, type ArtGroup } from './art';

const REPO = 'https://github.com/ChessMess/UltimateDarkTower';

// ── formatting ─────────────────────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** `4.73` → `0:05`. Rounded, not truncated — a 4.73 s clip reading `0:04` is the wrong one. */
function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Byte size via a HEAD request, on detail-open only.
 *
 * Deliberately not a build-time manifest: a manifest is one more thing to regenerate and drift,
 * and HEAD downloads no body — so even the 22 MB board costs nothing to measure. `content-length`
 * is absent on some dev-server responses; the pane just omits the row when it is.
 *
 * The URL is stored *with* the size rather than cleared by a second effect on change: a stale size
 * is filtered out during render, so switching assets never briefly shows the previous file's bytes
 * and there is no cascading setState.
 */
function useByteSize(url: string): number | null {
  const [seen, setSeen] = useState<{ url: string; size: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        const len = r.headers.get('content-length');
        if (live && len) setSeen({ url, size: Number(len) });
      })
      .catch(() => {
        /* a missing size is not worth an error state */
      });
    return () => {
      live = false;
    };
  }, [url]);
  return seen?.url === url ? seen.size : null;
}

// ── tiles ──────────────────────────────────────────────────────────────────────────────────────

const artHref = (groupId: string, assetId: string) =>
  `#/art/${groupId}/${encodeURIComponent(assetId)}`;

/**
 * The clip currently playing anywhere in the grid.
 *
 * Every tile owns its own <audio>, so without this, pressing a second play button would leave the
 * first one running. Module-level rather than React state because nothing renders from it — the
 * tile that gets paused learns about it from its own `onPause`.
 */
let playingNow: HTMLAudioElement | null = null;

/**
 * Playback lives on the thumbnail, not in a control strip under the card.
 *
 * `preload="none"` is what makes a 25-clip grid viable — the browser fetches nothing until the
 * button is pressed. The <audio> stays in the DOM rather than becoming a `new Audio()` in a ref so
 * that React owns the play/pause/ended wiring; with no `controls` attribute the UA stylesheet
 * already hides it, and the download link inside it is the no-JS fallback.
 */
function PlayButton({ asset }: { asset: Asset }) {
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = el.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (playingNow && playingNow !== audio) playingNow.pause();
    playingNow = audio;
    // A rejected play() is a missing or undecodable file, not a state to render — but it must be
    // caught, or it surfaces as an unhandled rejection.
    void audio.play().catch(() => setPlaying(false));
  };

  return (
    <>
      <button
        type="button"
        className="art-play"
        aria-label={`${playing ? 'Pause' : 'Play'} ${asset.name}`}
        onClick={toggle}
      >
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
      </button>
      <audio
        ref={el}
        src={asset.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        <a href={asset.url}>Download {asset.name}</a>
      </audio>
    </>
  );
}

export function ArtTile({ asset, href }: { asset: Asset; href: string }) {
  const src = asset.heavy ? asset.preview : asset.url;
  const isImage = asset.kind === 'image' && src;
  return (
    <li className="art-tile">
      {/*
        The thumbnail sits OUTSIDE the anchor: the play button is an interactive element, and
        nesting one inside a link is invalid and unusable by keyboard. The card still navigates as
        a whole — `.art-tile-link` stretches over it, and `.art-play` lifts above that overlay.
      */}
      <span className="art-thumb" data-kind={asset.kind}>
        {isImage ? (
          <img src={src} alt="" loading="lazy" decoding="async" />
        ) : asset.kind === 'audio' ? (
          <PlayButton asset={asset} />
        ) : (
          <span className="art-thumb-badge" aria-hidden="true">
            GLB
          </span>
        )}
      </span>
      <a className="art-tile-link" href={href}>
        <span className="art-tile-name">{asset.name}</span>
        <span className="art-tile-file">{asset.file}</span>
        {asset.seconds !== undefined ? (
          <span className="art-tile-dur">{formatDuration(asset.seconds)}</span>
        ) : null}
      </a>
    </li>
  );
}

/**
 * Generic over the asset type so the search page can pass rows that carry their own `group`
 * without a cast — the flat search results and a group's own list are the same grid.
 */
export function ArtGrid<A extends Asset>({
  assets,
  hrefOf,
}: {
  assets: A[];
  hrefOf: (a: A) => string;
}) {
  if (assets.length === 0) return <p className="empty">Nothing matches that.</p>;
  return (
    <ul className="art-grid">
      {assets.map((a) => (
        <ArtTile key={hrefOf(a)} asset={a} href={hrefOf(a)} />
      ))}
    </ul>
  );
}

// ── detail ─────────────────────────────────────────────────────────────────────────────────────

function ArtDetail({ asset, group }: { asset: Asset; group: ArtGroup }) {
  // `heavy` assets show their small stand-in until the full file is explicitly requested. The
  // whole point of the flag is that opening a detail page never costs 22 MB by accident.
  const [full, setFull] = useState(false);
  const standIn = Boolean(asset.heavy) && !full;
  const showing = standIn ? asset.preview! : asset.url;
  // Same shape as useByteSize: tag the measurement with what was measured and discard it during
  // render when it no longer matches, rather than clearing it from an effect.
  const [measured, setMeasured] = useState<{ url: string; w: number; h: number } | null>(null);
  const dims = measured?.url === showing ? measured : null;
  const bytes = useByteSize(showing);

  return (
    <article className="art-detail">
      {/* codex's own breadcrumb, three deep rather than two. */}
      <nav className="crumbs">
        <a href="#/">Codex</a>
        <span aria-hidden="true">/</span>
        <a href="#/art">Graphics</a>
        <span aria-hidden="true">/</span>
        <a href={`#/art/${group.id}`}>{group.name}</a>
      </nav>

      <h2 className="detail-title">{asset.name}</h2>

      <div className="art-stage" data-kind={asset.kind}>
        {asset.kind === 'audio' ? (
          <p className="art-stage-audio">
            <audio controls preload="metadata" src={asset.url}>
              <a href={asset.url}>Download {asset.name}</a>
            </audio>
          </p>
        ) : asset.kind === 'model' ? (
          <p className="art-stage-model">
            <span aria-hidden="true">GLB</span>
            <span>
              3D model —{' '}
              <a href={asset.url} download>
                download
              </a>{' '}
              it, or see it rendered in a real scene with <code>pnpm dev:board</code>.
            </span>
          </p>
        ) : (
          <img
            src={showing}
            alt={asset.name}
            decoding="async"
            onLoad={(e) =>
              setMeasured({
                url: showing,
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
          />
        )}
      </div>

      {standIn ? (
        <p className="art-heavy">
          Showing the small variant. The original is a multi-megabyte PNG.{' '}
          <button type="button" onClick={() => setFull(true)}>
            Load the full-resolution file
          </button>
        </p>
      ) : null}

      {/* codex's `.fields` shape, so an art record reads like any other record here. */}
      <dl className="fields">
        <div className="field">
          <dt>File</dt>
          <dd>
            <code>{asset.file}</code>
          </dd>
        </div>
        {/*
          Both figures are measured from whatever is on screen, which for a heavy asset is the
          stand-in — so they must say so. Unqualified, they read as the original's dimensions and
          weight and are wildly wrong: 1400 × 1400 / 481 KB under the heading `board/board.png`,
          which is really 4096² and 22 MB.
        */}
        {dims ? (
          <div className="field">
            <dt>Dimensions{standIn ? ' (small variant)' : ''}</dt>
            <dd>
              {dims.w} × {dims.h}
            </dd>
          </div>
        ) : null}
        {asset.seconds !== undefined ? (
          <div className="field">
            <dt>Duration</dt>
            <dd>{formatDuration(asset.seconds)}</dd>
          </div>
        ) : null}
        {bytes !== null ? (
          <div className="field">
            <dt>Size{standIn ? ' (small variant)' : ''}</dt>
            <dd>{formatBytes(bytes)}</dd>
          </div>
        ) : null}
        <div className="field">
          <dt>Import</dt>
          <dd>
            <code>{group.importPath}</code>
          </dd>
        </div>
      </dl>

      <p className="art-actions">
        <a href={asset.url} download>
          Download
        </a>
        <a href={asset.url} target="_blank" rel="noreferrer" className="ghost">
          Open original
        </a>
      </p>
    </article>
  );
}

// ── pages ──────────────────────────────────────────────────────────────────────────────────────

function ArtGroupPage({ group }: { group: ArtGroup }) {
  return (
    <section className="dataset">
      <header className="dataset-head">
        <h2>{group.name}</h2>
        <p className="count">
          {group.assets.length} {group.assets.length === 1 ? 'file' : 'files'}
        </p>
        {group.blurb ? <p className="note">{group.blurb}</p> : null}
        <p className="art-import">
          <code>{group.importPath}</code>
        </p>
      </header>
      <ArtGrid assets={group.assets} hrefOf={(a) => artHref(group.id, a.id)} />
    </section>
  );
}

/** The art group list. Shared by the `#/art` index and the codex home page. */
export function ArtGroupIndex() {
  return (
    <div className="home-groups">
      {ART_SECTION_ORDER.map((section) => (
        <section key={section}>
          <h3>{section}</h3>
          <ul>
            {ART_GROUPS.filter((g) => g.section === section).map((g) => (
              <li key={g.id}>
                <a href={`#/art/${g.id}`}>
                  {g.name}
                  <span>{g.assets.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ArtIndex() {
  const heavy = ART_GROUPS.flatMap((g) => g.assets).filter((a) => a.heavy).length;
  return (
    <section className="home">
      <header className="home-head">
        <h2>Every piece of Return to Dark Tower game art and audio, in one place.</h2>
        <p>
          Board art, the full token roster, the tower model, the drum glyphs and the tower&rsquo;s
          whole sound library. Read straight out of{' '}
          <a href={`${REPO}/tree/main/packages/assets`} className="out">
            @udtc/assets
          </a>
          , the package every app in this repo consumes, so nothing here is a copy that can drift.
        </p>
      </header>

      <ArtGroupIndex />

      <aside className="art-note">
        <h3>How to use these</h3>
        <p>
          Every URL on this page was emitted by the bundler from a{' '}
          <code>new URL(…, import.meta.url)</code> or an <code>import.meta.glob</code> in{' '}
          <code>@udtc/assets</code> — not copied into a <code>public/</code> folder and resolved by
          string concatenation. Each group page shows the exact import to write. {heavy} file
          {heavy === 1 ? ' is' : 's are'} large enough that this page loads a small stand-in until
          you ask for the original.
        </p>
        <p className="note-foot">
          <a href={`${REPO}/blob/main/packages/assets/CLAUDE.md`} className="out">
            Why this is a package and not a public/ copy
          </a>
        </p>
      </aside>
    </section>
  );
}

function ArtNotFound({ group, assetId }: { group: ArtGroup; assetId: string }) {
  return (
    <section className="dataset">
      <p className="empty">
        No asset <code>{assetId}</code> in {group.name}.{' '}
        <a href={`#/art/${group.id}`}>Browse all {group.assets.length}</a>.
      </p>
    </section>
  );
}

/**
 * The whole `#/art/...` namespace, in one dispatch.
 *
 * An unknown group falls through to the index rather than a 404, because the index *is* the list
 * of valid groups. Datasets get a `NotFound` instead — there the list is 1,300 records long.
 */
export function ArtRoute({ groupId, assetId }: { groupId?: string; assetId?: string }) {
  const group = groupId ? ART_GROUP_BY_ID.get(groupId) : undefined;
  if (!group) return <ArtIndex />;
  if (assetId === undefined) return <ArtGroupPage group={group} />;
  const asset = group.assets.find((a) => a.id === assetId);
  return asset ? (
    <ArtDetail asset={asset} group={group} />
  ) : (
    <ArtNotFound group={group} assetId={assetId} />
  );
}
