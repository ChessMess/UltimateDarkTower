import { useState, useCallback } from 'react';
import { init, step, type Input, type EngineState } from '@udtc/engine';
import { createResolver } from '@udtc/adapters';
import { useCreatorStore } from '../store';
import type { ScenarioDoc } from '../types';

interface StepEntry {
  stepIndex: number;
  status: string;
  awaitingId?: string;
  directiveCount: number;
  corruption: number;
  supply: number;
  month: number;
  turn: number;
}

export function SimulatorPanel() {
  const { schemaDoc, validationResults, exportScenario } = useCreatorStore();
  const [running, setRunning] = useState(false);
  const [trace, setTrace] = useState<StepEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [lastResult, setLastResult] = useState<{ status: string; awaiting?: { id: string } } | null>(null);

  const handleStart = useCallback(() => {
    if (!schemaDoc || !validationResults?.allOk) return;
    setError(null);
    setTrace([]);
    setRunning(true);

    try {
      const resolver = createResolver();
      // Rebuild doc from current state to include layout
      let doc: ScenarioDoc;
      try {
        doc = JSON.parse(exportScenario()) as ScenarioDoc;
      } catch {
        doc = schemaDoc;
      }
      const result = init(doc, { seed: 'creator-sim-seed', playerCount: 1, resolver });
      setEngineState(result.state);
      setLastResult(result);
      const state = result.state as unknown as Record<string, unknown>;
      const heroes = state.heroes as Record<string, Record<string, number>> | undefined;
      const clock = state.clock as Record<string, number> | undefined;
      const skulls = state.skulls as Record<string, number> | undefined;
      setTrace([
        {
          stepIndex: 0,
          status: result.status,
          awaitingId: result.awaiting?.id,
          directiveCount: result.directives.length,
          corruption: heroes?.hero1?.corruption ?? 0,
          supply: skulls?.supply ?? 0,
          month: clock?.month ?? 1,
          turn: clock?.turnInMonth ?? 0,
        },
      ]);
    } catch (e) {
      setError(String(e));
      setRunning(false);
    }
  }, [schemaDoc, validationResults, exportScenario]);

  const handleControl = useCallback(() => {
    if (!engineState) return;
    const input: Input = { kind: 'control' };
    try {
      const result = step(engineState, input);
      setEngineState(result.state);
      setLastResult(result);
      const state = result.state as unknown as Record<string, unknown>;
      const heroes = state.heroes as Record<string, Record<string, number>> | undefined;
      const clock = state.clock as Record<string, number> | undefined;
      const skulls = state.skulls as Record<string, number> | undefined;
      setTrace((t) => [
        ...t,
        {
          stepIndex: t.length,
          status: result.status,
          awaitingId: result.awaiting?.id,
          directiveCount: result.directives.length,
          corruption: heroes?.hero1?.corruption ?? 0,
          supply: skulls?.supply ?? 0,
          month: clock?.month ?? 1,
          turn: clock?.turnInMonth ?? 0,
        },
      ]);
      if (result.status === 'won' || result.status === 'lost' || result.status === 'ended') {
        setRunning(false);
      }
    } catch (e) {
      setError(String(e));
      setRunning(false);
    }
  }, [engineState]);

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
              onClick={handleControl}
              style={{ padding: '3px 10px', border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
            >
              Step (control)
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
              gridTemplateColumns: '30px 70px 120px 50px 80px',
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
            <span style={{ color: '#94A3B8' }}>
              corr:{entry.corruption} sup:{entry.supply}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
