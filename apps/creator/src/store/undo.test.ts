// Store-level tests for undo/redo (apps quality plan, item 5).
//
// schemaDoc is already immutable and structurally shared — every mutator produces a new top-level
// object rather than mutating in place — so undo/redo is just a bounded array of past/future
// schemaDoc references, pushed by the shared commitDoc/commitDocOnly/commitLibrary tail. These tests
// pin the stack semantics: push-on-edit, pop-on-undo/redo, redo-branch-clears-on-new-edit, coalescing
// of rapid edits (so undoing a typed label doesn't take one Undo per keystroke), and reset on
// loadScenario/clearScenario.
//
// Edits that should count as SEPARATE undo steps use fake timers to step past UNDO_COALESCE_MS
// between them — otherwise two calls in the same synchronous tick (as a real burst of keystrokes
// would be) coalesce into one entry by design.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCreatorStore, UNDO_COALESCE_MS } from './index';
import { scaffoldScenario } from '../utils/scaffold';
import type { ScenarioDoc } from '../types';

function scaffold(title = 'Undo test'): ScenarioDoc {
  return scaffoldScenario({
    title,
    designer: 'Test',
    mode: 'coop',
    difficultyProfile: 'heroic',
    skullSupply: 30,
    monthEndMin: 5,
    monthEndMax: 8,
  });
}

const store = () => useCreatorStore.getState();
const entryLabel = () => store().schemaDoc?.graph.nodes.find((n) => n.id === 'n-start')?.label;

/** Step past the coalescing window so the NEXT commit is treated as a new undo entry. */
function stepPastCoalesceWindow() {
  vi.advanceTimersByTime(UNDO_COALESCE_MS + 50);
}

beforeEach(() => {
  vi.useFakeTimers();
  store().clearScenario();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('undo/redo', () => {
  it('undo/redo are no-ops on an empty stack (and with no scenario loaded)', () => {
    expect(() => store().undo()).not.toThrow();
    expect(() => store().redo()).not.toThrow();
    expect(store().schemaDoc).toBeNull();

    store().loadScenario(scaffold(), false);
    expect(store().undoStack).toEqual([]);
    expect(() => store().undo()).not.toThrow();
    expect(entryLabel()).toBeUndefined();
  });

  it('a node mutation pushes the pre-edit doc, and undo restores it', () => {
    store().loadScenario(scaffold(), false);
    const before = store().schemaDoc;

    store().updateNodeLabel('n-start', 'Renamed');
    expect(entryLabel()).toBe('Renamed');
    expect(store().undoStack).toEqual([before]);
    expect(store().isDirty).toBe(true);

    store().undo();
    expect(entryLabel()).toBeUndefined();
    expect(store().schemaDoc).toBe(before);
    expect(store().undoStack).toEqual([]);
  });

  it('redo re-applies an undone edit', () => {
    store().loadScenario(scaffold(), false);
    store().updateNodeLabel('n-start', 'Renamed');
    const afterEdit = store().schemaDoc;

    store().undo();
    expect(store().redoStack).toEqual([afterEdit]);

    store().redo();
    expect(entryLabel()).toBe('Renamed');
    expect(store().schemaDoc).toBe(afterEdit);
    expect(store().redoStack).toEqual([]);
  });

  it('a new edit after undo discards the redo branch', () => {
    store().loadScenario(scaffold(), false);
    store().updateNodeLabel('n-start', 'First');
    store().undo();
    expect(store().redoStack).toHaveLength(1);

    store().updateNodeLabel('n-start', 'Second');
    expect(store().redoStack).toEqual([]);
    expect(entryLabel()).toBe('Second');

    // The discarded "First" branch is gone — redo cannot bring it back.
    store().undo();
    expect(entryLabel()).toBeUndefined();
    store().redo();
    expect(entryLabel()).toBe('Second');
  });

  it('walks back through several DISTINCT edits in order (LIFO)', () => {
    store().loadScenario(scaffold(), false);
    stepPastCoalesceWindow();
    store().updateNodeLabel('n-start', 'A');
    stepPastCoalesceWindow();
    store().updateNodeLabel('n-start', 'B');
    stepPastCoalesceWindow();
    store().updateNodeLabel('n-start', 'C');
    expect(entryLabel()).toBe('C');

    store().undo();
    expect(entryLabel()).toBe('B');
    store().undo();
    expect(entryLabel()).toBe('A');
    store().undo();
    expect(entryLabel()).toBeUndefined();
    expect(store().undoStack).toEqual([]);
  });

  it('coalesces rapid edits (e.g. keystrokes) within the window into ONE undo entry', () => {
    store().loadScenario(scaffold(), false);
    const before = store().schemaDoc;

    // Simulates typing "Renamed" one keystroke at a time — each commits, but all land inside one
    // coalescing window, so this must NOT produce 7 separate undo steps.
    for (const partial of ['R', 'Re', 'Ren', 'Rena', 'Renam', 'Rename', 'Renamed']) {
      store().updateNodeLabel('n-start', partial);
    }

    expect(entryLabel()).toBe('Renamed');
    expect(store().undoStack).toEqual([before]);

    store().undo();
    expect(entryLabel()).toBeUndefined();
    expect(store().schemaDoc).toBe(before);
  });

  it('undo/redo always start a fresh burst — an edit right after does not coalesce into it', () => {
    store().loadScenario(scaffold(), false);
    stepPastCoalesceWindow();
    store().updateNodeLabel('n-start', 'A');
    stepPastCoalesceWindow();
    store().updateNodeLabel('n-start', 'B');
    const afterB = store().schemaDoc;

    store().undo(); // -> A
    // No time advance: this edit follows undo() immediately, as a user's next keystroke would.
    store().updateNodeLabel('n-start', 'A2');
    expect(entryLabel()).toBe('A2');

    // If undo() hadn't reset the burst tracker, this commit would have coalesced with whatever
    // burst was active before undo() ran, leaving the stack pointed at the WRONG "before" state.
    store().undo();
    expect(entryLabel()).toBe('A');
    expect(store().schemaDoc).not.toBe(afterB);
  });

  it('loadScenario resets both stacks', () => {
    store().loadScenario(scaffold('First'), false);
    store().updateNodeLabel('n-start', 'Renamed');
    store().undo();
    expect(store().redoStack.length).toBeGreaterThan(0);

    store().loadScenario(scaffold('Second'), false);
    expect(store().undoStack).toEqual([]);
    expect(store().redoStack).toEqual([]);
  });

  it('clearScenario resets both stacks', () => {
    store().loadScenario(scaffold(), false);
    store().updateNodeLabel('n-start', 'Renamed');
    expect(store().undoStack.length).toBeGreaterThan(0);

    store().clearScenario();
    expect(store().undoStack).toEqual([]);
    expect(store().redoStack).toEqual([]);
  });

  it('commitDocOnly-routed edits (scenario-wide, non-node-scoped) are undoable', () => {
    store().loadScenario(scaffold(), false);
    const before = store().schemaDoc;

    store().updateScenarioDescription('A new description');
    expect(store().schemaDoc?.meta.description).toBe('A new description');
    expect(store().undoStack).toEqual([before]);

    store().undo();
    expect(store().schemaDoc).toBe(before);
    expect(store().schemaDoc?.meta.description).toBeUndefined();
  });

  it('commitLibrary-routed edits (library mutators) are undoable', () => {
    store().loadScenario(scaffold(), false);
    const before = store().schemaDoc;

    store().updateLibraryCards({ 'card-1': { id: 'card-1' } });
    expect(store().schemaDoc?.library?.cards).toBeDefined();
    expect(store().undoStack).toEqual([before]);

    store().undo();
    expect(store().schemaDoc).toBe(before);
    expect(store().schemaDoc?.library?.cards).toBeUndefined();
  });

  it('bounds the stack depth (UNDO_LIMIT) rather than growing unboundedly', () => {
    store().loadScenario(scaffold(), false);
    for (let i = 0; i < 105; i++) {
      stepPastCoalesceWindow();
      store().updateNodeLabel('n-start', `Label ${i}`);
    }
    expect(store().undoStack.length).toBe(100);
  });
});
