// Hand-rolled SVG bar charts.
// One helper per chart per spec; no external libs.
// All charts share the same rendering primitives below.

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, children = []) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

function barClass(path) {
  return path === 'A' ? 'bar-a' : path === 'B' ? 'bar-b' : 'bar-baseline';
}

function fmt(v, digits = 1) {
  if (v == null) return '—';
  if (Math.abs(v) >= 100) return v.toFixed(0);
  return v.toFixed(digits);
}

function formatPct(v, digits = 0) {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

/**
 * Generic horizontal bar chart.
 * rows: [{ id, label, sublabel, value, valueLabel, deltaLabel, path, vsync, sourceNote }]
 * opts: { width, rowH, xMax, xMin, xTicks, xLabel, log, refLine: { x, label } }
 */
function horizontalBars(rows, opts = {}) {
  const W = opts.width || 560;
  const rowH = opts.rowH || 28;
  const labelW = opts.labelW || 130;
  const padR = opts.padR || 86;
  const padTop = 18;
  const padBot = 28;
  const plotW = W - labelW - padR;
  const plotH = rowH * rows.length;
  const H = plotH + padTop + padBot;

  const xMin = opts.log ? Math.max(opts.xMin || 1, 0.1) : opts.xMin || 0;
  const xMax = opts.xMax;
  const scale = opts.log
    ? (v) =>
        labelW +
        ((Math.log10(Math.max(v, xMin)) - Math.log10(xMin)) /
          (Math.log10(xMax) - Math.log10(xMin))) *
          plotW
    : (v) => labelW + ((v - xMin) / (xMax - xMin)) * plotW;

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'bar-chart',
    role: 'img',
    'aria-labelledby': `${opts.id}-title ${opts.id}-desc`,
  });
  svg.appendChild(el('title', { id: `${opts.id}-title` }, opts.title || ''));
  svg.appendChild(el('desc', { id: `${opts.id}-desc` }, opts.desc || ''));

  // Grid + tick lines + tick labels
  const ticks = opts.xTicks || [];
  for (const t of ticks) {
    const x = scale(t);
    svg.appendChild(
      el('line', { class: 'grid-line', x1: x, x2: x, y1: padTop, y2: padTop + plotH }),
    );
    svg.appendChild(
      el(
        'text',
        { class: 'tick-text', x: x, y: padTop + plotH + 14, 'text-anchor': 'middle' },
        String(t),
      ),
    );
  }

  // X axis label
  if (opts.xLabel) {
    svg.appendChild(
      el(
        'text',
        {
          class: 'tick-text',
          x: labelW + plotW / 2,
          y: H - 4,
          'text-anchor': 'middle',
          fill: 'var(--c-text-2)',
        },
        opts.xLabel,
      ),
    );
  }

  // Reference line (e.g., baseline marker)
  if (opts.refLine) {
    const x = scale(opts.refLine.x);
    svg.appendChild(
      el('line', { class: 'reference-line', x1: x, x2: x, y1: padTop, y2: padTop + plotH }),
    );
    if (opts.refLine.label) {
      svg.appendChild(
        el('text', { class: 'reference-label', x: x + 4, y: padTop - 4 }, opts.refLine.label),
      );
    }
  }

  // Bars + labels
  rows.forEach((row, i) => {
    const y = padTop + i * rowH;
    const x0 = labelW;
    const x1 = scale(Math.max(row.value, xMin));
    const bw = Math.max(0, x1 - x0);
    const barCls = `bar ${barClass(row.path)}${row.vsync ? ' vsync' : ''}`;

    // Row label (left)
    svg.appendChild(
      el(
        'text',
        { class: 'label-text', x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end' },
        row.label,
      ),
    );
    if (row.sublabel) {
      svg.appendChild(
        el(
          'text',
          { class: 'label-text small', x: labelW - 8, y: y + rowH / 2 + 14, 'text-anchor': 'end' },
          row.sublabel,
        ),
      );
    }

    // Bar
    svg.appendChild(el('rect', { class: barCls, x: x0, y: y + 6, width: bw, height: rowH - 12 }));

    // Value label (right of bar)
    svg.appendChild(
      el(
        'text',
        { class: 'value-text', x: x1 + 8, y: y + rowH / 2 + 4 },
        row.valueLabel || fmt(row.value),
      ),
    );
    if (row.deltaLabel) {
      svg.appendChild(
        el(
          'text',
          {
            class: `delta-text${row.deltaUp ? ' up' : ''}`,
            x: x1 + 8 + (row.valueLabel || fmt(row.value)).length * 6.5,
            y: y + rowH / 2 + 4,
          },
          ' ' + row.deltaLabel,
        ),
      );
    }
  });

  // Axis baseline
  svg.appendChild(
    el('line', { class: 'axis-line', x1: labelW, x2: labelW, y1: padTop, y2: padTop + plotH }),
  );

  return svg;
}

// ──────────────────────────────────────── Public helpers ────────────────────────────────────────

export function chartSeq5FpsRetina(all) {
  // Chart 1 — Retina Sequence-5 fps. Bars colored by path. Baseline reference line.
  const baseline = all.find((a) => a.id === '00');
  const rows = all.map((a) => {
    const fps = a.retina.seq5.fps;
    const isWinner = fps >= 100;
    const delta =
      a.id === '00' ? null : ((fps - baseline.retina.seq5.fps) / baseline.retina.seq5.fps) * 100;
    return {
      id: a.id,
      label: `${a.id === '00' ? 'baseline' : a.id} ${a.name}`,
      value: fps,
      valueLabel: fmt(fps),
      deltaLabel: delta != null ? formatPct(delta) : null,
      deltaUp: delta != null && delta > 0,
      path: a.path,
      vsync: isWinner,
    };
  });
  return horizontalBars(rows, {
    id: 'chart-fps',
    title: 'Sequence-5 fps at Retina full-window (~8 M backing px)',
    desc: 'Five alternatives cluster at the v-sync ceiling (≥100 fps): 4.5 light-probe, 4.1 hdr-proxies, 4.4 two-directional, 4.19 interior-sprites, 4.11 min-cost-combo. 4.18 mid-tier at 74.5 fps. 4.2 at 12.9. 4.16 + baseline near the floor.',
    width: 600,
    rowH: 30,
    labelW: 200,
    padR: 110,
    xMin: 0,
    xMax: 130,
    xTicks: [0, 30, 60, 90, 120],
    xLabel: 'frames per second',
    refLine: { x: baseline.retina.seq5.fps, label: 'baseline 6.9 fps' },
  });
}

export function chartFrameMsRetinaLog(all) {
  // Chart 2 — Retina Sequence-5 frameMs.median, log scale.
  const rows = all.map((a) => {
    const ms = a.retina.seq5.ms;
    return {
      id: a.id,
      label: `${a.id === '00' ? 'baseline' : a.id} ${a.name}`,
      value: ms,
      valueLabel: `${fmt(ms)} ms`,
      path: a.path,
      vsync: ms <= 9,
    };
  });
  return horizontalBars(rows, {
    id: 'chart-ms',
    title: 'frameMs.median at Retina Sequence-5 — log scale',
    desc: 'Log-scale bar chart. 5-way tie at v-sync (~8.3 ms) for 4.5, 4.1, 4.4, 4.19, 4.11. 4.18 one tier higher at 16.6 ms. 4.2 at 76.9 ms. Baseline + 4.16 at ~141–150 ms.',
    width: 600,
    rowH: 30,
    labelW: 200,
    padR: 110,
    log: true,
    xMin: 5,
    xMax: 200,
    xTicks: [5, 10, 20, 50, 100, 200],
    xLabel: 'milliseconds per frame (log)',
    refLine: { x: 16.7, label: '60 Hz v-sync = 16.7 ms' },
  });
}

export function chartPrograms(all) {
  // Chart 3 — Programs count.
  const rows = all.map((a) => ({
    id: a.id,
    label: `${a.id === '00' ? 'baseline' : a.id} ${a.name}`,
    value: a.signals.programs,
    valueLabel: String(a.signals.programs),
    path: a.path,
    vsync: a.signals.programs <= 22,
  }));
  return horizontalBars(rows, {
    id: 'chart-programs',
    title: 'WebGL programs compiled per alternative',
    desc: 'Programs count tells the shader-recompile + cold-start story. Baseline 30. Removing PointLights drops most alts to 22. 4.16 drops to 29 (program-sharing). 4.18 + 4.2 stay at 30 (kept PointLights). 4.11 drops to 6 — bloom pipeline contributed 16 program variants.',
    width: 600,
    rowH: 30,
    labelW: 200,
    padR: 70,
    xMin: 0,
    xMax: 35,
    xTicks: [0, 6, 22, 30],
    xLabel: 'compiled program variants',
  });
}

export function chartDrawCallsAllLeds(all) {
  // Chart 4 — drawCalls @ All-LEDs Retina.
  const baseline = all.find((a) => a.id === '00');
  const rows = all.map((a) => {
    const draws = a.retina.allLeds.draws;
    const delta = a.id === '00' ? null : draws - baseline.retina.allLeds.draws;
    return {
      id: a.id,
      label: `${a.id === '00' ? 'baseline' : a.id} ${a.name}`,
      value: draws,
      valueLabel: String(draws),
      deltaLabel: delta != null && delta !== 0 ? (delta > 0 ? `+${delta}` : String(delta)) : null,
      deltaUp: delta != null && delta < 0,
      path: a.path,
      vsync: a.id === '4.11',
    };
  });
  return horizontalBars(rows, {
    id: 'chart-draws',
    title: 'drawCalls at All-LEDs / Retina',
    desc: 'Most alts sit at baseline 187. 4.19 drives draws UP to 235 (+48 from 24 interior sprites × 2 bloom+main passes). 4.11 drives draws DOWN to 87 (bloom 2nd-composer pass eliminated).',
    width: 600,
    rowH: 30,
    labelW: 200,
    padR: 110,
    xMin: 0,
    xMax: 260,
    xTicks: [0, 87, 187, 235],
    xLabel: 'draw calls per frame',
    refLine: { x: baseline.retina.allLeds.draws, label: 'baseline 187' },
  });
}

// Data-table fallback for each chart (rendered into <details> beside chart for a11y / printability)
export function dataTable(rows, headers) {
  const table = document.createElement('table');
  table.className = 'data-table';
  const thead = document.createElement('thead');
  const trH = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    if (h !== headers[0]) th.classList.add('num');
    trH.appendChild(th);
  }
  thead.appendChild(trH);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');
    r.forEach((cell, i) => {
      const td = document.createElement('td');
      td.textContent = cell;
      if (i > 0) td.classList.add('num');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}
