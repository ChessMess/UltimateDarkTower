/**
 * app.ts — Main app controller for the Seed Decoder web app.
 */

import { SeedAnalyzer } from './seedAnalyzer';
import { BitMapDisplay } from './bitMapDisplay';
import { FieldMapper } from './fieldMapper';
import { generateLLMPrompt } from './llmExport';
import {
  CHANGEABLE_FIELDS,
  FIELD_OPTIONS,
  type ChangeableField,
  type GameConfig,
  EVENT_TYPES,
  KINGDOMS,
  ALL_FOES,
  COMPANIONS,
  QUEST_TYPES,
  type EventType,
  type GameEvent,
} from './types';
import { seed as seedApi } from 'ultimatedarktower';

export class App {
  private analyzer: SeedAnalyzer;
  private bitMap: BitMapDisplay | null = null;
  private comparisonBitMap: BitMapDisplay | null = null;
  private fieldMapper: FieldMapper | null = null;
  private editingEventId: string | null = null;

  constructor() {
    this.analyzer = new SeedAnalyzer();
  }

  init(): void {
    this.bitMap = new BitMapDisplay(document.getElementById('bitmap-display')!);
    this.comparisonBitMap = new BitMapDisplay(document.getElementById('comparison-bitmap')!);
    this.fieldMapper = new FieldMapper(document.getElementById('field-mappings')!, this.analyzer);

    this.analyzer.onChange(() => this.refresh());

    this.buildBaselineConfigForm();
    this.setupSeedEntry();
    this.setupSessionList();
    this.setupVariantForm();
    this.setupEventForm();
    this.setupExportButtons();
    this.refresh();
  }

  // ── Baseline Config Form (in the "New Baseline" card) ─────────────────

  private buildBaselineConfigForm(): void {
    const container = document.getElementById('baseline-config-form')!;
    container.innerHTML = '';

    // Build two-column rows of selects for all config fields
    const grid = document.createElement('div');
    grid.className = 'config-grid';

    for (const field of CHANGEABLE_FIELDS) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      const label = document.createElement('label');
      label.textContent = field;
      label.setAttribute('for', `baseline-cfg-${field}`);
      const select = document.createElement('select');
      select.id = `baseline-cfg-${field}`;
      for (const val of FIELD_OPTIONS[field]) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      }
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      grid.appendChild(wrapper);
    }

    container.appendChild(grid);
  }

  /** Read the current values from the baseline config form selects. */
  private readBaselineConfigForm(): GameConfig {
    const config: GameConfig = {};
    for (const field of CHANGEABLE_FIELDS) {
      const select = document.getElementById(`baseline-cfg-${field}`) as HTMLSelectElement | null;
      if (select) config[field] = select.value;
    }
    return config;
  }

  // ── Seed Entry Panel ──────────────────────────────────────────────────

  private setupSeedEntry(): void {
    const input = document.getElementById('seed-input') as HTMLInputElement;
    const status = document.getElementById('seed-status')!;
    const newBaselineBtn = document.getElementById('new-baseline-btn')!;

    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (!raw) {
        status.textContent = '';
        status.className = 'seed-status';
        return;
      }
      try {
        const normalized = seedApi.validateSeed(raw);
        status.textContent = `Valid: ${normalized}`;
        status.className = 'seed-status valid';
      } catch {
        status.textContent = 'Invalid seed format';
        status.className = 'seed-status invalid';
      }
    });

    newBaselineBtn.addEventListener('click', () => {
      const raw = input.value.trim();
      if (!raw) return;
      try {
        const config = this.readBaselineConfigForm();
        const name = `Session ${this.analyzer.getState().sessions.length + 1}`;
        this.analyzer.createSession(name, raw, config);
        input.value = '';
        status.textContent = '';
      } catch (e) {
        status.textContent = String(e instanceof Error ? e.message : e);
        status.className = 'seed-status invalid';
      }
    });
  }

  // ── Variant Form ──────────────────────────────────────────────────────

  private setupVariantForm(): void {
    const addVariantBtn = document.getElementById('add-variant-btn')!;
    const variantInput = document.getElementById('variant-input') as HTMLInputElement;
    const fieldSelect = document.getElementById('field-select') as HTMLSelectElement;
    const valueSelect = document.getElementById('value-select') as HTMLSelectElement;
    const suggestBtn = document.getElementById('suggest-mapping-btn')!;

    // Populate field select
    for (const field of CHANGEABLE_FIELDS) {
      const opt = document.createElement('option');
      opt.value = field;
      opt.textContent = field;
      fieldSelect.appendChild(opt);
    }

    const updateValueAndSummary = () => {
      const field = fieldSelect.value as ChangeableField;
      this.populateValueSelect(field, valueSelect);
      this.updateChangeSummary();
    };

    fieldSelect.addEventListener('change', updateValueAndSummary);
    valueSelect.addEventListener('change', () => this.updateChangeSummary());
    updateValueAndSummary();

    addVariantBtn.addEventListener('click', () => {
      const raw = variantInput.value.trim();
      if (!raw) return;
      try {
        this.analyzer.addVariant(raw, fieldSelect.value, valueSelect.value);
        variantInput.value = '';
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    });

    suggestBtn.addEventListener('click', () => {
      const field = fieldSelect.value;
      const suggestion = this.analyzer.suggestMapping(field);
      if (suggestion) {
        this.analyzer.addFieldMapping({
          name: field,
          bitOffset: suggestion.charIndices[0],
          bitLength: suggestion.charIndices.length,
          confidence: 'suspected',
        });
      } else {
        alert(
          'Not enough data to suggest a mapping for this field. Add more variants that change only this field.',
        );
      }
    });
  }

  private populateValueSelect(field: ChangeableField, select: HTMLSelectElement): void {
    select.innerHTML = '';
    const options = FIELD_OPTIONS[field] ?? [];
    for (const val of options) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
  }

  /** Show "Adversary: Ashstrider → Gravemaw" style summary below the selects. */
  private updateChangeSummary(): void {
    const container = document.getElementById('variant-change-summary')!;
    const session = this.analyzer.getActiveSession();
    if (!session) {
      container.innerHTML = '';
      return;
    }

    const fieldSelect = document.getElementById('field-select') as HTMLSelectElement;
    const valueSelect = document.getElementById('value-select') as HTMLSelectElement;
    const field = fieldSelect.value as ChangeableField;
    const newValue = valueSelect.value;
    const baselineValue = session.baselineConfig[field];

    if (baselineValue && baselineValue !== newValue) {
      container.innerHTML = `<span class="change-from">${baselineValue}</span> <span class="change-arrow">&rarr;</span> <span class="change-to">${newValue}</span>`;
    } else if (baselineValue && baselineValue === newValue) {
      container.innerHTML = `<span class="change-same">Same as baseline (${baselineValue})</span>`;
    } else {
      container.innerHTML = '';
    }
  }

  // ── Game Events ─────────────────────────────────────────────────────

  private setupEventForm(): void {
    const typeSelect = document.getElementById('event-type') as HTMLSelectElement;
    const addBtn = document.getElementById('add-event-btn')!;

    // Populate event type dropdown
    for (const t of EVENT_TYPES) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    }

    typeSelect.addEventListener('change', () => this.updateEventContextFields());
    this.updateEventContextFields();

    addBtn.addEventListener('click', () => {
      const month =
        parseInt((document.getElementById('event-month') as HTMLInputElement).value, 10) || 1;
      const turnRaw = (document.getElementById('event-turn') as HTMLInputElement).value.trim();
      const turnParsed = turnRaw !== '' ? parseInt(turnRaw, 10) : undefined;
      const turn = turnParsed !== undefined && !isNaN(turnParsed) ? turnParsed : undefined;
      const type = typeSelect.value as EventType;
      const notes =
        (document.getElementById('event-notes') as HTMLInputElement).value.trim() || undefined;

      const kingdomSelect = document.getElementById('event-kingdom') as HTMLSelectElement | null;
      const foeSelect = document.getElementById('event-foe') as HTMLSelectElement | null;
      const companionSelect = document.getElementById(
        'event-companion',
      ) as HTMLSelectElement | null;
      const questTypeSelect = document.getElementById(
        'event-quest-type',
      ) as HTMLSelectElement | null;

      const kingdom = (kingdomSelect?.value || undefined) as GameEvent['kingdom'];
      const foe = foeSelect?.value || undefined;
      const companion = companionSelect?.value || undefined;
      const questType = (questTypeSelect?.value || undefined) as GameEvent['questType'];

      if (this.editingEventId) {
        this.analyzer.updateEvent(this.editingEventId, {
          month,
          turn,
          type,
          kingdom,
          foe,
          companion,
          questType,
          notes,
        });
        this.resetEventForm();
      } else {
        this.analyzer.addEvent({ month, turn, type, kingdom, foe, companion, questType, notes });
        (document.getElementById('event-notes') as HTMLInputElement).value = '';
      }
    });
  }

  /** Show/hide kingdom, foe, companion selects based on event type. */
  private updateEventContextFields(): void {
    const container = document.getElementById('event-context-fields')!;
    const type = (document.getElementById('event-type') as HTMLSelectElement).value as EventType;
    container.innerHTML = '';

    const needsKingdom = [
      'Foe Spawn',
      'Foe Defeated',
      'Dungeon Discovered',
      'Quest Appeared',
      'Battle',
    ].includes(type);
    const needsFoe = ['Foe Spawn', 'Foe Defeated', 'Battle'].includes(type);
    const needsCompanion = type === 'Companion Event';
    const needsQuestType = ['Quest Appeared', 'Quest Completed'].includes(type);

    if (!needsKingdom && !needsFoe && !needsCompanion && !needsQuestType) return;

    const row = document.createElement('div');
    row.className = 'field-row';

    if (needsKingdom) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.innerHTML = `<label for="event-kingdom">Kingdom</label>`;
      const select = document.createElement('select');
      select.id = 'event-kingdom';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = '—';
      select.appendChild(none);
      for (const k of KINGDOMS) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        select.appendChild(opt);
      }
      wrapper.appendChild(select);
      row.appendChild(wrapper);
    }

    if (needsFoe) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.innerHTML = `<label for="event-foe">Foe</label>`;
      const select = document.createElement('select');
      select.id = 'event-foe';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = '—';
      select.appendChild(none);
      for (const f of ALL_FOES) {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        select.appendChild(opt);
      }
      wrapper.appendChild(select);
      row.appendChild(wrapper);
    }

    if (needsCompanion) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.innerHTML = `<label for="event-companion">Companion</label>`;
      const select = document.createElement('select');
      select.id = 'event-companion';
      for (const c of COMPANIONS) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
      }
      wrapper.appendChild(select);
      row.appendChild(wrapper);
    }

    if (needsQuestType) {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.innerHTML = `<label for="event-quest-type">Quest Type</label>`;
      const select = document.createElement('select');
      select.id = 'event-quest-type';
      for (const qt of QUEST_TYPES) {
        const opt = document.createElement('option');
        opt.value = qt;
        opt.textContent = qt;
        select.appendChild(opt);
      }
      wrapper.appendChild(select);
      row.appendChild(wrapper);
    }

    container.appendChild(row);
  }

  private renderEventLog(): void {
    const container = document.getElementById('event-log')!;
    const events = this.analyzer.getEvents();
    container.innerHTML = '';

    if (events.length === 0) {
      container.innerHTML =
        '<p class="empty-msg">No events recorded yet. Start the game and log what happens.</p>';
      return;
    }

    // Group events by month
    const byMonth = new Map<number, typeof events>();
    for (const e of events) {
      const list = byMonth.get(e.month) ?? [];
      list.push(e);
      byMonth.set(e.month, list);
    }

    for (const [month, monthEvents] of [...byMonth.entries()].sort((a, b) => a[0] - b[0])) {
      const group = document.createElement('div');
      group.className = 'event-month-group';
      group.innerHTML = `<div class="event-month-header">Month ${month}</div>`;

      for (const e of monthEvents) {
        const parts: string[] = [e.type];
        if (e.questType) parts.push(`(${e.questType})`);
        if (e.foe) parts.push(e.foe);
        if (e.kingdom) parts.push(`in ${e.kingdom}`);
        if (e.companion) parts.push(e.companion);
        const turnLabel = e.turn != null ? `T${e.turn} ` : '';
        const summary = turnLabel + parts.join(' — ');

        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
          <div class="event-info">
            <span class="event-type-badge">${e.type}</span>
            <span class="event-detail">${summary}${e.notes ? ` <span class="event-notes">${e.notes}</span>` : ''}</span>
          </div>
          <div class="event-actions">
            <button class="btn-icon" data-edit-event="${e.id}" title="Edit event">&#9998;</button>
            <button class="btn-icon btn-danger" data-remove-event="${e.id}" title="Delete event">&times;</button>
          </div>
        `;
        group.appendChild(item);
      }

      container.appendChild(group);
    }

    container.querySelectorAll('[data-edit-event]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventId = (btn as HTMLElement).dataset.editEvent!;
        const event = this.analyzer.getEvents().find((e) => e.id === eventId);
        if (event) this.populateFormForEdit(event);
      });
    });

    container.querySelectorAll('[data-remove-event]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventId = (btn as HTMLElement).dataset.removeEvent!;
        if (this.editingEventId === eventId) this.resetEventForm();
        this.analyzer.removeEvent(eventId);
      });
    });
  }

  private resetEventForm(): void {
    this.editingEventId = null;
    const btn = document.getElementById('add-event-btn')!;
    btn.textContent = 'Add Event';
    document.getElementById('cancel-edit-btn')?.remove();
    (document.getElementById('event-notes') as HTMLInputElement).value = '';
    document.getElementById('events-panel')!.classList.remove('editing');
  }

  private populateFormForEdit(event: GameEvent): void {
    this.editingEventId = event.id;

    (document.getElementById('event-month') as HTMLInputElement).value = String(event.month);
    (document.getElementById('event-turn') as HTMLInputElement).value =
      event.turn != null ? String(event.turn) : '';
    (document.getElementById('event-type') as HTMLSelectElement).value = event.type;

    // Regenerate context fields for the event type, then populate them
    this.updateEventContextFields();

    const kingdomSelect = document.getElementById('event-kingdom') as HTMLSelectElement | null;
    if (kingdomSelect) kingdomSelect.value = event.kingdom ?? '';
    const foeSelect = document.getElementById('event-foe') as HTMLSelectElement | null;
    if (foeSelect) foeSelect.value = event.foe ?? '';
    const companionSelect = document.getElementById('event-companion') as HTMLSelectElement | null;
    if (companionSelect) companionSelect.value = event.companion ?? '';
    const questTypeSelect = document.getElementById('event-quest-type') as HTMLSelectElement | null;
    if (questTypeSelect) questTypeSelect.value = event.questType ?? '';

    (document.getElementById('event-notes') as HTMLInputElement).value = event.notes ?? '';

    const addBtn = document.getElementById('add-event-btn')!;
    addBtn.textContent = 'Save Edit';

    if (!document.getElementById('cancel-edit-btn')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancel-edit-btn';
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => this.resetEventForm());
      addBtn.parentElement!.insertBefore(cancelBtn, addBtn.nextSibling);
    }

    document.getElementById('events-panel')!.classList.add('editing');
    requestAnimationFrame(() => {
      document
        .getElementById('events-panel')!
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ── Session List ──────────────────────────────────────────────────────

  private setupSessionList(): void {
    // Rendered in refresh()
  }

  private renderSessionList(): void {
    const container = document.getElementById('session-list')!;
    const state = this.analyzer.getState();
    container.innerHTML = '';

    if (state.sessions.length === 0) {
      container.innerHTML =
        '<p class="empty-msg">No sessions yet. Enter a seed and click "Create Baseline Session" to start.</p>';
      return;
    }

    for (const session of state.sessions) {
      const isActive = session.id === state.activeSessionId;
      const div = document.createElement('div');
      div.className = `session-item ${isActive ? 'active' : ''}`;
      div.innerHTML = `
        <div class="session-info">
          <strong>${session.name}</strong>
          <span class="session-meta">${session.baseline?.seed ?? 'no baseline'} &mdash; ${session.variants.length} variant${session.variants.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="session-actions">
          ${!isActive ? `<button class="btn-sm" data-activate="${session.id}">Select</button>` : '<span class="active-badge">Active</span>'}
          <button class="btn-icon btn-danger" data-delete="${session.id}" title="Delete session">&times;</button>
        </div>
      `;
      container.appendChild(div);
    }

    container.querySelectorAll('[data-activate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.analyzer.setActiveSession((btn as HTMLElement).dataset.activate!);
      });
    });
    container.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this session?')) {
          this.analyzer.deleteSession((btn as HTMLElement).dataset.delete!);
        }
      });
    });
  }

  // ── Baseline Config Readout (read-only display of active session) ─────

  private renderBaselineConfigReadout(): void {
    const displayCard = document.getElementById('baseline-config-display')!;
    const readout = document.getElementById('baseline-config-readout')!;
    const session = this.analyzer.getActiveSession();

    if (!session) {
      displayCard.hidden = true;
      readout.innerHTML = '';
      return;
    }

    const config = session.baselineConfig;
    const hasConfig = Object.values(config).some(Boolean);
    if (!hasConfig) {
      displayCard.hidden = true;
      return;
    }

    displayCard.hidden = false;
    readout.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'config-readout-grid';

    for (const field of CHANGEABLE_FIELDS) {
      const value = config[field];
      if (!value) continue;
      const item = document.createElement('div');
      item.className = 'config-readout-item';
      item.innerHTML = `<span class="config-readout-label">${field}</span><span class="config-readout-value">${value}</span>`;
      grid.appendChild(item);
    }

    readout.appendChild(grid);
  }

  // ── Variant History ───────────────────────────────────────────────────

  private renderVariantHistory(): void {
    const container = document.getElementById('variant-history')!;
    const session = this.analyzer.getActiveSession();
    container.innerHTML = '';

    if (!session || session.variants.length === 0) {
      container.innerHTML = '<p class="empty-msg">No variants added yet.</p>';
      return;
    }

    for (const v of session.variants) {
      const comp = session.baseline ? seedApi.compareSeedsRaw(session.baseline.seed, v.seed) : null;
      const baselineValue = v.changedField
        ? session.baselineConfig[v.changedField as ChangeableField]
        : null;
      const changeLabel = baselineValue
        ? `${v.changedField}: ${baselineValue} → ${v.changedValue ?? '?'}`
        : `${v.changedField ?? '?'} → ${v.changedValue ?? '?'}`;

      const div = document.createElement('div');
      div.className = 'variant-item';
      div.innerHTML = `
        <div class="variant-info">
          <code>${v.seed}</code>
          <span class="variant-meta">${changeLabel}${comp ? ` (${comp.diffs.length} chars changed)` : ''}</span>
        </div>
        <div class="variant-actions">
          <button class="btn-sm" data-compare="${v.seed}">Compare</button>
          <button class="btn-icon btn-danger" data-remove-variant="${v.id}">&times;</button>
        </div>
      `;
      container.appendChild(div);
    }

    container.querySelectorAll('[data-compare]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.showComparison((btn as HTMLElement).dataset.compare!);
      });
    });
    container.querySelectorAll('[data-remove-variant]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.analyzer.removeVariant((btn as HTMLElement).dataset.removeVariant!);
      });
    });
  }

  // ── Comparison View ───────────────────────────────────────────────────

  private showComparison(variantSeed: string): void {
    const comp = this.analyzer.compareToBaseline(variantSeed);
    if (!comp || !this.comparisonBitMap) return;

    const dump = seedApi.dumpSeedChars(variantSeed);
    this.comparisonBitMap.render({
      chars: dump.chars,
      fieldMappings: this.analyzer.getFieldMappings(),
      changedChars: comp.diffs,
    });

    const info = document.getElementById('comparison-info')!;
    info.innerHTML = `
      <div class="comparison-summary">
        <div><span class="section-label">Baseline</span> <code>${comp.seed1}</code></div>
        <div><span class="section-label">Variant</span> <code>${comp.seed2}</code></div>
        <div><span class="section-label">Chars Changed</span> <strong>${comp.diffs.length}</strong> (setup: ${comp.setupDiffs.length}, rng: ${comp.rngDiffs.length})</div>
        <div class="diff-detail">${comp.diffs.map((d) => `[${d.charIndex}]: ${d.char1}→${d.char2}`).join(', ') || 'None'}</div>
      </div>
    `;

    document.getElementById('comparison-section')!.hidden = false;
  }

  // ── Export Buttons ────────────────────────────────────────────────────

  private setupExportButtons(): void {
    document.getElementById('copy-llm-btn')!.addEventListener('click', () => {
      const session = this.analyzer.getActiveSession();
      if (!session) {
        alert('No active session');
        return;
      }
      const prompt = generateLLMPrompt(session, this.analyzer.getFieldMappings());
      navigator.clipboard.writeText(prompt).then(
        () => {
          const btn = document.getElementById('copy-llm-btn')!;
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = original), 2000);
        },
        () => alert('Failed to copy to clipboard'),
      );
    });

    document.getElementById('export-json-btn')!.addEventListener('click', () => {
      const json = this.analyzer.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seed-decoder-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('import-json-btn')!.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            this.analyzer.importJSON(reader.result as string);
          } catch (e) {
            alert('Failed to import: ' + (e instanceof Error ? e.message : String(e)));
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });
  }

  // ── Refresh ───────────────────────────────────────────────────────────

  private refresh(): void {
    this.renderSessionList();
    this.renderBaselineConfigReadout();
    this.renderVariantHistory();
    this.fieldMapper?.render();
    this.updateChangeSummary();

    const session = this.analyzer.getActiveSession();

    // Show/hide event and variant panels
    const eventsPanel = document.getElementById('events-panel')!;
    eventsPanel.hidden = !session;
    if (session) this.renderEventLog();

    const variantPanel = document.getElementById('variant-panel')!;
    variantPanel.hidden = !session;

    // Render baseline bitmap
    if (session?.baseline && this.bitMap) {
      const dump = seedApi.dumpSeedChars(session.baseline.seed);
      this.bitMap.render({
        chars: dump.chars,
        fieldMappings: this.analyzer.getFieldMappings(),
      });
    } else {
      this.bitMap?.clear();
    }

    // Hide comparison when switching sessions
    document.getElementById('comparison-section')!.hidden = true;
    this.comparisonBitMap?.clear();
    document.getElementById('comparison-info')!.innerHTML = '';
  }
}
