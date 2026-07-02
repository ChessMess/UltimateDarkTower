import { useState, useCallback, useEffect, useRef } from 'react';
import {
  init,
  step,
  type Input,
  type InputRequest,
  type ActionChoice,
  type EngineState,
  type Directive,
  type StepResult,
} from '@udtc/engine';
import { createResolver, createDisplayAdapter, createBoardAdapter } from '@udtc/adapters';
import { useCreatorStore } from '../store';
import type { ScenarioDoc } from '../types';

interface StepEntry {
  stepIndex: number;
  status: string;
  awaitingId?: string;
  dispatched: number;
  corruption: number;
  supply: number;
  month: number;
  turn: number;
}

// Guard against a scenario graph that loops without progressing. Real scenarios finish in
// well under ~100 input boundaries (≤6 months × a few turns × 2 boundaries/turn).
const AUTO_RUN_CAP = 2000;

// Build a safe, non-faulting default Input for an awaiting request (see plan §1). Defaults are
// verified against the engine's resume() handlers — every branch either advances or exits cleanly.
function defaultInputFor(awaiting: InputRequest, state: EngineState): Input {
  switch (awaiting.id) {
    case 'action': {
      const opts = awaiting.options?.map((o) => o.id) ?? [];
      // legacy loop: 'pass' is the safe no-op; full-turn loop: 'endTurn' is (quest would fault
      // without a questId, and everything else burns a latch without progressing the walk).
      const value = (opts.includes('pass')
        ? 'pass'
        : opts.includes('endTurn')
          ? 'endTurn'
          : (opts[0] ?? 'pass')) as ActionChoice;
      return { requestId: 'action', value, kind: 'decision' };
    }
    case 'skullCounter':
      return { requestId: 'skullCounter', value: 0, kind: 'observed' };
    case 'target': {
      const adv = state.adversary;
      if (adv?.spawned && !adv.defeated) {
        return { requestId: 'target', value: { adversary: true }, kind: 'decision' };
      }
      const foe = state.foes.find((f) => f.location != null) ?? state.foes[0];
      return { requestId: 'target', value: foe ? { foeId: foe.foeId } : {}, kind: 'decision' };
    }
    case 'advantageSpend':
      return { requestId: 'advantageSpend', value: { retreat: true }, kind: 'decision' };
    case 'trade': {
      // An empty trade faults (applyTrade dereferences unknown heroes); a self-trade is a no-op.
      const hero = state.clock.activeHero;
      return { requestId: 'trade', value: { from: hero, to: hero }, kind: 'decision' };
    }
    case 'moveTarget':
      return {
        requestId: 'moveTarget',
        value: { to: state.heroes[state.clock.activeHero]?.location ?? null },
        kind: 'decision',
      };
    case 'dungeonRoomAdvantage':
      return { requestId: 'dungeonRoomAdvantage', value: { improve: false }, kind: 'decision' };
    case 'dungeonMove':
      return { requestId: 'dungeonMove', value: { leave: true }, kind: 'decision' };
  }
}

// Resolve one input boundary with a default and step the engine forward.
function advance(state: EngineState, awaiting: InputRequest): StepResult {
  return step(state, defaultInputFor(awaiting, state));
}

function isTerminal(status: string): boolean {
  return status === 'won' || status === 'lost' || status === 'ended';
}

// Build a trace row from a StepResult (init or step). Reads typed EngineState fields directly.
function traceRowFrom(result: StepResult, stepIndex: number, dispatched: number): StepEntry {
  const { state } = result;
  return {
    stepIndex,
    status: result.status,
    awaitingId: result.awaiting?.id,
    dispatched,
    corruption: state.heroes?.hero1?.corruption ?? 0,
    supply: state.skulls?.supply ?? 0,
    month: state.clock?.month ?? 1,
    turn: state.clock?.turnInMonth ?? 0,
  };
}

export function SimulatorPanel() {
  const { schemaDoc, validationResults, exportScenario } = useCreatorStore();
  const [running, setRunning] = useState(false);
  const [trace, setTrace] = useState<StepEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [lastResult, setLastResult] = useState<{ status: string; awaiting?: InputRequest } | null>(
    null,
  );

  const towerContainerRef = useRef<HTMLDivElement>(null);

  // Adapter refs — one instance per panel lifetime, disposed on unmount.
  const displayRef = useRef<ReturnType<typeof createDisplayAdapter> | null>(null);
  const boardRef = useRef<ReturnType<typeof createBoardAdapter> | null>(null);

  useEffect(() => {
    const resolver = createResolver();
    const display = createDisplayAdapter({ resolver });
    const board = createBoardAdapter();
    displayRef.current = display;
    boardRef.current = board;

    const el = towerContainerRef.current;
    if (el) {
      import('ultimatedarktowerdisplay').then(({ TowerRenderView }) => {
        const view = new TowerRenderView({
          container: el,
          renderers: ['readout', 'side-view'],
          title: 'Tower (sim)',
        });
        displayRef.current?.mount(view);
      });
    }

    return () => {
      display.dispose();
      displayRef.current = null;
      boardRef.current = null;
    };
  }, []);

  const dispatchSim = useCallback((directives: Directive[]): number => {
    const display = displayRef.current;
    const board = boardRef.current;
    let count = 0;
    for (const d of directives) {
      switch (d.type) {
        case 'tower.program':
          if (display) {
            display.program(d.ops ?? []);
            if (d.brokenSeals) display.applySeals(d.brokenSeals);
          }
          count++;
          break;
        case 'board.mutate':
          board?.mutate(d);
          count++;
          break;
        case 'ui.update':
        case 'ui.prompt':
        case 'log.entry':
        case 'media.play':
          count++;
          break;
      }
    }
    return count;
  }, []);

  const handleStart = useCallback(() => {
    if (!schemaDoc || !validationResults?.allOk) return;
    setError(null);
    setTrace([]);
    setRunning(true);

    try {
      let doc: ScenarioDoc;
      try {
        doc = JSON.parse(exportScenario()) as ScenarioDoc;
      } catch {
        doc = schemaDoc;
      }
      const resolver = createResolver();
      const result = init(doc, { seed: 'creator-sim-seed', playerCount: 1, resolver });
      setEngineState(result.state);
      setLastResult(result);
      const dispatched = dispatchSim(result.directives);
      setTrace([traceRowFrom(result, 0, dispatched)]);
      if (isTerminal(result.status)) setRunning(false);
    } catch (e) {
      setError(String(e));
      setRunning(false);
    }
  }, [schemaDoc, validationResults, exportScenario, dispatchSim]);

  // Resolve a single input boundary with a default and advance one step.
  const handleAutoStep = useCallback(() => {
    if (!engineState || !lastResult?.awaiting) return;
    try {
      const result = advance(engineState, lastResult.awaiting);
      setEngineState(result.state);
      setLastResult(result);
      const dispatched = dispatchSim(result.directives);
      setTrace((t) => [...t, traceRowFrom(result, t.length, dispatched)]);
      if (isTerminal(result.status)) setRunning(false);
    } catch (e) {
      setError(String(e));
      setRunning(false);
    }
  }, [engineState, lastResult, dispatchSim]);

  // Drive the engine to a terminal state, resolving every boundary with a default. Iterates over a
  // local state variable (not React state) to avoid stale closures, then applies updates once.
  const handleAutoRun = useCallback(() => {
    if (!engineState || !lastResult?.awaiting) return;
    let cur = engineState;
    let aw: InputRequest | undefined = lastResult.awaiting;
    const rows: StepEntry[] = [];
    const baseIndex = trace.length;
    try {
      let guard = 0;
      while (aw && guard < AUTO_RUN_CAP) {
        const result = advance(cur, aw);
        cur = result.state;
        const dispatched = dispatchSim(result.directives);
        rows.push(traceRowFrom(result, baseIndex + rows.length, dispatched));
        if (isTerminal(result.status)) {
          aw = undefined;
          break;
        }
        aw = result.awaiting;
        guard++;
      }
      setEngineState(cur);
      setLastResult({ status: cur.outcome.status, awaiting: aw });
      setTrace((t) => [...t, ...rows]);
      if (!aw) setRunning(false);
      if (guard >= AUTO_RUN_CAP && aw) {
        setError(`Auto-run stopped after ${AUTO_RUN_CAP} steps (possible loop)`);
        setRunning(false);
      }
    } catch (e) {
      setEngineState(cur);
      setTrace((t) => [...t, ...rows]);
      setError(String(e));
      setRunning(false);
    }
  }, [engineState, lastResult, trace.length, dispatchSim]);

  const handleStop = useCallback(() => {
    setRunning(false);
    setEngineState(null);
    setLastResult(null);
  }, []);

  const canStart = schemaDoc && validationResults?.allOk;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'monospace', fontSize: 11 }}>
      {/* Controls */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>Simulator (L4)</span>
        <button
          disabled={!canStart || running}
          onClick={handleStart}
          style={{
            padding: '3px 10px',
            border: '1px solid #CBD5E1',
            borderRadius: 4,
            cursor: canStart && !running ? 'pointer' : 'not-allowed',
            background: canStart && !running ? '#059669' : '#9CA3AF',
            color: '#fff',
            fontSize: 11,
          }}
        >
          ▶ Start
        </button>
        {running && (
          <>
            <button
              onClick={handleAutoRun}
              disabled={!lastResult?.awaiting}
              style={{
                padding: '3px 10px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                cursor: lastResult?.awaiting ? 'pointer' : 'not-allowed',
                background: lastResult?.awaiting ? '#2563EB' : '#9CA3AF',
                color: '#fff',
                fontSize: 11,
              }}
            >
              ▶▶ Auto-run
            </button>
            <button
              onClick={handleAutoStep}
              disabled={!lastResult?.awaiting}
              style={{
                padding: '3px 10px',
                border: '1px solid #CBD5E1',
                borderRadius: 4,
                cursor: lastResult?.awaiting ? 'pointer' : 'not-allowed',
                fontSize: 11,
              }}
            >
              Auto-step
            </button>
            <button
              onClick={handleStop}
              style={{ padding: '3px 10px', border: '1px solid #FCA5A5', borderRadius: 4, cursor: 'pointer', color: '#DC2626', fontSize: 11 }}
            >
              ■ Stop
            </button>
          </>
        )}
        {lastResult && (
          <span
            style={{
              marginLeft: 4,
              color:
                lastResult.status === 'won' ? '#059669' : lastResult.status === 'lost' ? '#DC2626' : '#374151',
              fontWeight: 700,
            }}
          >
            {lastResult.status}
            {lastResult.awaiting && ` → awaiting ${lastResult.awaiting.id}`}
          </span>
        )}
        {!canStart && !running && (
          <span style={{ color: '#94A3B8', fontSize: 11 }}>
            {!schemaDoc ? 'Load a scenario first' : 'Fix validation errors first'}
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', fontSize: 11 }}>
          Error: {error}
        </div>
      )}

      {/* Tower preview */}
      <div
        ref={towerContainerRef}
        style={{ height: 200, background: '#0F172A', flexShrink: 0 }}
      />

      {/* Trace */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {trace.length === 0 && !error && (
          <div style={{ padding: '8px 12px', color: '#94A3B8' }}>
            Click Start to drive the engine through the authored graph.
          </div>
        )}
        {trace.map((entry) => (
          <div
            key={entry.stepIndex}
            style={{
              padding: '2px 12px',
              borderBottom: '1px solid #F8FAFC',
              display: 'grid',
              gridTemplateColumns: '30px 70px 120px 50px 60px 80px',
              gap: 4,
              color:
                entry.status === 'won' ? '#059669' : entry.status === 'lost' ? '#DC2626' : '#374151',
            }}
          >
            <span style={{ color: '#94A3B8' }}>#{entry.stepIndex}</span>
            <span style={{ fontWeight: entry.status !== 'running' ? 700 : 400 }}>{entry.status}</span>
            <span style={{ color: '#64748B' }}>{entry.awaitingId ? `await:${entry.awaitingId}` : ''}</span>
            <span style={{ color: '#94A3B8' }}>
              m{entry.month}t{entry.turn}
            </span>
            <span style={{ color: '#6366F1' }}>d:{entry.dispatched}</span>
            <span style={{ color: '#94A3B8' }}>
              corr:{entry.corruption} sup:{entry.supply}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
