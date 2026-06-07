// The optional dockable editing UI (PRD §8). Vanilla TS + DOM, family-consistent with
// Display's overlay styling. Three ready-made panels — a token PALETTE (add), a selection
// INSPECTOR (edit/remove the selected token), and a per-kingdom SUMMARY. The UI is a *dumb-
// container client*: it calls ONLY the controller's public named command methods and reads
// state/selection; it mutates `BoardState` directly never, and enforces no rules.
//
// Part of the `.` entry — MUST stay `three`-free and Display-free (the CI grep enforces it).
// Docking into Display's overlay/panel slots is the consumer's choice of HOST element
// (wired in the example), not an import here.
import type { BoardStateController } from '../state/controller';
import type { BoardState, FoeStatus, LocationName } from '../state/boardState';
import type { BoardKingdom } from '../data/udtReexports';
import {
  ADVERSARIES,
  ALLIES,
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  DIFFICULTIES,
  HEROES,
  MONUMENTS,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
} from '../data/udtReexports';
import type { TokenSelection } from '../renderers/assetPaths';
import type { LocationPickStore, PendingPlacement, SelectionStore } from './stores';

export * from './stores';

export type PanelId = 'palette' | 'inspector' | 'summary';

/** Initial placement of a floating panel within the host (px from a corner). */
export interface PanelPlacement {
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  x?: number;
  y?: number;
}

/** A roster entry with a stable id + display name (heroes/monuments). */
export interface RosterEntry {
  id: string;
  name: string;
}

/** Roster lists the palette offers. Default from the UDT re-exports. */
export interface BoardUIRosters {
  foes: string[];
  adversaries: string[];
  allies: string[];
  markers: string[];
  heroes: ReadonlyArray<RosterEntry>;
  monuments: ReadonlyArray<RosterEntry>;
}

export interface BoardUIOptions {
  controller: BoardStateController;
  /** Active-selection source the inspector reads (and renderers/palette write). */
  selection: SelectionStore;
  /** Enables board-click placement; the location dropdown works without it. */
  locationPick?: LocationPickStore;
  /** Which panels render + each one's initial placement. Omitted ⇒ visible; `false` ⇒ start hidden. */
  panels?: Partial<Record<PanelId, boolean | PanelPlacement>>;
  /** Palette rosters; defaults from the UDT re-exports. */
  rosters?: Partial<BoardUIRosters>;
  /** Mint an instance id for an added foe. Default: next-free `foe-N` against the current state. */
  generateId?: (kind: 'foe', state: BoardState) => string;
  /** Draggable floating panels (default `true`). */
  floating?: boolean;
}

export interface BoardUIHandle {
  setPanelVisible(id: PanelId, on: boolean): void;
  dispose(): void;
}

const KINGDOMS: { value: BoardKingdom; label: string }[] = [
  { value: 'north', label: 'N' },
  { value: 'east', label: 'E' },
  { value: 'south', label: 'S' },
  { value: 'west', label: 'W' },
];
const FOE_STATUSES: FoeStatus[] = ['ready', 'savage', 'lethal'];
const BUILDING_LOCATIONS = BOARD_LOCATIONS.filter((l) => l.building).map((l) => l.name);

/**
 * Mounts the dockable editing UI into a host element. Returns a handle to toggle panels
 * and tear everything down. The UI works standalone (any `HTMLElement`) — the consumer
 * may pass Display's `getOverlayContainer()`/`getPanelSlot(...)` as the host to dock it.
 */
export function mountBoardUI(host: HTMLElement, options: BoardUIOptions): BoardUIHandle {
  const { controller, selection } = options;
  const locationPick = options.locationPick;
  const floating = options.floating ?? true;
  const rosters = resolveRosters(options.rosters);
  const genId = options.generateId ?? defaultFoeId;

  const root = document.createElement('div');
  root.className = 'udt-board-ui';

  const panels = new Map<PanelId, PanelHost>();
  let cascade = 0;
  const makeAndRegister = (
    id: PanelId,
    title: string,
    build: (body: HTMLElement) => void
  ): void => {
    // Panels are always built; `false` starts them hidden so `setPanelVisible` can reveal them.
    const config = options.panels?.[id];
    const placement = typeof config === 'object' ? config : undefined;
    const panel = makePanel(root, title, placement, floating, cascade++);
    build(panel.body);
    panel.setVisible(config !== false);
    panels.set(id, panel);
  };

  makeAndRegister('palette', 'Palette', (body) =>
    buildPalette(body, controller, locationPick, rosters, genId)
  );
  makeAndRegister('inspector', 'Inspector', (body) =>
    buildInspector(body, controller, selection)
  );
  makeAndRegister('summary', 'Summary', (body) => buildSummary(body, controller));

  host.appendChild(root);

  return {
    setPanelVisible(id, on) {
      panels.get(id)?.setVisible(on);
    },
    dispose() {
      for (const panel of panels.values()) panel.destroy();
      panels.clear();
      root.remove();
    },
  };
}

function resolveRosters(r?: Partial<BoardUIRosters>): BoardUIRosters {
  return {
    foes: r?.foes ?? [...TIER1_FOES, ...TIER2_FOES, ...TIER3_FOES],
    adversaries: r?.adversaries ?? [...ADVERSARIES],
    allies: r?.allies ?? [...ALLIES],
    markers: r?.markers ?? ['wasteland', 'power-skull'],
    heroes: r?.heroes ?? HEROES,
    monuments: r?.monuments ?? MONUMENTS,
  };
}

function defaultFoeId(_kind: 'foe', state: BoardState): string {
  let n = 1;
  while (`foe-${n}` in state.foes) n++;
  return `foe-${n}`;
}

// ── Panel chrome (titlebar + collapse/close + mouse-drag) ─────────────────────

interface PanelHost {
  root: HTMLElement;
  body: HTMLElement;
  setVisible(on: boolean): void;
  destroy(): void;
}

function makePanel(
  parent: HTMLElement,
  title: string,
  placement: PanelPlacement | undefined,
  floating: boolean,
  cascadeIndex: number
): PanelHost {
  const panel = document.createElement('div');
  panel.className = 'udt-panel';

  const bar = document.createElement('div');
  bar.className = 'udt-panel-title';
  const titleText = document.createElement('span');
  titleText.className = 'udt-panel-title-text';
  titleText.textContent = title;
  const collapseBtn = makeButton('—', 'udt-panel-collapse');
  const closeBtn = makeButton('×', 'udt-panel-close');
  bar.append(titleText, collapseBtn, closeBtn);

  const body = document.createElement('div');
  body.className = 'udt-panel-body';

  panel.append(bar, body);
  parent.appendChild(panel);

  if (floating) {
    panel.style.position = 'absolute';
    applyPlacement(panel, placement, cascadeIndex);
    makeDraggable(panel, bar);
  }

  collapseBtn.addEventListener('click', () => {
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? '' : 'none';
    collapseBtn.textContent = collapsed ? '—' : '+';
  });

  const setVisible = (on: boolean): void => {
    panel.style.display = on ? '' : 'none';
  };
  closeBtn.addEventListener('click', () => setVisible(false));

  return {
    root: panel,
    body,
    setVisible,
    destroy() {
      // Lets panel content tear down its store/controller subscriptions.
      body.dispatchEvent(new Event('udt-detach'));
      panel.remove();
    },
  };
}

function applyPlacement(
  panel: HTMLElement,
  placement: PanelPlacement | undefined,
  cascadeIndex: number
): void {
  if (placement && (placement.x != null || placement.y != null)) {
    panel.style.left = `${placement.x ?? 12}px`;
    panel.style.top = `${placement.y ?? 12}px`;
    return;
  }
  const inset = 12 + cascadeIndex * 16;
  const corner = placement?.corner ?? 'tl';
  if (corner === 'tl' || corner === 'bl') panel.style.left = `${inset}px`;
  else panel.style.right = `${inset}px`;
  if (corner === 'tl' || corner === 'tr') panel.style.top = `${inset}px`;
  else panel.style.bottom = `${inset}px`;
}

/** Delta-based mouse drag (jsdom-testable; jsdom has no `PointerEvent`). */
function makeDraggable(panel: HTMLElement, handle: HTMLElement): void {
  handle.classList.add('udt-panel-drag');
  handle.addEventListener('mousedown', (down: MouseEvent) => {
    if ((down.target as HTMLElement)?.tagName === 'BUTTON') return;
    down.preventDefault();
    // Switch to left/top positioning (clear any corner anchors) from the current spot.
    const startLeft = parseFloat(panel.style.left) || panel.offsetLeft || 0;
    const startTop = parseFloat(panel.style.top) || panel.offsetTop || 0;
    panel.style.right = '';
    panel.style.bottom = '';
    const startX = down.clientX;
    const startY = down.clientY;
    const move = (e: MouseEvent): void => {
      panel.style.left = `${startLeft + (e.clientX - startX)}px`;
      panel.style.top = `${startTop + (e.clientY - startY)}px`;
    };
    const up = (): void => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// ── Palette ───────────────────────────────────────────────────────────────────

type AddKind = 'hero' | 'foe' | 'adversary' | 'marker' | 'skull' | 'monument';

function buildPalette(
  body: HTMLElement,
  controller: BoardStateController,
  locationPick: LocationPickStore | undefined,
  rosters: BoardUIRosters,
  genId: (kind: 'foe', state: BoardState) => string
): void {
  const kindSelect = makeSelect(
    [
      { value: 'hero', label: 'Hero' },
      { value: 'foe', label: 'Foe' },
      { value: 'adversary', label: 'Adversary' },
      { value: 'marker', label: 'Space marker' },
      { value: 'skull', label: 'Skull' },
      { value: 'monument', label: 'Monument' },
    ],
    'udt-palette-kind'
  );

  // Per-kind detail controls (shown/hidden by the kind selector).
  const heroSelect = makeSelect(
    rosters.heroes.map((h) => ({ value: h.id, label: h.name })),
    'udt-palette-hero'
  );
  const heroRow = fieldRow('Hero', heroSelect);

  const foeType = makeFoeSelect(rosters.foes, 'udt-palette-foe-type');
  const foeStatus = makeSelect(
    FOE_STATUSES.map((s) => ({ value: s, label: s })),
    'udt-palette-foe-status'
  );
  const foeRow = fieldRow('Type', foeType, 'Status', foeStatus);

  const adversaryId = makeSelect(
    rosters.adversaries.map((a) => ({ value: a, label: a })),
    'udt-palette-adversary-id'
  );
  const adversaryRow = fieldRow('Adversary', adversaryId);

  const markerSelect = makeSelect(
    rosters.markers.map((m) => ({ value: m, label: m })),
    'udt-palette-marker'
  );
  const markerCustom = document.createElement('input');
  markerCustom.type = 'text';
  markerCustom.placeholder = 'custom…';
  markerCustom.className = 'udt-palette-marker-custom';
  const markerRow = fieldRow('Marker', markerSelect, '', markerCustom);

  // Monuments sit on a building (setMonument), so the kind targets building spaces only.
  const monumentSelect = makeSelect(
    rosters.monuments.map((m) => ({ value: m.id, label: m.name })),
    'udt-palette-monument'
  );
  const monumentCustom = document.createElement('input');
  monumentCustom.type = 'text';
  monumentCustom.placeholder = 'custom…';
  monumentCustom.className = 'udt-palette-monument-custom';
  const monumentRow = fieldRow('Monument', monumentSelect, '', monumentCustom);

  const detail = document.createElement('div');
  detail.className = 'udt-palette-detail';
  detail.append(heroRow, foeRow, adversaryRow, markerRow, monumentRow);

  const addBtn = makeButton('Add', 'udt-palette-add');

  // Confirm row (revealed on Add): pick a location, then Confirm/Cancel.
  const confirmRow = document.createElement('div');
  confirmRow.className = 'udt-palette-confirm';
  confirmRow.style.display = 'none';
  const hint = document.createElement('span');
  hint.className = 'udt-palette-hint';
  let locationSelect = makeLocationSelect('all', undefined, 'udt-palette-location');
  const confirmBtn = makeButton('Confirm', 'udt-palette-confirm-btn');
  const cancelBtn = makeButton('Cancel', 'udt-palette-cancel-btn');
  confirmRow.append(hint, locationSelect, confirmBtn, cancelBtn);

  const showDetail = (): void => {
    const kind = kindSelect.value as AddKind;
    heroRow.style.display = kind === 'hero' ? '' : 'none';
    foeRow.style.display = kind === 'foe' ? '' : 'none';
    adversaryRow.style.display = kind === 'adversary' ? '' : 'none';
    markerRow.style.display = kind === 'marker' ? '' : 'none';
    monumentRow.style.display = kind === 'monument' ? '' : 'none';
  };
  kindSelect.addEventListener('change', showDetail);
  showDetail();

  const closeConfirm = (): void => {
    confirmRow.style.display = 'none';
    locationPick?.disarm();
  };

  addBtn.addEventListener('click', () => {
    const kind = kindSelect.value as AddKind;
    const targets: PendingPlacement['targets'] =
      kind === 'skull' || kind === 'monument' ? 'buildings' : 'all';
    const label = placementLabel(kind, {
      hero: optionText(heroSelect),
      foe: foeType.value,
      adversary: adversaryId.value,
      marker: markerValue(markerSelect, markerCustom),
      monument: monumentCustom.value.trim() || optionText(monumentSelect),
    });
    // Rebuild the location select for the right target set.
    const fresh = makeLocationSelect(targets, undefined, 'udt-palette-location');
    locationSelect.replaceWith(fresh);
    locationSelect = fresh;
    hint.textContent = locationPick
      ? `Placing ${label} — click a space or pick one, then Confirm`
      : `Placing ${label} — pick a location, then Confirm`;
    confirmRow.style.display = '';
    locationPick?.arm({ kind: toSelectionKind(kind), label, targets });
  });

  confirmBtn.addEventListener('click', () => {
    const kind = kindSelect.value as AddKind;
    const loc = locationSelect.value;
    if (!loc) return;
    const state = controller.getState();
    switch (kind) {
      case 'hero':
        // Heroes are singletons → the chosen hero's identity id is the instance id.
        controller.placeHero(heroSelect.value, loc);
        break;
      case 'foe':
        controller.spawnFoe(genId('foe', state), foeType.value, loc, foeStatus.value as FoeStatus);
        break;
      case 'adversary':
        controller.selectAdversary(adversaryId.value);
        controller.placeAdversary(loc);
        break;
      case 'marker': {
        const marker = markerValue(markerSelect, markerCustom);
        if (marker) controller.setSpaceMarker(loc, marker, true);
        break;
      }
      case 'skull':
        controller.addSkull(loc, 1);
        break;
      case 'monument': {
        const monument = markerValue(monumentSelect, monumentCustom);
        if (monument) controller.setMonument(loc, monument);
        break;
      }
    }
    closeConfirm();
  });
  cancelBtn.addEventListener('click', closeConfirm);

  // A board click (or dropdown-less host) fills the location select.
  if (locationPick) {
    const unsub = locationPick.subscribe((event) => {
      if (event.type === 'picked') locationSelect.value = event.location;
      else if (event.type === 'disarmed') confirmRow.style.display = 'none';
    });
    body.addEventListener('udt-detach', unsub as EventListener, { once: true });
  }

  const addRow = document.createElement('div');
  addRow.className = 'udt-palette-add-row';
  addRow.append(labeled('Add', kindSelect), addBtn);

  body.append(addRow, detail, confirmRow, buildSetupSection(controller, rosters));
}

function buildSetupSection(controller: BoardStateController, rosters: BoardUIRosters): HTMLElement {
  const section = document.createElement('details');
  section.className = 'udt-palette-setup';
  const summary = document.createElement('summary');
  summary.textContent = 'Setup (selections)';
  section.appendChild(summary);

  const difficulty = makeSelect(
    [{ value: '', label: '—' }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))],
    'udt-setup-difficulty'
  );
  const adversary = makeSelect(
    [{ value: '', label: '—' }, ...rosters.adversaries.map((a) => ({ value: a, label: a }))],
    'udt-setup-adversary'
  );
  const allies = textInput('allies (comma-separated)', 'udt-setup-allies');
  const foes = textInput('foes (comma-separated)', 'udt-setup-foes');
  const expansions = textInput('expansions (comma-separated)', 'udt-setup-expansions');
  const apply = makeButton('Apply selections', 'udt-setup-apply');

  apply.addEventListener('click', () => {
    const selections: NonNullable<BoardState['selections']> = {};
    if (difficulty.value) selections.difficulty = difficulty.value;
    if (adversary.value) selections.adversary = adversary.value;
    const allyList = csv(allies.value);
    const foeList = csv(foes.value);
    const expansionList = csv(expansions.value);
    if (allyList.length) selections.allies = allyList;
    if (foeList.length) selections.foes = foeList;
    if (expansionList.length) selections.expansions = expansionList;
    controller.setSelections(selections);
  });

  section.append(
    labeled('Difficulty', difficulty),
    labeled('Adversary', adversary),
    allies,
    foes,
    expansions,
    apply
  );
  return section;
}

// ── Inspector ───────────────────────────────────────────────────────────────

function buildInspector(
  body: HTMLElement,
  controller: BoardStateController,
  selection: SelectionStore
): void {
  const render = (): void => {
    body.replaceChildren();
    const sel = selection.get();
    if (!sel) {
      body.appendChild(emptyNote('No token selected.'));
      return;
    }
    const state = controller.getState();
    switch (sel.kind) {
      case 'hero':
        renderHero(body, controller, state, sel);
        break;
      case 'foe':
        renderFoe(body, controller, state, sel);
        break;
      case 'adversary':
        renderAdversary(body, controller, state);
        break;
      case 'building':
        renderBuilding(body, controller, state, sel);
        break;
      case 'marker':
        renderMarker(body, controller, state, sel);
        break;
    }
  };

  const unsubSelection = selection.subscribe(render);
  const unsubState = controller.subscribe((event) => {
    if (event.type === 'change') render();
  });
  body.addEventListener(
    'udt-detach',
    (() => {
      unsubSelection();
      unsubState();
    }) as EventListener,
    { once: true }
  );
  render();
}

function renderHero(
  body: HTMLElement,
  controller: BoardStateController,
  state: BoardState,
  sel: TokenSelection
): void {
  const hero = state.heroes[sel.id];
  if (!hero) return void body.appendChild(emptyNote('Hero no longer on the board.'));
  body.appendChild(heading(`Hero: ${sel.id}`));
  const move = makeLocationSelect('all', hero.location, 'udt-inspector-move');
  move.addEventListener('change', () => controller.moveHero(sel.id, move.value));
  body.append(labeled('Location', move), removeButton('Remove', () => controller.removeHero(sel.id)));
}

function renderFoe(
  body: HTMLElement,
  controller: BoardStateController,
  state: BoardState,
  sel: TokenSelection
): void {
  const foe = state.foes[sel.id];
  if (!foe) return void body.appendChild(emptyNote('Foe no longer on the board.'));
  body.appendChild(heading(`Foe: ${sel.id} (${foe.foe})`));
  const move = makeLocationSelect('all', foe.location, 'udt-inspector-move');
  move.addEventListener('change', () => controller.moveFoe(sel.id, move.value));
  const status = makeSelect(
    FOE_STATUSES.map((s) => ({ value: s, label: s })),
    'udt-inspector-status'
  );
  status.value = foe.status;
  status.addEventListener('change', () => controller.setFoeStatus(sel.id, status.value as FoeStatus));
  body.append(
    labeled('Location', move),
    labeled('Status', status),
    removeButton('Remove', () => controller.removeFoe(sel.id))
  );
}

function renderAdversary(body: HTMLElement, controller: BoardStateController, state: BoardState): void {
  const adv = state.adversary;
  if (!adv) return void body.appendChild(emptyNote('No adversary selected.'));
  body.appendChild(heading(`Adversary: ${adv.id}`));
  const move = makeLocationSelect('all', adv.location, 'udt-inspector-move');
  move.addEventListener('change', () => controller.placeAdversary(move.value));
  body.append(
    labeled('Location', move),
    removeButton('Clear', () => controller.clearAdversary())
  );
}

function renderBuilding(
  body: HTMLElement,
  controller: BoardStateController,
  state: BoardState,
  sel: TokenSelection
): void {
  const loc = sel.location || sel.id;
  const building = state.buildings[loc];
  if (!building) return void body.appendChild(emptyNote('Not a building space.'));
  body.appendChild(heading(`Building: ${loc}`));

  const count = document.createElement('span');
  count.className = 'udt-inspector-skull-count';
  count.textContent = String(building.skulls);
  const minus = makeButton('−', 'udt-inspector-skull-remove');
  minus.addEventListener('click', () => controller.removeSkull(loc, 1));
  const plus = makeButton('+', 'udt-inspector-skull-add');
  plus.addEventListener('click', () => controller.addSkull(loc, 1));
  const skullRow = document.createElement('div');
  skullRow.className = 'udt-inspector-row';
  skullRow.append(spanLabel('Skulls'), minus, count, plus);

  const destroyBtn = building.destroyed
    ? makeButton('Restore', 'udt-inspector-restore')
    : makeButton('Destroy', 'udt-inspector-destroy');
  destroyBtn.addEventListener('click', () =>
    building.destroyed ? controller.restoreBuilding(loc) : controller.destroyBuilding(loc)
  );

  const monument = document.createElement('input');
  monument.type = 'text';
  monument.placeholder = 'monument id';
  monument.className = 'udt-inspector-monument';
  monument.value = building.monument ?? '';
  const monumentSet = makeButton('Set', 'udt-inspector-monument-set');
  monumentSet.addEventListener('click', () =>
    controller.setMonument(loc, monument.value.trim() || null)
  );
  const monumentRow = document.createElement('div');
  monumentRow.className = 'udt-inspector-row';
  monumentRow.append(spanLabel('Monument'), monument, monumentSet);

  body.append(skullRow, destroyBtn, monumentRow);
}

function renderMarker(
  body: HTMLElement,
  controller: BoardStateController,
  state: BoardState,
  sel: TokenSelection
): void {
  const present = state.spaceMarkers[sel.location]?.includes(sel.id);
  if (!present) return void body.appendChild(emptyNote('Marker no longer on the board.'));
  body.appendChild(heading(`Marker: ${sel.id} @ ${sel.location}`));
  body.appendChild(
    removeButton('Remove', () => controller.setSpaceMarker(sel.location, sel.id, false))
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────

function buildSummary(body: HTMLElement, controller: BoardStateController): void {
  const table = document.createElement('table');
  table.className = 'udt-summary';
  body.appendChild(table);

  const render = (): void => {
    const state = controller.getState();
    table.replaceChildren();
    const header = document.createElement('tr');
    for (const h of ['', 'Heroes', 'Foes', 'Skulls', 'Razed', 'Markers', 'Adv'])
      header.appendChild(cell('th', h));
    table.appendChild(header);
    for (const k of KINGDOMS) {
      const row = document.createElement('tr');
      row.setAttribute('data-kingdom', k.value);
      const m = kingdomMetrics(state, k.value);
      row.appendChild(cell('th', k.label));
      row.appendChild(metricCell('heroes', m.heroes));
      row.appendChild(metricCell('foes', m.foes));
      row.appendChild(metricCell('skulls', m.skulls));
      row.appendChild(metricCell('razed', m.razed));
      row.appendChild(metricCell('markers', m.markers));
      row.appendChild(metricCell('adversary', m.adversary ? '✓' : ''));
      table.appendChild(row);
    }
  };

  const unsub = controller.subscribe((event) => {
    if (event.type === 'change') render();
  });
  body.addEventListener('udt-detach', unsub as EventListener, { once: true });
  render();
}

interface KingdomMetrics {
  heroes: number;
  foes: number;
  skulls: number;
  razed: number;
  markers: number;
  adversary: boolean;
}

function kingdomMetrics(state: BoardState, kingdom: BoardKingdom): KingdomMetrics {
  const inK = (loc: LocationName): boolean => BOARD_LOCATION_BY_NAME[loc]?.kingdom === kingdom;
  const heroes = Object.values(state.heroes).filter((h) => inK(h.location)).length;
  const foes = Object.values(state.foes).filter((f) => inK(f.location)).length;
  let skulls = 0;
  let razed = 0;
  for (const [loc, b] of Object.entries(state.buildings)) {
    if (!inK(loc)) continue;
    skulls += b.skulls;
    if (b.destroyed) razed++;
  }
  let markers = 0;
  for (const [loc, list] of Object.entries(state.spaceMarkers)) {
    if (inK(loc)) markers += list.length;
  }
  const adversary = state.adversary?.location ? inK(state.adversary.location) : false;
  return { heroes, foes, skulls, razed, markers, adversary };
}

// ── DOM helpers ────────────────────────────────────────────────────────────────

interface Choice {
  value: string;
  label: string;
}

function makeSelect(choices: Choice[], className?: string): HTMLSelectElement {
  const select = document.createElement('select');
  if (className) select.className = className;
  for (const c of choices) {
    const option = document.createElement('option');
    option.value = c.value;
    option.textContent = c.label;
    select.appendChild(option);
  }
  return select;
}

/** Foe select; tier-grouped when using the canonical UDT rosters, flat for a custom list. */
function makeFoeSelect(foes: string[], className: string): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = className;
  const tiers: { label: string; foes: readonly string[] }[] = [
    { label: 'Tier 1', foes: TIER1_FOES },
    { label: 'Tier 2', foes: TIER2_FOES },
    { label: 'Tier 3', foes: TIER3_FOES },
  ];
  const known = new Set(tiers.flatMap((t) => t.foes));
  const allCanonical = foes.every((f) => known.has(f));
  if (allCanonical) {
    for (const tier of tiers) {
      const group = document.createElement('optgroup');
      group.label = tier.label;
      for (const foe of tier.foes) {
        if (!foes.includes(foe)) continue;
        const option = document.createElement('option');
        option.value = foe;
        option.textContent = foe;
        group.appendChild(option);
      }
      if (group.childElementCount) select.appendChild(group);
    }
  } else {
    for (const foe of foes) {
      const option = document.createElement('option');
      option.value = foe;
      option.textContent = foe;
      select.appendChild(option);
    }
  }
  return select;
}

/** Location select grouped into N/E/S/W optgroups; `buildings` narrows to the 16 building spaces. */
function makeLocationSelect(
  targets: 'all' | 'buildings',
  value: string | undefined,
  className: string
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = className;
  const names = targets === 'buildings' ? BUILDING_LOCATIONS : BOARD_LOCATIONS.map((l) => l.name);
  for (const k of KINGDOMS) {
    const group = document.createElement('optgroup');
    group.label = k.label;
    for (const name of names) {
      if (BOARD_LOCATION_BY_NAME[name]?.kingdom !== k.value) continue;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      group.appendChild(option);
    }
    if (group.childElementCount) select.appendChild(group);
  }
  if (value != null) select.value = value;
  return select;
}

function makeButton(label: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  return button;
}

function removeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = makeButton(label, 'udt-inspector-remove');
  button.addEventListener('click', onClick);
  return button;
}

function textInput(placeholder: string, className: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.className = className;
  return input;
}

function labeled(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'udt-field';
  wrap.append(spanLabel(label), control);
  return wrap;
}

function fieldRow(
  label1: string,
  control1: HTMLElement,
  label2?: string,
  control2?: HTMLElement
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'udt-field-row';
  row.appendChild(labeled(label1, control1));
  if (control2) row.appendChild(label2 ? labeled(label2, control2) : control2);
  return row;
}

function spanLabel(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'udt-field-label';
  span.textContent = text;
  return span;
}

function heading(text: string): HTMLElement {
  const h = document.createElement('div');
  h.className = 'udt-inspector-heading';
  h.textContent = text;
  return h;
}

function emptyNote(text: string): HTMLElement {
  const note = document.createElement('div');
  note.className = 'udt-inspector-empty';
  note.textContent = text;
  return note;
}

function cell(tag: 'th' | 'td', text: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

function metricCell(metric: string, value: number | string): HTMLElement {
  const td = document.createElement('td');
  td.setAttribute('data-metric', metric);
  td.textContent = String(value);
  return td;
}

function csv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function markerValue(select: HTMLSelectElement, custom: HTMLInputElement): string {
  return custom.value.trim() || select.value;
}

function placementLabel(
  kind: AddKind,
  values: { hero: string; foe: string; adversary: string; marker: string; monument: string }
): string {
  switch (kind) {
    case 'hero':
      return `${values.hero} (hero)`;
    case 'foe':
      return `${values.foe} (foe)`;
    case 'adversary':
      return `${values.adversary} (adversary)`;
    case 'marker':
      return `${values.marker} (marker)`;
    case 'skull':
      return 'skull';
    case 'monument':
      return `${values.monument} (monument)`;
  }
}

function toSelectionKind(kind: AddKind): TokenSelection['kind'] {
  if (kind === 'skull' || kind === 'monument') return 'building';
  return kind; // 'hero' | 'foe' | 'adversary' | 'marker'
}

/** The display text of a `<select>`'s current option (falls back to its value). */
function optionText(select: HTMLSelectElement): string {
  return select.options[select.selectedIndex]?.text ?? select.value;
}
