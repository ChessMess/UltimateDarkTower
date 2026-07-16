// ScenarioBar — document-level actions for the whole scenario: New, Load Sample, Save, Save As,
// Scenarios…, Import, Export, plus the validity/dirty readout.
//
// These used to sit in the canvas toolbar, which put eleven controls in one strip and mixed two
// unrelated jobs: "what does this scenario do" (file actions) and "how am I looking at the graph"
// (auto-layout, grouping, focus). The canvas toolbar now keeps only the latter.
//
// The validity readout lives HERE, next to Export, because it is the thing that explains why Export
// is disabled — it is a property of the document, not of the canvas view.

import { useCallback, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCreatorStore } from '../store';
import type { ScenarioDoc } from '../types';
import { SAMPLE_SCENARIO } from '../utils/sampleScenario';
import { NewScenarioDialog } from './NewScenarioDialog';
import { ScenarioListDialog } from './ScenarioListDialog';

// Collapse state persists, like the bottom panel's (udtc-bottom-collapsed): it's a standing
// preference about chrome, not something to re-set every session.
const COLLAPSED_KEY = 'udtc-scenario-collapsed';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function ScenarioBar() {
  const {
    schemaDoc,
    validationResults,
    isDirty,
    currentScenarioId,
    loadScenario,
    clearScenario,
    exportScenario,
    saveCurrent,
    saveCurrentAs,
    markExported,
    setCenterView,
    scenarioDialog,
    setScenarioDialog,
  } = useCreatorStore();
  const { fitView } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore — private browsing / storage disabled
      }
      return next;
    });
  }, []);

  const allOk = validationResults?.allOk ?? false;
  const hasErrors = validationResults && !validationResults.allOk;
  const errorCount = validationResults
    ? validationResults.l1.errors.length +
      validationResults.l2.errors.length +
      validationResults.l3.errors.length
    : 0;

  // Loading any scenario shows the graph: these actions are reachable from the Boards view too, and
  // silently swapping the document underneath a different view would be disorienting.
  const revealCanvas = useCallback(() => {
    setCenterView('canvas');
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setCenterView, fitView]);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes and start a new scenario?')) return;
    setScenarioDialog('new');
  }, [isDirty, setScenarioDialog]);

  const handleLoadSampleScenario = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes and load the sample scenario?')) return;
    clearScenario();
    loadScenario(SAMPLE_SCENARIO, true);
    revealCanvas();
  }, [isDirty, clearScenario, loadScenario, revealCanvas]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (isDirty && !window.confirm('Discard unsaved changes and import this scenario?')) {
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const doc = JSON.parse(ev.target?.result as string) as ScenarioDoc;
          // clearScenario first so the import can never inherit the previous scenario's id (which
          // would make Save silently overwrite it) or its priorSetupBoard stash. A file carries no
          // id — the schema forbids one — so an import is always a NEW scenario, and Save prompts.
          clearScenario();
          loadScenario(doc, !doc.meta.layout?.positions);
          revealCanvas();
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [isDirty, clearScenario, loadScenario, revealCanvas],
  );

  // Save — never gated on validity. Work in progress is exactly what needs saving.
  const handleSave = useCallback(() => {
    if (!schemaDoc) return;
    if (currentScenarioId) {
      void saveCurrent();
      return;
    }
    const title = window.prompt('Save scenario as:', schemaDoc.meta.title || 'Untitled');
    if (title === null) return;
    void saveCurrentAs(title.trim() || 'Untitled');
  }, [schemaDoc, currentScenarioId, saveCurrent, saveCurrentAs]);

  const handleSaveAs = useCallback(() => {
    if (!schemaDoc) return;
    const title = window.prompt('Save a copy as:', `${schemaDoc.meta.title} (copy)`);
    if (title === null) return;
    void saveCurrentAs(title.trim() || 'Untitled');
  }, [schemaDoc, saveCurrentAs]);

  // Export — produces the Player-consumable artifact, so it keeps the allOk gate. It records that a
  // durable copy now exists (markExported); it does NOT mark the document saved.
  const handleExport = useCallback(() => {
    if (!validationResults?.allOk) return;
    const json = exportScenario();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaDoc?.meta.title ?? 'scenario'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    void markExported();
  }, [validationResults, exportScenario, schemaDoc, markExported]);

  return (
    <div style={wrap}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <div
        className="rail-section-header"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-controls="scenario-actions"
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
      >
        <span className={`palette-chevron${collapsed ? '' : ' palette-chevron--open'}`}>▸</span>
        <span>Scenario</span>
        {/* The status lives in the HEADER, not the body, so collapsing the section never hides
            whether the scenario is valid or has unsaved work. */}
        {schemaDoc && (
          <span style={headerStatus}>
            <span
              style={{ color: hasErrors ? 'var(--c-danger)' : 'var(--c-success)' }}
              title={hasErrors ? `${errorCount} validation error(s)` : 'All validation layers pass'}
            >
              {hasErrors ? `⚠ ${errorCount}` : '✓'}
            </span>
            {isDirty && (
              <span style={{ color: 'var(--c-warning)' }} title="Unsaved changes">
                ●
              </span>
            )}
          </span>
        )}
      </div>

      {!collapsed && (
        <div id="scenario-actions" style={body}>
          <div style={row}>
            <button
              className="toolbar-btn"
              style={grow}
              onClick={handleNew}
              title="Create a new scenario from scratch"
            >
              New
            </button>
            <button
              className="toolbar-btn"
              style={grow}
              onClick={() => setScenarioDialog('list')}
              title="Open a saved scenario"
            >
              Open…
            </button>
          </div>

          <div style={row}>
            <button
              className="toolbar-btn"
              style={{ ...grow, fontWeight: isDirty ? 700 : 400 }}
              onClick={handleSave}
              disabled={!schemaDoc}
              title={
                !schemaDoc
                  ? 'No scenario loaded'
                  : currentScenarioId
                    ? 'Save to this browser'
                    : 'Save to this browser (names the scenario)'
              }
            >
              {isDirty || !currentScenarioId ? 'Save' : 'Saved'}
            </button>
            <button
              className="toolbar-btn"
              style={grow}
              onClick={handleSaveAs}
              disabled={!schemaDoc}
              title="Save a copy under a new name"
            >
              Save As
            </button>
          </div>

          <div style={row}>
            <button
              className="toolbar-btn"
              style={grow}
              onClick={() => fileInputRef.current?.click()}
              title="Import a scenario .json"
            >
              Import
            </button>
            <button
              className="toolbar-btn"
              onClick={handleExport}
              disabled={!schemaDoc || !allOk}
              title={
                !schemaDoc
                  ? 'No scenario loaded'
                  : !allOk
                    ? 'Fix validation errors before exporting'
                    : 'Export canonical JSON — the only durable copy'
              }
              style={{
                ...grow,
                background: schemaDoc && allOk ? '#059669' : '#9CA3AF',
                color: '#fff',
                cursor: schemaDoc && allOk ? 'pointer' : 'not-allowed',
              }}
            >
              Export
            </button>
          </div>

          <button
            className="toolbar-btn"
            onClick={handleLoadSampleScenario}
            title="Load the sample scenario"
            style={{ fontSize: 11 }}
          >
            Load Sample Scenario
          </button>
        </div>
      )}

      {scenarioDialog === 'new' && (
        <NewScenarioDialog
          onClose={() => setScenarioDialog(null)}
          onConfirm={(doc) => {
            // Detach from any open library entry so New never overwrites the scenario you had open.
            clearScenario();
            loadScenario(doc, true);
            setScenarioDialog(null);
            revealCanvas();
          }}
        />
      )}

      {scenarioDialog === 'list' && (
        <ScenarioListDialog
          isDirty={isDirty}
          onClose={() => {
            setScenarioDialog(null);
            revealCanvas();
          }}
        />
      )}
    </div>
  );
}

const wrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '0 0 auto',
  borderBottom: '1px solid var(--c-border)',
};
const body: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  padding: '2px 8px 10px',
};
const headerStatus: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  fontSize: 10,
  letterSpacing: 0,
};
const row: CSSProperties = { display: 'flex', gap: 5 };
const grow: CSSProperties = { flex: 1, minWidth: 0 };
