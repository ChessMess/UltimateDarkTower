import { EffectListEditor } from '../effects';
import type { ScenarioDoc, SchemaNode } from '../../types';

// Structured effects[] editor for effect.apply nodes — the same EffectListEditor the deck builder
// and dungeon editor already use, rather than a raw JSON textarea (this file used to have one; it
// carried a data-loss bug — editing one node's textarea could commit onto another — and never
// gained the deck/dungeon editors' validated op forms, deck/foe id dropdowns, etc.).
//
// effect.apply's schema allows props to hold EITHER a singular `effect` or an `effects[]` (a oneOf).
// This editor always reads/writes the array form; the engine already normalizes a legacy singular
// `effect` into a one-item array when it runs (creator-engine/src/engine/nodes.ts), so writing
// `effects` is behaviorally identical and matches how every other surface authors effects.
export function EffectApplyEditor({
  sn,
  schemaDoc,
  onUpdate,
}: {
  sn: SchemaNode;
  schemaDoc: ScenarioDoc;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const raw = sn.props?.effects ?? (sn.props?.effect ? [sn.props.effect] : []);
  const effects = Array.isArray(raw) ? raw : [];

  const lib = (schemaDoc.library as Record<string, unknown> | undefined) ?? {};
  const deckIds = [
    ...Object.keys((lib.battleDefs as Record<string, unknown>) ?? {}),
    ...Object.keys((lib.decks as Record<string, unknown>) ?? {}),
  ];
  const foeIds = Object.keys((lib.foes as Record<string, unknown>) ?? {});

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--c-border)' }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--c-text-faint)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Effects
      </div>
      <EffectListEditor
        value={effects}
        onChange={(next) => onUpdate({ effects: next })}
        deckIds={deckIds}
        foeIds={foeIds}
      />
    </div>
  );
}
