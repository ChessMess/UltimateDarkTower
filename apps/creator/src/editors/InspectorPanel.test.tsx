/**
 * InspectorPanel.test.tsx — the inspector must show the selected node's own data.
 *
 * effect.apply used to render an uncontrolled <textarea defaultValue={effectsStr}> with no key
 * (EffectApplyEditor's old raw-JSON textarea). React reconciles same-type-same-position elements by
 * reusing the instance, so selecting a second effect.apply node kept the first node's JSON on
 * screen while onUpdate wrote to the second — one keystroke committed node A's effects onto node B,
 * the ~800ms autosave persisted it, and there is no undo.
 *
 * effect.apply now renders the shared, controlled EffectListEditor (editors/effects), keyed on the
 * node id in the NODE_EDITORS registry lookup — a selection change always remounts fresh from the
 * new node's `value` prop rather than reusing a stale DOM instance. This pins that the fix holds.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { InspectorPanel } from './InspectorPanel';
import { useCreatorStore } from '../store';
import { scaffoldScenario } from '../utils/scaffold';

type EffectNode = { id: string; effects: unknown };

function rfNodeFor({ id, effects }: EffectNode) {
  return {
    id,
    type: 'scenarioNode',
    position: { x: 0, y: 0 },
    data: {
      schemaNode: { id, kind: 'effect.apply', label: id, props: { effects } },
    },
  };
}

// resource.gain/resource.lose have a structured form (opForms.ts) — an "Amount" number field —
// so the two nodes are distinguishable by that field's value without depending on the JSON
// fallback an op with no structured form would render.
const nodeA = { id: 'node-a', effects: [{ op: 'resource.gain', resource: 'warriors', amount: 3 }] };
const nodeB = { id: 'node-b', effects: [{ op: 'resource.lose', resource: 'spirit', amount: 7 }] };

function selectNode(id: string) {
  useCreatorStore.setState({
    rfNodes: [rfNodeFor(nodeA), rfNodeFor(nodeB)] as never,
    selectedNodeId: id,
  });
}

function amountInput(): HTMLInputElement {
  return screen.getByLabelText('Amount') as HTMLInputElement;
}

describe('InspectorPanel — effect.apply editor', () => {
  beforeEach(() => {
    cleanup();
    useCreatorStore.setState({
      schemaDoc: scaffoldScenario({
        title: 'Inspector test',
        designer: 'Test',
        mode: 'coop',
        difficultyProfile: 'heroic',
        skullSupply: 30,
        monthEndMin: 5,
        monthEndMax: 8,
      }),
      validationResults: null as never,
    });
  });

  it('shows the selected node effects', () => {
    selectNode('node-a');
    render(<InspectorPanel />);

    expect(amountInput().value).toBe('3');
  });

  // The bug (now fixed): the editor used to keep node A's data after switching to node B.
  it('shows the newly selected node effects after switching nodes', () => {
    selectNode('node-a');
    const { rerender } = render(<InspectorPanel />);
    expect(amountInput().value).toBe('3');

    selectNode('node-b');
    rerender(<InspectorPanel />);

    expect(amountInput().value).toBe('7');
  });

  // The consequence (now fixed): editing after a switch must write the visible node's data.
  it('does not carry one node effects onto another', () => {
    const updateNodeProps = vi.fn();
    useCreatorStore.setState({ updateNodeProps } as never);

    selectNode('node-a');
    const { rerender } = render(<InspectorPanel />);
    selectNode('node-b');
    rerender(<InspectorPanel />);

    // Whatever the field currently holds is what an edit would commit — so it must already be
    // node B's data, not node A's.
    expect(amountInput().value).toBe('7');
  });
});
