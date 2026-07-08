// DungeonBuilderView — the first-class dungeon builder (center 'Dungeons' view). 3-zone layout:
// dungeon list rail · map canvas · room/dungeon editor. Owns selection and all edit→store wiring via
// commitDungeons (which re-syncs the subflow-gated dungeon.room nodes). Import merges { dungeons,
// images }. "Detect rooms" traces the uploaded map; "Add & wire dungeon subflow" connects it to play.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useCreatorStore } from '../store';
import { resizeAndEncode } from '../decks/imageUtils';
import { AssetManagerDialog } from '../decks/AssetManagerDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DungeonListRail } from './DungeonListRail';
import { DungeonMapCanvas } from './DungeonMapCanvas';
import { DungeonEditorPanel } from './DungeonEditorPanel';
import { detectRooms } from './detectRooms';
import {
  dungeonsOf,
  imagesOf,
  resolveImage,
  referencedBySubflow,
  smallBtn,
  primaryBtn,
  type Dungeon,
} from './shared';

function starterDungeon(id: string): Dungeon {
  // A structurally-valid 2-room dungeon (one entrance, one target, reciprocal door) so the Problems
  // panel stays clean the moment a dungeon is created. masterBitmap points at its own (initially
  // dangling) image key — resolved once the author uploads a map.
  return {
    id,
    name: id,
    trait: 'Magic',
    grid: { cols: 2, rows: 1 },
    masterBitmap: `${id}-map`,
    rooms: [
      { id: 'room-entry', name: 'Entrance', cell: { col: 0, row: 0 }, exits: { E: 'door' }, isEntrance: true },
      { id: 'room-target', name: 'Target', cell: { col: 1, row: 0 }, exits: { W: 'door' }, isTarget: true },
    ],
  };
}

export function DungeonBuilderView() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const commitDungeons = useCreatorStore((s) => s.commitDungeons);
  const updateResourceImage = useCreatorStore((s) => s.updateResourceImage);
  const addDungeonSubflow = useCreatorStore((s) => s.addDungeonSubflow);
  const setDungeonSelection = useCreatorStore((s) => s.setDungeonSelection);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [confirmDetect, setConfirmDetect] = useState(false);

  useEffect(() => {
    setDungeonSelection(selectedId);
  }, [selectedId, setDungeonSelection]);

  if (!schemaDoc) {
    return <div style={{ padding: 24, color: 'var(--c-text-muted)' }}>Load a scenario to build dungeons.</div>;
  }

  const dungeons = dungeonsOf(schemaDoc);
  const images = imagesOf(schemaDoc);
  const ids = Object.keys(dungeons);

  // Keep selection valid & non-null whenever dungeons exist (adjust during render, like DeckBuilderView).
  const selectionValid = selectedId !== null && selectedId in dungeons;
  if (!selectionValid) {
    if (ids.length > 0) {
      setSelectedId(ids[0]);
      setSelectedRoomId(null);
    } else if (selectedId !== null) {
      setSelectedId(null);
      setSelectedRoomId(null);
    }
  }

  const selected = selectedId ? dungeons[selectedId] : undefined;

  const commit = (next: Dungeon) => commitDungeons({ ...dungeons, [next.id]: next });

  const addDungeon = (id: string) => {
    commitDungeons({ ...dungeons, [id]: starterDungeon(id) });
    setSelectedId(id);
    setSelectedRoomId(null);
  };

  const removeDungeon = (id: string) => {
    const next = { ...dungeons };
    delete next[id];
    commitDungeons(next);
    setPendingDelete(null);
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedRoomId(null);
    }
  };

  const importFragment = (fragment: Record<string, unknown>) => {
    const incomingImages = (fragment.images as Record<string, string> | undefined) ?? {};
    for (const [k, v] of Object.entries(incomingImages)) {
      if (typeof v === 'string') updateResourceImage(k, v);
    }
    const incomingDungeons = (fragment.dungeons as Record<string, Dungeon> | undefined) ?? {};
    if (Object.keys(incomingDungeons).length > 0) {
      commitDungeons({ ...dungeons, ...incomingDungeons });
      setSelectedId(Object.keys(incomingDungeons)[0]);
      setSelectedRoomId(null);
    }
  };

  const uploadMap = async (file: File) => {
    if (!selected) return;
    try {
      const url = await resizeAndEncode(file, { maxW: 1024, maxH: 1024, capBytes: 400_000 });
      const key = selected.masterBitmap || `${selected.id}-map`;
      updateResourceImage(key, url);
      commit({ ...selected, masterBitmap: key });
    } catch {
      // upload failure is non-fatal; the picker still shows "no map"
    }
  };

  const doDetect = async () => {
    if (!selected) return;
    const url = resolveImage(schemaDoc, selected.masterBitmap);
    if (!url) return;
    setDetecting(true);
    try {
      const rooms = await detectRooms(url, selected.grid.cols, selected.grid.rows);
      if (rooms.length > 0) {
        commit({ ...selected, rooms });
        setSelectedRoomId(null);
      }
    } finally {
      setDetecting(false);
    }
  };

  // Detect replaces the whole room list, so it must never silently discard hand-authored rooms
  // (names/effects/doors). Confirm first whenever the dungeon already has any; run straight through
  // only when there's nothing to lose. (Uploading a map only sets masterBitmap — it leaves rooms be.)
  const requestDetect = () => {
    if (!selected) return;
    if (selected.rooms.length > 0) setConfirmDetect(true);
    else void doDetect();
  };

  const hasSubflow = selectedId ? referencedBySubflow(schemaDoc, selectedId) : false;
  const mapUrl = selected ? resolveImage(schemaDoc, selected.masterBitmap) : undefined;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <DungeonListRail
        ids={ids}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedRoomId(null);
        }}
        onAdd={addDungeon}
        onRemove={setPendingDelete}
        onImport={importFragment}
      />

      {selected ? (
        <>
          <div style={centerCol}>
            <div style={headerBar}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{selected.name || selected.id}</span>
              <span style={{ flex: 1 }} />
              <button style={smallBtn} disabled={!mapUrl || detecting} onClick={requestDetect}>
                {detecting ? 'Detecting…' : 'Detect rooms from image'}
              </button>
              {hasSubflow ? (
                <span style={subflowBadge}>✓ wired (dungeon.subflow)</span>
              ) : (
                <button style={primaryBtn} onClick={() => addDungeonSubflow(selected.id)}>
                  Add &amp; wire dungeon subflow
                </button>
              )}
            </div>
            <DungeonMapCanvas
              dungeon={selected}
              imageUrl={mapUrl}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              onChange={commit}
            />
          </div>

          <div style={editorCol}>
            <DungeonEditorPanel
              doc={schemaDoc}
              dungeon={selected}
              selectedRoomId={selectedRoomId}
              onChange={commit}
              onSelectRoom={setSelectedRoomId}
              onManageImages={() => setAssetOpen(true)}
              onUploadMap={uploadMap}
            />
          </div>
        </>
      ) : (
        <div style={{ flex: 1, padding: 24, color: 'var(--c-text-muted)' }}>
          Add a dungeon to begin, or import a dungeons JSON fragment.
        </div>
      )}

      {assetOpen && (
        <AssetManagerDialog
          doc={schemaDoc}
          images={images}
          onSetImage={updateResourceImage}
          onClose={() => setAssetOpen(false)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete dungeon?"
          message={`Delete "${pendingDelete}" and its room nodes? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => removeDungeon(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {confirmDetect && selected && (
        <ConfirmDialog
          title="Replace rooms with detected layout?"
          message={`Detecting rooms from the image will replace this dungeon's ${selected.rooms.length} existing room${
            selected.rooms.length === 1 ? '' : 's'
          } — including any names, effects, and doors you've set. This cannot be undone.`}
          confirmLabel="Replace rooms"
          onConfirm={() => {
            setConfirmDetect(false);
            void doDetect();
          }}
          onCancel={() => setConfirmDetect(false)}
        />
      )}
    </div>
  );
}

const centerCol: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: 12,
  gap: 10,
  overflow: 'auto',
};
const editorCol: CSSProperties = {
  width: 320,
  flex: '0 0 320px',
  borderLeft: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};
const headerBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};
const subflowBadge: CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 4,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-success, #16a34a)',
};
