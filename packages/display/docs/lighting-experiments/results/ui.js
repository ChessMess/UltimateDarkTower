// Renders the bake-off results page from the bakeoff.js data module.
// Sections rendered: matrix, charts, per-alt cards, gallery, decision framework, methodology.
// Hero is in index.html (static).

import {
  meta,
  baseline,
  alternatives,
  all,
  decisionFramework,
  vsyncWinners,
  pctDelta,
} from './bakeoff.js';
import {
  chartSeq5FpsRetina,
  chartFrameMsRetinaLog,
  chartPrograms,
  chartDrawCallsAllLeds,
  dataTable,
} from './charts.js';

const $ = (sel, root = document) => root.querySelector(sel);
const create = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};
const text = (tag, cls, t) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (t != null) el.textContent = t;
  return el;
};
const fmt = (v, d = 1) => (v == null ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(d));
const fmtMs = (v) => (v == null ? '—' : `${fmt(v)} ms`);
const fmtFps = (v) => (v == null ? '—' : fmt(v));
const fmtPct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(0)}%`);

// ───────────────────────────────────────── MATRIX ─────────────────────────────────────────
function renderMatrix() {
  const root = $('#matrix-mount');
  const wrap = create('div', 'matrix-wrap');
  const table = document.createElement('table');
  table.className = 'matrix';
  table.setAttribute('role', 'table');

  const columns = [
    { key: 'path', label: 'Path', sortable: false, align: 'left' },
    { key: 'name', label: 'Alternative', sortable: false, align: 'left' },
    { key: 'shortDescription', label: 'What changed', sortable: false, align: 'left' },
    { key: 'seq5FpsRetina', label: 'Retina Seq-5 fps', sortable: true, align: 'right' },
    { key: 'seq5MsRetina', label: 'Retina Seq-5 ms', sortable: true, align: 'right' },
    { key: 'programs', label: 'Programs', sortable: true, align: 'right' },
    { key: 'drawsAllLeds', label: 'Draws@All', sortable: true, align: 'right' },
    { key: 'visualCharacter', label: 'Visual character', sortable: false, align: 'left' },
    { key: 'loc', label: 'Lines', sortable: false, align: 'right' },
    { key: 'jump', label: '', sortable: false, align: 'right' },
  ];

  const thead = document.createElement('thead');
  const trH = document.createElement('tr');
  columns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col.label;
    if (col.sortable) {
      th.classList.add('sortable');
      th.setAttribute('aria-sort', 'none');
      th.dataset.col = col.key;
      th.appendChild(text('span', 'sort-ind'));
    }
    if (col.align === 'right') th.style.textAlign = 'right';
    trH.appendChild(th);
  });
  thead.appendChild(trH);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const baseFps = baseline.retina.seq5.fps;
  for (const a of all) {
    const tr = document.createElement('tr');
    tr.dataset.id = a.id;
    if (a.path === 'baseline') tr.classList.add('is-baseline');

    // Path
    const tdPath = document.createElement('td');
    const tag = text('span', 'path-tag', a.path === 'baseline' ? 'BASE' : a.path);
    tag.dataset.path = a.path;
    tdPath.appendChild(tag);
    tr.appendChild(tdPath);

    // Name
    const tdName = document.createElement('td');
    const nameCell = create('div', 'name-cell');
    nameCell.appendChild(text('span', 'sec', a.id === '00' ? '00' : `§${a.id}`));
    nameCell.appendChild(text('span', 'nm', a.name));
    tdName.appendChild(nameCell);
    tr.appendChild(tdName);

    // Short description
    const tdDesc = document.createElement('td');
    tdDesc.appendChild(text('div', 'short-desc', a.shortDescription));
    tr.appendChild(tdDesc);

    // Retina Seq-5 fps + delta
    const tdFps = document.createElement('td');
    const fpsClass = a.retina.seq5.fps >= 100 ? 'num vsync-ceiling' : 'num';
    const fpsDiv = text('div', fpsClass, fmtFps(a.retina.seq5.fps));
    tdFps.appendChild(fpsDiv);
    if (a.id !== '00') {
      const d = pctDelta(a.retina.seq5.fps, baseFps);
      tdFps.appendChild(text('div', `delta ${d > 0 ? 'up' : 'down'}`, fmtPct(d)));
    }
    tr.appendChild(tdFps);

    // Retina Seq-5 ms
    const tdMs = document.createElement('td');
    const msClass = a.retina.seq5.ms <= 9 ? 'num vsync-ceiling' : 'num';
    tdMs.appendChild(text('div', msClass, fmtMs(a.retina.seq5.ms)));
    tr.appendChild(tdMs);

    // Programs
    const tdProg = document.createElement('td');
    const progCls = a.signals.programs === 6 ? 'num win' : 'num';
    tdProg.appendChild(text('div', progCls, String(a.signals.programs)));
    tr.appendChild(tdProg);

    // Draws @ All-LEDs Retina
    const tdDraws = document.createElement('td');
    const drawsCls = a.retina.allLeds.draws < 100 ? 'num win' : 'num';
    tdDraws.appendChild(text('div', drawsCls, String(a.retina.allLeds.draws)));
    tr.appendChild(tdDraws);

    // Visual character
    const tdVis = document.createElement('td');
    tdVis.appendChild(text('div', 'vis-char', '“' + a.visualCharacter + '”'));
    tr.appendChild(tdVis);

    // Lines
    const tdLoc = document.createElement('td');
    const locValue = a.implementation?.loc ?? '—';
    tdLoc.appendChild(text('div', 'num muted', locValue));
    tr.appendChild(tdLoc);

    // Jump
    const tdJump = document.createElement('td');
    tdJump.className = 'jumpto';
    const jumpA = document.createElement('a');
    jumpA.href = `#card-${a.id}`;
    jumpA.textContent = 'detail';
    jumpA.addEventListener('click', (ev) => {
      const target = document.querySelector(`#card-${a.id} > details`);
      if (target) target.open = true;
      // Add temporary highlight
      const card = document.getElementById(`card-${a.id}`);
      if (card) {
        card.classList.add('is-target');
        setTimeout(() => card.classList.remove('is-target'), 2500);
      }
    });
    tdJump.appendChild(jumpA);
    tr.appendChild(tdJump);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  root.appendChild(wrap);

  // Sort behavior
  const sortState = { col: null, dir: null };
  function valueOf(a, key) {
    switch (key) {
      case 'seq5FpsRetina':
        return a.retina.seq5.fps;
      case 'seq5MsRetina':
        return a.retina.seq5.ms;
      case 'programs':
        return a.signals.programs;
      case 'drawsAllLeds':
        return a.retina.allLeds.draws;
      default:
        return 0;
    }
  }
  thead.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      let dir = sortState.col === col && sortState.dir === 'asc' ? 'desc' : 'asc';
      sortState.col = col;
      sortState.dir = dir;
      thead.querySelectorAll('th.sortable').forEach((o) => o.setAttribute('aria-sort', 'none'));
      th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((r1, r2) => {
        const a1 = all.find((x) => x.id === r1.dataset.id);
        const a2 = all.find((x) => x.id === r2.dataset.id);
        const v1 = valueOf(a1, col),
          v2 = valueOf(a2, col);
        return dir === 'asc' ? v1 - v2 : v2 - v1;
      });
      rows.forEach((r) => tbody.appendChild(r));
    });
  });
}

// ───────────────────────────────────────── CHARTS ─────────────────────────────────────────
function renderCharts() {
  const mount = $('#charts-mount');

  const charts = [
    {
      svg: chartSeq5FpsRetina(all),
      sub: 'Bar chart · colored by Path · gold = v-sync ceiling',
      caption:
        'Five alternatives reach the v-sync ceiling (~100+ fps). 4.18 mid-tier; 4.2 partial; 4.16 ≈ baseline (validation-only). The bake-off perf question is answered — the decision moves to visual + structural.',
      tableHeaders: ['Alternative', 'Retina Seq-5 fps', 'Δ vs baseline'],
      tableRows: all.map((a) => [
        `${a.id === '00' ? 'baseline' : '§' + a.id + ' ' + a.name}`,
        fmtFps(a.retina.seq5.fps),
        a.id === '00' ? '—' : fmtPct(pctDelta(a.retina.seq5.fps, baseline.retina.seq5.fps)),
      ]),
    },
    {
      svg: chartFrameMsRetinaLog(all),
      sub: 'Bar chart · log scale · gold = ≤ 9 ms (v-sync class)',
      caption:
        'Log scale exposes the discrete cost tiers: ~8.3 ms (v-sync), ~16.6 ms (4.18, half v-sync), ~76 ms (4.2), ~141 ms (baseline). The dashed gold line marks the 60 Hz v-sync budget of 16.7 ms.',
      tableHeaders: ['Alternative', 'frameMs.median (Retina Seq-5)'],
      tableRows: all.map((a) => [
        `${a.id === '00' ? 'baseline' : '§' + a.id + ' ' + a.name}`,
        fmtMs(a.retina.seq5.ms),
      ]),
    },
    {
      svg: chartPrograms(all),
      sub: 'Compiled GLSL programs · cold-start + memory proxy',
      caption:
        '4.11 drops to 6 programs — bloom pipeline alone accounted for 16 variants. 4.5/4.1/4.4/4.19 cluster at 22 (no PointLights = NUM_POINT_LIGHTS=36 variants removed). 4.16 drops one variant by sharing with drum-interior material. 4.18/4.2 stay at 30 (kept PointLights).',
      tableHeaders: ['Alternative', 'Programs (steady)'],
      tableRows: all.map((a) => [
        `${a.id === '00' ? 'baseline' : '§' + a.id + ' ' + a.name}`,
        String(a.signals.programs),
      ]),
    },
    {
      svg: chartDrawCallsAllLeds(all),
      sub: 'Draw calls per frame · additive vs subtractive techniques',
      caption:
        '4.19 increases draws (+48: 24 interior sprites × 2 bloom+main passes). 4.11 cuts draws to 87 by eliminating the bloom 2nd-composer pass entirely. All other alts inherit baseline draws — their wins come from the lights loop, not draw-call count.',
      tableHeaders: ['Alternative', 'drawCalls @ All-LEDs Retina'],
      tableRows: all.map((a) => [
        `${a.id === '00' ? 'baseline' : '§' + a.id + ' ' + a.name}`,
        String(a.retina.allLeds.draws),
      ]),
    },
  ];

  for (const c of charts) {
    const fig = document.createElement('figure');
    fig.className = 'chart';
    const h3 = document.createElement('h3');
    h3.textContent = c.svg.querySelector('title').textContent;
    fig.appendChild(h3);
    fig.appendChild(text('p', 'chart-sub', c.sub));
    fig.appendChild(c.svg);
    fig.appendChild(text('figcaption', '', c.caption));
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = 'Data table';
    det.appendChild(sum);
    det.appendChild(dataTable(c.tableRows, c.tableHeaders));
    fig.appendChild(det);
    mount.appendChild(fig);
  }
}

// ─────────────────────────────────── PER-ALT CARDS ───────────────────────────────────
function renderPerfTable(label, canvas) {
  const tbl = document.createElement('table');
  tbl.className = 'perf-table';
  const cap = document.createElement('caption');
  cap.textContent = label;
  tbl.appendChild(cap);
  const thead = document.createElement('thead');
  const trH = document.createElement('tr');
  ['', 'Empty', '1-LED', 'All-LEDs', 'Seq-5'].forEach((h) => {
    const th = document.createElement('th');
    th.textContent = h;
    trH.appendChild(th);
  });
  thead.appendChild(trH);
  tbl.appendChild(thead);
  const tbody = document.createElement('tbody');
  const cols = ['empty', 'oneLed', 'allLeds', 'seq5'];
  const rows = [
    { label: 'fps', get: (r) => fmtFps(r.fps) },
    { label: 'frameMs median', get: (r) => fmtMs(r.ms) },
    { label: 'frameMs p95 / max', get: (r) => `${fmt(r.p95)} / ${fmt(r.max)}` },
    { label: 'bloomTotalMs', get: (r) => (r.bloom == null ? '—' : fmt(r.bloom, 1)) },
    { label: 'drawCalls', get: (r) => String(r.draws) },
  ];
  for (const row of rows) {
    const tr = document.createElement('tr');
    if (row.label === 'fps') {
      const allVsync = cols.every((c) => canvas[c].ms <= 9);
      if (allVsync) tr.classList.add('vsync-row');
    }
    tr.appendChild(text('td', '', row.label));
    cols.forEach((c) => tr.appendChild(text('td', '', row.get(canvas[c]))));
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  return tbl;
}

function renderSignals(a) {
  const wrap = create(
    'div',
    'signals-row' + (a.signals.bloomEnabled === false ? ' bloom-off' : ''),
  );
  const sigs = [
    { label: 'programs', value: a.signals.programs },
    { label: 'visiblePointLights', value: a.signals.visiblePointLights },
    { label: 'visibleDirectionalLights', value: a.signals.visibleDirectionalLights },
    {
      label: 'bloomEnabled',
      value: String(a.signals.bloomEnabled),
      cls: a.signals.bloomEnabled === false ? 'bloom-off' : null,
    },
  ];
  for (const s of sigs) {
    const span = document.createElement('span');
    span.className = 'sig' + (s.cls ? ' ' + s.cls : '');
    span.innerHTML = `${s.label}: <strong>${s.value}</strong>`;
    wrap.appendChild(span);
  }
  return wrap;
}

function renderProgramsStability(stab) {
  if (!stab) return create('p', 'stab-note', 'Not separately captured.');
  const tbl = document.createElement('table');
  tbl.className = 'stab-table';
  const thead = document.createElement('thead');
  const trH = document.createElement('tr');
  trH.appendChild(text('th', '', 'Stage'));
  trH.appendChild(text('th', '', 'Programs'));
  thead.appendChild(trH);
  tbl.appendChild(thead);
  const tbody = document.createElement('tbody');
  const stages = [
    'initial empty',
    'seq5 iter 1 mid',
    'seq5 iter 1 post-idle',
    'seq5 iter 2 mid',
    'seq5 iter 2 post-idle',
    'seq5 iter 3 mid',
    'seq5 iter 3 post-idle',
  ];
  stab.samples.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.appendChild(text('td', '', stages[i] || `sample ${i + 1}`));
    tr.appendChild(text('td', 'num', String(p)));
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  const wrap = document.createDocumentFragment();
  wrap.appendChild(tbl);
  if (stab.note) wrap.appendChild(text('p', 'stab-note', stab.note));
  return wrap;
}

function renderShotPair(pair) {
  const compare = create('div', 'compare');
  const head = create('div', 'compare-head');
  head.appendChild(text('span', 'lbl', pair.label));
  const toggle = document.createElement('button');
  toggle.className = 'compare-toggle';
  toggle.textContent = 'Slider mode';
  toggle.setAttribute('aria-pressed', 'false');
  head.appendChild(toggle);
  compare.appendChild(head);

  const stage = create('div', 'compare-stage is-side');
  const grid = create('div', 'pair-grid');
  const sideB = create('div', 'side is-baseline');
  const sideA = create('div', 'side is-after');
  const imgB = document.createElement('img');
  imgB.src = pair.baseline;
  imgB.alt = `Baseline: ${pair.label} before changes.`;
  imgB.loading = 'lazy';
  const imgA = document.createElement('img');
  imgA.src = pair.after;
  imgA.alt = `After: ${pair.label} with the alternative applied.`;
  imgA.loading = 'lazy';
  sideB.appendChild(imgB);
  sideA.appendChild(imgA);
  sideB.appendChild(text('span', 'side-lbl', 'baseline'));
  sideA.appendChild(text('span', 'side-lbl', 'after'));
  grid.appendChild(sideB);
  grid.appendChild(sideA);

  const track = create('div', 'slider-track');
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.value = '50';
  range.setAttribute('aria-label', `Comparison slider for ${pair.label}`);
  range.addEventListener('input', () => stage.style.setProperty('--split', `${range.value}%`));
  track.appendChild(range);
  stage.appendChild(grid);
  stage.appendChild(track);
  compare.appendChild(stage);
  compare.appendChild(text('p', 'shot-caption', pair.caption));

  // Toggle behavior
  toggle.addEventListener('click', () => {
    const isSlider = stage.classList.toggle('is-slider');
    stage.classList.toggle('is-side', !isSlider);
    toggle.classList.toggle('is-on', isSlider);
    toggle.textContent = isSlider ? 'Side-by-side' : 'Slider mode';
    toggle.setAttribute('aria-pressed', isSlider ? 'true' : 'false');
    if (isSlider) {
      // Initial split set via style; ensure aspect ratio carries across
      imgB.addEventListener(
        'load',
        () => {
          const ar = `${imgB.naturalWidth} / ${imgB.naturalHeight}`;
          stage.style.setProperty('--shot-aspect', ar);
        },
        { once: true },
      );
      if (imgB.naturalWidth) {
        stage.style.setProperty('--shot-aspect', `${imgB.naturalWidth} / ${imgB.naturalHeight}`);
      }
      stage.style.setProperty('--split', `${range.value}%`);
    }
  });

  return compare;
}

function renderCard(a) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `card-${a.id}`;
  card.dataset.path = a.path;

  const det = document.createElement('details');
  const sum = document.createElement('summary');

  // Header: id · name · meta pills · status
  sum.appendChild(text('span', 'card-id', a.id === '00' ? '00' : '§' + a.id));
  sum.appendChild(text('span', 'card-name', a.name));
  const meta = create('div', 'card-meta');
  meta.appendChild(text('span', 'vis', '“' + a.visualCharacter + '”'));
  // Perf pill
  const fps = a.retina.seq5.fps;
  let pillCls = 'cool';
  if (a.id !== '00') pillCls = fps >= 100 ? '' : fps >= 50 ? 'warm' : 'cool';
  if (a.id === '00') pillCls = 'cool';
  const perfPill = create('span', 'perf-pill ' + pillCls);
  perfPill.textContent =
    a.id === '00'
      ? `Retina Seq-5: ${fmt(fps)} fps`
      : `Retina Seq-5: ${fmt(fps)} fps · ${fmtPct(pctDelta(fps, baseline.retina.seq5.fps))}`;
  meta.appendChild(perfPill);
  // Path tag
  const pt = text('span', 'path-tag', a.path === 'baseline' ? 'BASE' : a.path);
  pt.dataset.path = a.path;
  meta.appendChild(pt);
  // Status
  meta.appendChild(text('span', 'status-badge', a.status));
  sum.appendChild(meta);
  det.appendChild(sum);

  // Body
  const body = create('div', 'card-body');

  // Two-column layout for narrative + numbers
  const grid = create('div', 'card-grid-two');

  // Narrative column
  const narrative = create('div', '');

  // Implementation summary
  if (a.implementation?.summary) {
    const block = create('div', 'card-block');
    block.appendChild(text('h4', '', 'Implementation summary'));
    block.appendChild(text('p', '', a.implementation.summary));
    if (a.implementation.loc) {
      block.appendChild(
        text(
          'p',
          '',
          `Footprint: ${a.implementation.loc} · ${a.implementation.files} file${a.implementation.files === 1 ? '' : 's'} touched.`,
        ),
      );
    }
    narrative.appendChild(block);
  }

  if (a.implementation?.decisionOnScope && a.id !== '00') {
    const block = create('div', 'card-block');
    block.appendChild(text('h4', '', 'Decision on scope'));
    block.appendChild(text('p', '', a.implementation.decisionOnScope));
    narrative.appendChild(block);
  }

  if (a.implementation?.knobsChosen?.length) {
    const block = create('div', 'card-block');
    block.appendChild(text('h4', '', 'Tuning knobs chosen'));
    const ul = document.createElement('ul');
    for (const k of a.implementation.knobsChosen) {
      ul.appendChild(text('li', '', k));
    }
    block.appendChild(ul);
    narrative.appendChild(block);
  }

  if (a.interpretation) {
    const block = create('div', 'card-block');
    block.appendChild(text('h4', '', 'Interpretation'));
    block.appendChild(text('p', '', a.interpretation));
    narrative.appendChild(block);
  }

  // Visual capture
  const visBlock = create('div', 'card-block');
  visBlock.appendChild(text('h4', '', 'Visual capture'));
  if (a.screenshots?.pairs?.length) {
    for (const pair of a.screenshots.pairs) {
      visBlock.appendChild(renderShotPair(pair));
    }
  } else {
    const note = a.screenshotsNote || 'No screenshot pair captured.';
    visBlock.appendChild(create('p', 'shot-no-pair', note));
  }
  narrative.appendChild(visBlock);

  // Notable observations (further-collapsed)
  if (a.observations?.length) {
    const obs = document.createElement('details');
    obs.className = 'obs-toggle';
    const obsSum = document.createElement('summary');
    obsSum.innerHTML = `<span>Notable observations / risks</span><span>${a.observations.length} items</span>`;
    obs.appendChild(obsSum);
    const obsBody = create('div', 'obs-body');
    const ul = document.createElement('ul');
    for (const o of a.observations) {
      const li = document.createElement('li');
      li.innerHTML = o.replace(/`([^`]+)`/g, '<code>$1</code>');
      ul.appendChild(li);
    }
    obsBody.appendChild(ul);
    obs.appendChild(obsBody);
    narrative.appendChild(obs);
  }

  grid.appendChild(narrative);

  // Numbers column
  const numbers = create('div', '');

  const displayBlock = create('div', 'card-block');
  displayBlock.appendChild(text('h4', '', 'Display canvas (~1.84 M backing px)'));
  displayBlock.appendChild(renderPerfTable('', a.display));
  numbers.appendChild(displayBlock);

  const retinaBlock = create('div', 'card-block');
  retinaBlock.appendChild(text('h4', '', 'Retina full-window (~7.9–8.1 M backing px)'));
  retinaBlock.appendChild(renderPerfTable('', a.retina));
  numbers.appendChild(retinaBlock);

  const sigBlock = create('div', 'card-block');
  sigBlock.appendChild(text('h4', '', 'Signals'));
  sigBlock.appendChild(renderSignals(a));
  numbers.appendChild(sigBlock);

  if (a.programsStability) {
    const stabBlock = create('div', 'card-block');
    stabBlock.appendChild(
      text('h4', '', `Programs stability across ${a.programsStability.iters} repeated sequences`),
    );
    stabBlock.appendChild(renderProgramsStability(a.programsStability));
    numbers.appendChild(stabBlock);
  }

  if (a.tests && a.tests.result !== 'n/a') {
    const testsBlock = create('div', 'card-block');
    testsBlock.appendChild(text('h4', '', 'Unit tests'));
    const testText = `${a.tests.result === 'pass' ? '✓' : '✗'} ${a.tests.result}${a.tests.count ? ' · ' + a.tests.count : ''}`;
    testsBlock.appendChild(text('p', '', testText));
    if (a.tests.touched?.length) {
      const ul = document.createElement('ul');
      for (const t of a.tests.touched) ul.appendChild(text('li', '', t));
      testsBlock.appendChild(ul);
    }
    numbers.appendChild(testsBlock);
  }

  grid.appendChild(numbers);
  body.appendChild(grid);

  // Footer links
  const foot = create('div', 'card-foot');
  if (a.sourceFile) {
    const a1 = document.createElement('a');
    a1.href = a.sourceFile;
    a1.textContent = 'Source result MD →';
    foot.appendChild(a1);
  }
  if (a.branchUrl) {
    const a2 = document.createElement('a');
    a2.href = a.branchUrl;
    a2.target = '_blank';
    a2.rel = 'noopener';
    a2.textContent = 'Code diff vs main →';
    foot.appendChild(a2);
  }
  body.appendChild(foot);

  det.appendChild(body);
  card.appendChild(det);
  return card;
}

function renderCards() {
  const mount = $('#cards-mount');
  for (const a of all) mount.appendChild(renderCard(a));
}

// ─────────────────────────────────── VISUAL GALLERY ───────────────────────────────────
function renderGallery() {
  const mount = $('#gallery-mount');
  // Baseline reference (from 4.4 baseline shot — same scene, mandatory pair)
  const baselineShot = 'screenshots/4.4-two-directional-allon-baseline.jpeg';
  const cells = [
    {
      id: '00',
      name: 'baseline',
      label: 'before',
      vis: baseline.visualCharacter,
      img: baselineShot,
      path: 'baseline',
    },
    ...vsyncWinners
      .filter((id) => ['4.1', '4.4', '4.11', '4.19'].includes(id))
      .map((id) => {
        const a = alternatives.find((x) => x.id === id);
        // Use the all-on / allon after-shot
        const allonPair =
          a.screenshots.pairs.find((p) => p.id === 'allon-retina') || a.screenshots.pairs[0];
        return {
          id,
          name: `§${id} ${a.name}`,
          label: 'after',
          vis: a.visualCharacter,
          img: allonPair.after,
          path: a.path,
        };
      }),
  ];
  for (const c of cells) {
    const cell = document.createElement('article');
    cell.className = 'cell' + (c.path === 'baseline' ? ' is-baseline' : '');
    cell.dataset.path = c.path;
    const img = document.createElement('img');
    img.src = c.img;
    img.alt = `${c.label}: ${c.name}, All-LEDs Retina. ${c.vis}`;
    img.loading = 'lazy';
    cell.appendChild(img);
    const meta = create('div', 'meta');
    meta.appendChild(
      text('div', 'label', c.label === 'before' ? 'baseline · before' : 'after · All-LEDs Retina'),
    );
    meta.appendChild(text('div', 'name', c.name));
    meta.appendChild(text('div', 'vis', '“' + c.vis + '”'));
    cell.appendChild(meta);
    mount.appendChild(cell);
  }
}

// ─────────────────────────────────── DECISION FRAMEWORK ───────────────────────────────────
function renderDecision() {
  const mount = $('#decision-mount');
  for (const row of decisionFramework) {
    const r = create('div', 'decision-row');
    r.appendChild(text('div', 'want', row.want));
    const pick = create('div', 'pick');
    pick.innerHTML = row.pick;
    if (row.runner) pick.appendChild(text('em', '', row.runner));
    r.appendChild(pick);
    const because = create('div', 'because');
    because.textContent = row.because;
    if (row.source) {
      const srcRow = create('span', 'src');
      srcRow.textContent = 'Source: ' + row.source.join(' · ');
      because.appendChild(srcRow);
    }
    r.appendChild(because);
    mount.appendChild(r);
  }
}

// ─────────────────────────────────── METHODOLOGY FOOTER ───────────────────────────────────
function renderMethodology() {
  const mount = $('#method-mount');
  const body = create('div', 'footer-body');

  // Capture context
  const c = create('div', '');
  c.appendChild(text('h4', '', 'Capture context'));
  const dl1 = document.createElement('dl');
  dl1.innerHTML = `
    <dt>Machine</dt><dd>${meta.captureMachine}</dd><br/>
    <dt>OS</dt><dd>${meta.captureOS}</dd><br/>
    <dt>Browser</dt><dd>${meta.captureBrowser}</dd><br/>
    <dt>Dates</dt><dd>${meta.captureDates.join(' / ')}</dd><br/>
    <dt>three.js</dt><dd>${meta.threeVersion}</dd><br/>
  `;
  c.appendChild(dl1);
  body.appendChild(c);

  // Baseline
  const b = create('div', '');
  b.appendChild(text('h4', '', 'Baseline'));
  const dl2 = document.createElement('dl');
  dl2.innerHTML = `
    <dt>SHA</dt><dd><a href="${meta.repoUrl}/commit/${meta.baselineShaFull}" target="_blank" rel="noopener"><code>${meta.baselineSha}</code></a></dd><br/>
    <dt>Commit</dt><dd>${meta.baselineCommitMessage}</dd><br/>
    <dt>Display canvas</dt><dd>${meta.canvases.display.bufW}×${meta.canvases.display.bufH} buffer (DPR ${meta.canvases.display.dpr}) — ${meta.canvases.display.backingPx.toLocaleString()} backing px</dd><br/>
    <dt>Retina canvas</dt><dd>${meta.canvases.retina.bufW}×${meta.canvases.retina.bufH} buffer (DPR ${meta.canvases.retina.dpr}) — ${meta.canvases.retina.backingPx.toLocaleString()} backing px</dd><br/>
  `;
  b.appendChild(dl2);
  body.appendChild(b);

  // Reproducibility
  const rep = create('div', '');
  rep.appendChild(text('h4', '', 'How to reproduce'));
  rep.innerHTML += `
    <p style="margin:0 0 .5rem; color:var(--c-text-2); font-size:13px; line-height:1.55;">
      Run the perf capture protocol described in the
      <a href="${meta.sources.perfSkill}">darktower-3d-perf skill</a>.
      Every result MD includes the exact <code>collectPerfReport(3000)</code> calls used.
    </p>
    <p style="margin:0 0 .5rem; color:var(--c-text-2); font-size:13px; line-height:1.55;">
      To view this page locally:<br/>
      <code>python -m http.server -d docs/lighting-experiments/results 8765</code>
    </p>
  `;
  body.appendChild(rep);

  // Source docs
  const s = create('div', '');
  s.appendChild(text('h4', '', 'Source documents'));
  const sdl = document.createElement('dl');
  sdl.innerHTML = `
    <dt>Testing plan</dt><dd><a href="${meta.sources.testingPlan}">lighting-testing-plan.md</a></dd><br/>
    <dt>Research menu</dt><dd><a href="${meta.sources.alternatives}">lighting-alternatives.md</a></dd><br/>
    <dt>Capture protocol</dt><dd><a href="${meta.sources.perfSkill}">darktower-3d-perf SKILL.md</a></dd><br/>
    <dt>Baseline MD</dt><dd><a href="${meta.sources.baseline}">00-baseline.md</a></dd><br/>
    <dt>Running summary</dt><dd><a href="${meta.sources.results}">RESULTS.md</a></dd><br/>
  `;
  s.appendChild(sdl);
  body.appendChild(s);

  mount.appendChild(body);
}

// ─────────────────────────────────── INIT ───────────────────────────────────
function init() {
  renderMatrix();
  renderCharts();
  renderCards();
  renderGallery();
  renderDecision();
  renderMethodology();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
