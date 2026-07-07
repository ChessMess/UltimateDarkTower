import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import './App.css';
import { CreatorCanvas } from './canvas';
import { DeckBuilderView, DeckJsonPanel } from './decks';
import { PalettePanel, InspectorPanel, ProblemsPanel, RecoveryDialog } from './editors';
import { SimulatorPanel } from './simulator';
import { useCreatorStore } from './store';
import { useDraftPersistence, loadDraft, clearDraft, type DraftEnvelope } from './utils';
import { ThemeToggle } from '@udtc/theme';

type BottomTab = 'problems' | 'simulator';

const BOTTOM_COLLAPSED_KEY = 'udtc-bottom-collapsed';

function loadBottomCollapsed(): boolean {
  try {
    return localStorage.getItem(BOTTOM_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<BottomTab>('problems');
  const [focusMode, setFocusMode] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState<boolean>(loadBottomCollapsed);
  // schemaDoc is always null on first mount (the store's initial state), so a lazy
  // initializer is sufficient to offer a recovered draft — no effect needed.
  const [pendingDraft, setPendingDraft] = useState<DraftEnvelope | null>(() => loadDraft());
  const { schemaDoc, validationResults, loadScenario, centerView, setCenterView, draftSaveFailed } =
    useCreatorStore();

  useDraftPersistence();

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    loadScenario(pendingDraft.doc, !pendingDraft.doc.meta.layout?.positions);
    useCreatorStore.setState({ isDirty: true });
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setPendingDraft(null);
  };

  const toggleBottomCollapsed = () => {
    setBottomCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(BOTTOM_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore — private browsing / storage disabled
      }
      return next;
    });
  };

  const problemCount = validationResults
    ? validationResults.l1.errors.length +
      validationResults.l2.errors.length +
      validationResults.l3.errors.length
    : 0;

  return (
    <ReactFlowProvider>
      <div
        className={`creator-layout${focusMode ? ' creator-layout--focus' : ''}${
          centerView === 'decks' ? ' creator-layout--decks' : ''
        }${bottomCollapsed ? ' creator-layout--bottom-collapsed' : ''}`}
      >
        {/* Top bar */}
        <div className="creator-topbar">
          <span className="title">UltimateDarkTower Creator</span>
          {schemaDoc && (
            <>
              <span className="subtitle">|</span>
              <span className="subtitle">{schemaDoc.meta.title}</span>
              <span className="subtitle">v{schemaDoc.meta.scenarioVersion}</span>
            </>
          )}
          <span style={{ flex: 1 }} />
          {draftSaveFailed && (
            <span
              title="Autosave failed — this browser's local storage is full. Export your scenario to avoid losing work."
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                background: 'var(--c-warning)',
                borderRadius: 6,
                padding: '3px 9px',
                letterSpacing: 0.02,
              }}
            >
              ⚠ Autosave off
            </span>
          )}
          <a className="switch-link" href="../player/">
            Player →
          </a>
          <ThemeToggle />
        </div>

        {/* Left: Palette */}
        <div className="creator-palette">
          <PalettePanel />
        </div>

        {/* Center: Canvas | Decks switcher */}
        <div className="creator-canvas">
          <div className="creator-center-tabs">
            <button
              className={`creator-bottom-tab ${centerView === 'canvas' ? 'active' : ''}`}
              onClick={() => setCenterView('canvas')}
            >
              Canvas
            </button>
            <button
              className={`creator-bottom-tab ${centerView === 'decks' ? 'active' : ''}`}
              onClick={() => setCenterView('decks')}
            >
              Decks
            </button>
          </div>
          <div className="creator-center-content">
            {centerView === 'canvas' ? (
              <CreatorCanvas
                focusMode={focusMode}
                onToggleFocusMode={() => setFocusMode((f) => !f)}
              />
            ) : (
              <DeckBuilderView />
            )}
          </div>
        </div>

        {/* Right: Inspector (canvas mode) | Deck JSON (deck mode) */}
        <div className="creator-inspector">
          {centerView === 'decks' ? <DeckJsonPanel /> : <InspectorPanel />}
        </div>

        {/* Bottom: Problems / Simulator */}
        <div className="creator-bottom">
          <div className="creator-bottom-tabs">
            <button
              type="button"
              className="palette-allbtn"
              onClick={toggleBottomCollapsed}
              aria-expanded={!bottomCollapsed}
              aria-label={bottomCollapsed ? 'Expand panel' : 'Collapse panel'}
              title={bottomCollapsed ? 'Expand panel' : 'Collapse panel'}
              style={{ marginLeft: 6, marginRight: 6, fontSize: 12, lineHeight: 1 }}
            >
              {bottomCollapsed ? '▸' : '▾'}
            </button>
            <button
              className={`creator-bottom-tab ${activeTab === 'problems' ? 'active' : ''}`}
              onClick={() => setActiveTab('problems')}
            >
              Problems
              {problemCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: 'var(--c-danger)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 10,
                  }}
                >
                  {problemCount}
                </span>
              )}
            </button>
            <button
              className={`creator-bottom-tab ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              Simulator (L4)
            </button>
          </div>
          <div className="creator-bottom-content">
            {activeTab === 'problems' && <ProblemsPanel />}
            {activeTab === 'simulator' && <SimulatorPanel />}
          </div>
        </div>
      </div>

      {pendingDraft && (
        <RecoveryDialog
          title={pendingDraft.title}
          savedAt={pendingDraft.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
    </ReactFlowProvider>
  );
}
