/**
 * InspectorPanel.test.tsx — the inspector must show the selected node's own data.
 *
 * EffectApplyEditor renders an uncontrolled <textarea defaultValue={effectsStr}> with
 * no key. React reconciles same-type-same-position elements by reusing the instance,
 * so selecting a second effect.apply node kept the first node's JSON on screen while
 * onUpdate wrote to the second — one keystroke committed node A's effects onto node
 * B, the ~800ms autosave persisted it, and there is no undo.
 *
 * The sibling ScenarioSetupEditor in the same file already keys its uncontrolled
 * input on the committed value and comments on exactly this hazard; this pins the
 * same behaviour for the effects editor.
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

const nodeA = { id: 'node-a', effects: [{ op: 'resource.add', amount: 1 }] };
const nodeB = { id: 'node-b', effects: [{ op: 'resource.remove', amount: 99 }] };

function selectNode(id: string) {
  useCreatorStore.setState({
    rfNodes: [rfNodeFor(nodeA), rfNodeFor(nodeB)] as never,
    selectedNodeId: id,
  });
}

function effectsTextarea(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: /effects/i }) as HTMLTextAreaElement;
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

    expect(effectsTextarea().value).toContain('resource.add');
  });

  // The bug: the textarea keeps node A's JSON after switching to node B.
  it('shows the newly selected node effects after switching nodes', () => {
    selectNode('node-a');
    const { rerender } = render(<InspectorPanel />);
    expect(effectsTextarea().value).toContain('resource.add');

    selectNode('node-b');
    rerender(<InspectorPanel />);

    expect(effectsTextarea().value).toContain('resource.remove');
    expect(effectsTextarea().value).not.toContain('resource.add');
  });

  // The consequence: editing after a switch must write the visible node's data.
  it('does not carry one node effects onto another', () => {
    const updateNodeProps = vi.fn();
    useCreatorStore.setState({ updateNodeProps } as never);

    selectNode('node-a');
    const { rerender } = render(<InspectorPanel />);
    selectNode('node-b');
    rerender(<InspectorPanel />);

    const textarea = effectsTextarea();
    // Whatever the field currently holds is what a keystroke commits — so it must
    // already be node B's data, not node A's.
    expect(JSON.parse(textarea.value)).toEqual(nodeB.effects);
  });
});
