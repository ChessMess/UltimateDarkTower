// DungeonEditorPanel — the right zone of the dungeon builder. With no room selected it edits dungeon
// meta (name, trait, grid, map image, spawning quest). With a room selected it edits that room's
// card (name, displayText, art, entrance/target, inside-event effects, improve-once reward, enter
// requirement). Effect lists reuse the shared EffectListEditor (same UI as the deck builder).

import type { CSSProperties } from 'react';
import type { ScenarioDoc } from '../types';
import { EffectListEditor } from '../editors/effects';
import { ImagePicker } from '../decks/ImagePicker';
import {
  DUNGEON_TRAITS,
  imagesOf,
  questsOf,
  inputStyle,
  labelStyle,
  smallBtn,
  dangerBtn,
  type Dungeon,
  type DungeonRoom,
} from './shared';

export interface DungeonEditorPanelProps {
  doc: ScenarioDoc;
  dungeon: Dungeon;
  selectedRoomId: string | null;
  onChange: (next: Dungeon) => void;
  onSelectRoom: (id: string | null) => void;
  onManageImages: () => void;
  onUploadMap: (file: File) => void;
}

export function DungeonEditorPanel({
  doc,
  dungeon,
  selectedRoomId,
  onChange,
  onSelectRoom,
  onManageImages,
  onUploadMap,
}: DungeonEditorPanelProps) {
  const images = imagesOf(doc);
  const quests = questsOf(doc);
  const lib = (doc.library as Record<string, unknown> | undefined) ?? {};
  const deckIds = [
    ...Object.keys((lib.battleDefs as Record<string, unknown>) ?? {}),
    ...Object.keys((lib.decks as Record<string, unknown>) ?? {}),
  ];
  const foeIds = Object.keys((lib.foes as Record<string, unknown>) ?? {});

  const room = selectedRoomId ? dungeon.rooms.find((r) => r.id === selectedRoomId) : undefined;

  const patchRoom = (id: string, patch: Partial<DungeonRoom>) =>
    onChange({ ...dungeon, rooms: dungeon.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  // exactly-one enforcement: setting entrance/target on a room clears it on all others.
  const setUnique = (id: string, key: 'isEntrance' | 'isTarget', on: boolean) =>
    onChange({
      ...dungeon,
      rooms: dungeon.rooms.map((r) => {
        if (r.id === id) return { ...r, [key]: on };
        if (on && r[key]) {
          const { [key]: _drop, ...rest } = r;
          void _drop;
          return rest;
        }
        return r;
      }),
    });

  const deleteRoom = (id: string) => {
    onChange({ ...dungeon, rooms: dungeon.rooms.filter((r) => r.id !== id) });
    onSelectRoom(null);
  };

  if (!room) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>Dungeon</div>

        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={dungeon.name ?? ''}
          onChange={(e) => onChange({ ...dungeon, name: e.target.value })}
        />

        <label style={labelStyle}>Trait</label>
        <select
          style={inputStyle}
          value={dungeon.trait ?? 'Magic'}
          onChange={(e) => onChange({ ...dungeon, trait: e.target.value as Dungeon['trait'] })}
        >
          {DUNGEON_TRAITS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Grid (columns × rows)</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            style={{ ...inputStyle, width: 64 }}
            value={dungeon.grid.cols}
            onChange={(e) =>
              onChange({ ...dungeon, grid: { ...dungeon.grid, cols: Math.max(1, +e.target.value | 0) } })
            }
          />
          <span style={{ color: 'var(--c-text-faint)' }}>×</span>
          <input
            type="number"
            min={1}
            style={{ ...inputStyle, width: 64 }}
            value={dungeon.grid.rows}
            onChange={(e) =>
              onChange({ ...dungeon, grid: { ...dungeon.grid, rows: Math.max(1, +e.target.value | 0) } })
            }
          />
        </div>

        <label style={labelStyle}>Map image (masterBitmap)</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <ImagePicker
            images={images}
            value={dungeon.masterBitmap}
            onChange={(key) => onChange({ ...dungeon, masterBitmap: key })}
            onManage={onManageImages}
            label="no map"
          />
          <label style={{ ...smallBtn, display: 'inline-block' }}>
            Upload map…
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) onUploadMap(f);
              }}
            />
          </label>
        </div>

        <label style={labelStyle}>Spawning quest (optional)</label>
        <select
          style={inputStyle}
          value={dungeon.spawningQuestId ?? ''}
          onChange={(e) =>
            onChange({ ...dungeon, spawningQuestId: e.target.value || undefined })
          }
        >
          <option value="">— none —</option>
          {Object.keys(quests).map((q) => (
            <option key={q} value={q}>
              {quests[q].name || q}
            </option>
          ))}
        </select>

        <p style={hintStyle}>
          Select a cell on the map to add or edit a room. Wire this dungeon into play with a
          <b> dungeon.subflow </b> node (or the “Add &amp; wire dungeon subflow” button in the rail).
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Room · {room.id}</span>
        <button style={smallBtn} onClick={() => onSelectRoom(null)}>
          ← Dungeon
        </button>
      </div>

      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={room.name ?? ''}
        placeholder={room.id}
        onChange={(e) => patchRoom(room.id, { name: e.target.value || undefined })}
      />

      <label style={labelStyle}>Display text (read aloud on entry)</label>
      <textarea
        style={{ ...inputStyle, minHeight: 48, resize: 'vertical' }}
        value={room.displayText ?? ''}
        onChange={(e) => patchRoom(room.id, { displayText: e.target.value || undefined })}
      />

      <div style={{ display: 'flex', gap: 14, margin: '10px 0' }}>
        <label style={checkRow}>
          <input
            type="checkbox"
            checked={!!room.isEntrance}
            onChange={(e) => setUnique(room.id, 'isEntrance', e.target.checked)}
          />
          ⭐ Entrance
        </label>
        <label style={checkRow}>
          <input
            type="checkbox"
            checked={!!room.isTarget}
            onChange={(e) => setUnique(room.id, 'isTarget', e.target.checked)}
          />
          🎯 Target
        </label>
      </div>

      <label style={labelStyle}>Room art (optional)</label>
      <ImagePicker
        images={images}
        value={room.artRef}
        onChange={(key) => patchRoom(room.id, { artRef: key })}
        onManage={onManageImages}
        label="no art"
      />

      <label style={labelStyle}>Inside event (applied on entry)</label>
      <EffectListEditor
        value={room.insideEvent ?? []}
        onChange={(effects) => patchRoom(room.id, { insideEvent: effects.length ? effects : undefined })}
        deckIds={deckIds}
        foeIds={foeIds}
      />

      <label style={labelStyle}>Improve-once reward (1 Advantage)</label>
      <EffectListEditor
        value={room.improveOnce?.effects ?? []}
        onChange={(effects) =>
          patchRoom(room.id, { improveOnce: effects.length ? { effects } : undefined })
        }
        deckIds={deckIds}
        foeIds={foeIds}
      />

      <label style={labelStyle}>Enter requirement — spirit cost</label>
      <input
        type="number"
        min={0}
        style={{ ...inputStyle, width: 80 }}
        value={room.enterRequirement?.spiritCost ?? 0}
        onChange={(e) => {
          const spiritCost = Math.max(0, +e.target.value | 0);
          const req = { ...(room.enterRequirement ?? {}) };
          if (spiritCost > 0) req.spiritCost = spiritCost;
          else delete req.spiritCost;
          patchRoom(room.id, {
            enterRequirement: Object.keys(req).length ? req : undefined,
          });
        }}
      />
      <label style={labelStyle}>Enter requirement — on-fail effects</label>
      <EffectListEditor
        value={room.enterRequirement?.onFail ?? []}
        onChange={(onFail) => {
          const req = { ...(room.enterRequirement ?? {}) };
          if (onFail.length) req.onFail = onFail;
          else delete req.onFail;
          patchRoom(room.id, { enterRequirement: Object.keys(req).length ? req : undefined });
        }}
        deckIds={deckIds}
        foeIds={foeIds}
      />

      <div style={{ marginTop: 16 }}>
        <button style={dangerBtn} onClick={() => deleteRoom(room.id)}>
          Delete room
        </button>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  padding: 12,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};
const headerStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--c-text)',
  marginBottom: 6,
};
const checkRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 12,
  color: 'var(--c-text-2)',
  cursor: 'pointer',
};
const hintStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text-faint)',
  marginTop: 14,
  lineHeight: 1.5,
};
