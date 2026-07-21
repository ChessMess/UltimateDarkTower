import type { ComponentType } from 'react';
import type { NodeKind, ScenarioDoc, SchemaNode } from '../../types';
import { EffectApplyEditor } from './EffectApplyEditor';
import { TowerOpEditor } from './TowerOpEditor';
import { BoardSetupEditor } from './BoardSetupEditor';
import { SelectHeroEditor } from './SelectHeroEditor';
import { DungeonSubflowEditor } from './DungeonSubflowEditor';

/**
 * Shared prop shape for the per-node-kind props editors rendered in InspectorPanel's single "kind
 * editor" slot. Each editor destructures only the fields it needs (e.g. TowerOpEditor ignores
 * `schemaDoc`); passing the full set to every editor is fine since it's a plain object, and it's
 * what lets the lookup below be a single `Record<NodeKind, ComponentType<...>>` instead of a
 * hand-rolled `sn.kind === 'x' && <XEditor .../>` chain per kind.
 */
export interface NodeEditorProps {
  sn: SchemaNode;
  schemaDoc: ScenarioDoc;
  onUpdate: (props: Record<string, unknown>) => void;
  onSyncLibraryHeroes: (heroIds: string[]) => void;
  onEditInBuilder: (dungeonId: string) => void;
}

export const NODE_EDITORS: Partial<Record<NodeKind, ComponentType<NodeEditorProps>>> = {
  'effect.apply': EffectApplyEditor,
  'tower.op': TowerOpEditor,
  'lifecycle.boardSetup': BoardSetupEditor,
  'lifecycle.selectHero': SelectHeroEditor,
  'dungeon.subflow': DungeonSubflowEditor,
};
