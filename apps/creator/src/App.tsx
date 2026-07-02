import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import './App.css';
import { CreatorCanvas } from './canvas';
import { PalettePanel, InspectorPanel, ProblemsPanel } from './editors';
import { SimulatorPanel } from './simulator';
import { useCreatorStore } from './store';
import { ThemeToggle } from '@udtc/theme';

type BottomTab = 'problems' | 'simulator';

export default function App() {
  const [activeTab, setActiveTab] = useState<BottomTab>('problems');
  const [focusMode, setFocusMode] = useState(false);
  const { schemaDoc, validationResults } = useCreatorStore();

  const problemCount = validationResults
    ? validationResults.l1.errors.length +
      validationResults.l2.errors.length +
      validationResults.l3.errors.length
    : 0;

  return (
    <ReactFlowProvider>
      <div className={`creator-layout${focusMode ? ' creator-layout--focus' : ''}`}>
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
          <a className="switch-link" href="../player/">
            Player →
          </a>
          <ThemeToggle />
        </div>

        {/* Left: Palette */}
        <div className="creator-palette">
          <PalettePanel />
        </div>

        {/* Center: Canvas */}
        <div className="creator-canvas">
          <CreatorCanvas
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
          />
        </div>

        {/* Right: Inspector */}
        <div className="creator-inspector">
          <InspectorPanel />
        </div>

        {/* Bottom: Problems / Simulator */}
        <div className="creator-bottom">
          <div className="creator-bottom-tabs">
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
    </ReactFlowProvider>
  );
}
