/**
 * seedAnalyzer.ts — Session management, comparison logic, and auto-suggestions.
 */

import * as seedApi from 'ultimatedarktowerdata/seed';
import type { Session, SeedEntry, FieldMapping, AppState, GameConfig, GameEvent } from './types';

const STORAGE_KEY = 'seed-decoder-state';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class SeedAnalyzer {
  private state: AppState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
  }

  // ── Persistence ─────────────────────────────────────────────────────────

  private loadState(): AppState {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (json) return JSON.parse(json);
    } catch {
      /* ignore */
    }
    return { sessions: [], activeSessionId: null, fieldMappings: [] };
  }

  private saveState(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach((fn) => fn());
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  getState(): AppState {
    return this.state;
  }

  // ── Session Management ──────────────────────────────────────────────────

  createSession(name: string, baselineSeed: string, config: GameConfig): Session {
    const seed = seedApi.validateSeed(baselineSeed);
    const session: Session = {
      id: generateId(),
      name,
      created: Date.now(),
      baseline: { id: generateId(), seed, timestamp: Date.now() },
      baselineConfig: config,
      variants: [],
      events: [],
    };
    this.state.sessions.push(session);
    this.state.activeSessionId = session.id;
    this.saveState();
    return session;
  }

  updateBaselineConfig(config: GameConfig): void {
    const session = this.getActiveSession();
    if (!session) return;
    session.baselineConfig = config;
    this.saveState();
  }

  getActiveSession(): Session | null {
    if (!this.state.activeSessionId) return null;
    return this.state.sessions.find((s) => s.id === this.state.activeSessionId) ?? null;
  }

  setActiveSession(id: string): void {
    this.state.activeSessionId = id;
    this.saveState();
  }

  deleteSession(id: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.id !== id);
    if (this.state.activeSessionId === id) {
      this.state.activeSessionId = this.state.sessions[0]?.id ?? null;
    }
    this.saveState();
  }

  addVariant(seedStr: string, changedField?: string, changedValue?: string): SeedEntry {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active session');
    const seed = seedApi.validateSeed(seedStr);
    const entry: SeedEntry = {
      id: generateId(),
      seed,
      timestamp: Date.now(),
      changedField,
      changedValue,
    };
    session.variants.push(entry);
    this.saveState();
    return entry;
  }

  removeVariant(variantId: string): void {
    const session = this.getActiveSession();
    if (!session) return;
    session.variants = session.variants.filter((v) => v.id !== variantId);
    this.saveState();
  }

  // ── Game Events ────────────────────────────────────────────────────────

  addEvent(event: Omit<GameEvent, 'id' | 'timestamp'>): GameEvent {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active session');
    if (!session.events) session.events = [];
    const entry: GameEvent = { ...event, id: generateId(), timestamp: Date.now() };
    session.events.push(entry);
    this.saveState();
    return entry;
  }

  removeEvent(eventId: string): void {
    const session = this.getActiveSession();
    if (!session?.events) return;
    session.events = session.events.filter((e) => e.id !== eventId);
    this.saveState();
  }

  updateEvent(eventId: string, updates: Partial<Omit<GameEvent, 'id' | 'timestamp'>>): void {
    const session = this.getActiveSession();
    if (!session?.events) return;
    const event = session.events.find((e) => e.id === eventId);
    if (!event) return;
    Object.assign(event, updates);
    this.saveState();
  }

  getEvents(): GameEvent[] {
    const session = this.getActiveSession();
    return session?.events ?? [];
  }

  // ── Comparison ──────────────────────────────────────────────────────────

  compareToBaseline(variantSeed: string): seedApi.SeedComparison | null {
    const session = this.getActiveSession();
    if (!session?.baseline) return null;
    return seedApi.compareSeedsRaw(session.baseline.seed, variantSeed);
  }

  /**
   * Auto-suggest which character indices changed based on all variants that changed
   * the same field. Returns the set of setup char indices that changed.
   */
  suggestMapping(fieldName: string): { charIndices: number[] } | null {
    const session = this.getActiveSession();
    if (!session?.baseline) return null;

    const relevant = session.variants.filter((v) => v.changedField === fieldName);
    if (relevant.length === 0) return null;

    const allDiffs = relevant.map((v) => seedApi.compareSeedsRaw(session.baseline!.seed, v.seed));

    // Union of all setup char indices that changed
    const changedIndices = new Set<number>();
    for (const comp of allDiffs) {
      for (const d of comp.setupDiffs) {
        changedIndices.add(d.charIndex);
      }
    }

    if (changedIndices.size === 0) return null;

    return { charIndices: [...changedIndices].sort((a, b) => a - b) };
  }

  // ── Field Mappings ────────────────────────────────────────────────────

  getFieldMappings(): FieldMapping[] {
    return this.state.fieldMappings;
  }

  addFieldMapping(mapping: FieldMapping): void {
    const existing = this.state.fieldMappings.findIndex((m) => m.name === mapping.name);
    if (existing >= 0) {
      this.state.fieldMappings[existing] = mapping;
    } else {
      this.state.fieldMappings.push(mapping);
    }
    this.saveState();
  }

  removeFieldMapping(name: string): void {
    this.state.fieldMappings = this.state.fieldMappings.filter((m) => m.name !== name);
    this.saveState();
  }

  // ── Dump / Analysis Helpers ────────────────────────────────────────────

  dumpChars(seed: string) {
    return seedApi.dumpSeedChars(seed);
  }

  decode(seed: string) {
    return seedApi.decodeSeed(seed);
  }

  // ── Import / Export ────────────────────────────────────────────────────

  exportJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(json: string): void {
    const parsed = JSON.parse(json);
    this.state = parsed;
    this.saveState();
  }
}
