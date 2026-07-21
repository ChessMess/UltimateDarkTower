// BoardBuilderView — the first-class Board Designer (center 'Boards' view). 3-zone layout:
// board list rail · map canvas · editor panel. Owns selection/mode and all edit→store wiring via
// commitBoards + setActiveBoard.
//
// Supersedes packages/core/tools/location-marker for authoring CUSTOM boards; that standalone tool
// remains the generator for the built-in RtDT board data (gen-board-data.mjs).

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useCreatorStore } from '../store';
import { resizeAndEncode } from '../decks/imageUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BoardListRail } from './BoardListRail';
import { BoardMapCanvas } from './BoardMapCanvas';
import type { BoardEditMode } from './BoardMapCanvas';
import { BoardEditorPanel } from './BoardEditorPanel';
import { buildRtdtPreset } from './presetRtdt';
import {
  BOARD_IMAGE_OPTS,
  IMAGE_BUDGET_BYTES,
  activeBoardId,
  boardArtBytes,
  boardImageKey,
  boardsOf,
  hasStoredArt,
  resolveBoardArt,
  smallBtn,
  primaryBtn,
  suggestAdjacency,
  toggleAdjacency,
} from './shared';
import type { AnchorSlot, Board } from './shared';

const MODES: Array<{ id: BoardEditMode; label: string }> = [
  { id: 'locations', label: 'Locations' },
  { id: 'anchors', label: 'Anchors' },
  { id: 'adjacency', label: 'Adjacency' },
  { id: 'calibrate', label: 'Calibrate' },
];

function emptyBoard(id: string): Board {
  return {
    id,
    name: id,
    imageInfo: { width: 2048, height: 2048 },
    locations: [],
    anchors: {},
    adjacency: {},
  };
}

/** True when setup.board holds a hand-authored inline boardState with real content. */
function hasAuthoredBoardState(setup: Record<string, unknown> | undefined): boolean {
  const board = setup?.board;
  if (board === null || typeof board !== 'object' || Array.isArray(board)) return false;
  const inline = (board as Record<string, unknown>).boardState;
  if (inline === null || typeof inline !== 'object' || Array.isArray(inline)) return false;
  const s = inline as Record<string, unknown>;
  const home = s.home as Record<string, unknown> | undefined;
  const buildings = s.buildings as unknown[] | undefined;
  return Boolean(
    (home && Object.keys(home).length > 0) || (Array.isArray(buildings) && buildings.length > 0),
  );
}

export function BoardBuilderView() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const commitBoards = useCreatorStore((s) => s.commitBoards);
  const setActiveBoard = useCreatorStore((s) => s.setActiveBoard);
  const updateResourceImage = useCreatorStore((s) => s.updateResourceImage);
  const setBoardSelection = useCreatorStore((s) => s.setBoardSelection);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardEditMode>('locations');
  const [activeSlot, setActiveSlot] = useState<AnchorSlot>('hero');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingActivate, setPendingActivate] = useState<string | null>(null);

  useEffect(() => {
    setBoardSelection(selectedId);
  }, [selectedId, setBoardSelection]);

  if (!schemaDoc) {
    return (
      <div style={{ padding: 24, color: 'var(--c-text-muted)' }}>
        Load a scenario to design boards.
      </div>
    );
  }

  const boards = boardsOf(schemaDoc);
  const ids = Object.keys(boards);
  const activeId = activeBoardId(schemaDoc);

  // Keep selection valid & non-null whenever boards exist (adjust during render, as the
  // dungeon/deck builders do).
  const selectionValid = selectedId !== null && selectedId in boards;
  if (!selectionValid) {
    if (ids.length > 0) setSelectedId(ids[0]);
    else if (selectedId !== null) setSelectedId(null);
  }

  const selected = selectedId ? boards[selectedId] : undefined;
  const commit = (next: Board) => commitBoards({ ...boards, [next.id]: next });

  const addBoard = (id: string, board: Board) => {
    commitBoards({ ...boards, [id]: board });
    setSelectedId(id);
    setSelectedLocation(null);
  };

  const removeBoard = (id: string) => {
    const next = { ...boards };
    delete next[id];
    // commitBoards restores the implicit RtDT board if this was the active one.
    commitBoards(next);
    updateResourceImage(boardImageKey(id), null);
    setPendingDelete(null);
    if (selectedId === id) setSelectedId(null);
  };

  const uploadArt = async (file: File) => {
    if (!selected) return;
    try {
      const url = await resizeAndEncode(file, BOARD_IMAGE_OPTS);
      const key = boardImageKey(selected.id);
      // The stored art defines the image space the anchors are normalized against, so record
      // its real dimensions — the renderer scales token geometry from them.
      const dims = await imageDims(url);
      updateResourceImage(key, url);
      commit({
        ...selected,
        imageRef: key,
        imageInfo: { ...selected.imageInfo, width: dims.width, height: dims.height },
      });
    } catch {
      // upload failure is non-fatal; the board keeps its previous art
    }
  };

  /** "Use in game" — guarded, because {boardRef} and an inline {boardState} are exclusive. */
  const toggleActive = () => {
    if (!selected) return;
    if (activeId === selected.id) {
      setActiveBoard(null);
      return;
    }
    if (hasAuthoredBoardState(schemaDoc.setup as Record<string, unknown>)) {
      setPendingActivate(selected.id);
      return;
    }
    setActiveBoard(selected.id);
  };

  const artBytes = boardArtBytes(schemaDoc);
  const overBudget = artBytes > IMAGE_BUDGET_BYTES * 0.8;
  // Only STORED art counts here — a board referencing the built-in RtDT art contributes no bytes,
  // so it must not bring up the shared-budget meter.
  const artedBoards = ids.filter((id) => hasStoredArt(schemaDoc, boards[id])).length;

  return (
    <div style={layout}>
      <BoardListRail
        ids={ids}
        selectedId={selectedId}
        activeId={activeId}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedLocation(null);
        }}
        onAdd={(id) => addBoard(id, emptyBoard(id))}
        onClonePreset={(id) => addBoard(id, buildRtdtPreset(id))}
        onRemove={(id) => setPendingDelete(id)}
      />

      <div style={center}>
        <div style={toolbar}>
          {MODES.map((m) => (
            <button
              key={m.id}
              style={m.id === mode ? primaryBtn : smallBtn}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {artedBoards > 1 && (
            <span
              style={{ fontSize: 11, color: overBudget ? '#f87171' : 'var(--c-text-muted)' }}
              title="library.boards is a map — every board's art shares one export-size budget"
            >
              board art {(artBytes / 1_000_000).toFixed(1)} MB /{' '}
              {(IMAGE_BUDGET_BYTES / 1_000_000).toFixed(0)} MB
              {overBudget ? ' — autosave may fail' : ''}
            </span>
          )}
        </div>

        {selected ? (
          <BoardMapCanvas
            board={selected}
            imageUrl={resolveBoardArt(schemaDoc, selected)}
            mode={mode}
            selectedLocation={selectedLocation}
            activeSlot={activeSlot}
            adjacencyFrom={mode === 'adjacency' ? selectedLocation : null}
            onSelectLocation={setSelectedLocation}
            onPlaceAnchor={(name, slot, at) =>
              commit({
                ...selected,
                anchors: {
                  ...(selected.anchors ?? {}),
                  [name]: { ...(selected.anchors?.[name] ?? {}), [slot]: at },
                },
              })
            }
            onToggleAdjacency={(a, b) =>
              commit({ ...selected, adjacency: toggleAdjacency(selected, a, b) })
            }
            onCalibrate={(patch) =>
              commit({ ...selected, imageInfo: { ...selected.imageInfo, ...patch } })
            }
          />
        ) : (
          <div style={{ padding: 24, color: 'var(--c-text-muted)', fontSize: 13 }}>
            No board selected. Clone the RtDT preset to start from the built-in board, or add an
            empty one.
          </div>
        )}
      </div>

      {selected && (
        <BoardEditorPanel
          board={selected}
          isActive={activeId === selected.id}
          mode={mode}
          activeSlot={activeSlot}
          selectedLocation={selectedLocation}
          onChange={commit}
          onSelectLocation={setSelectedLocation}
          onActiveSlot={setActiveSlot}
          onUploadArt={uploadArt}
          onToggleActive={toggleActive}
          onSuggestAdjacency={() => commit({ ...selected, adjacency: suggestAdjacency(selected) })}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete board"
          message={
            <>
              Delete <strong>{pendingDelete}</strong> and its art?
              {pendingDelete === activeId && (
                <> The game will go back to the built-in Return to Dark Tower board.</>
              )}
            </>
          }
          onConfirm={() => removeBoard(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingActivate && (
        <ConfirmDialog
          title="Replace the authored board setup?"
          message={
            <>
              This scenario has a hand-authored <code>setup.board.boardState</code> (hero start
              locations and the buildings registry). A custom board replaces it — the two are
              mutually exclusive.
              <br />
              <br />
              Switching back to the built-in board in this session restores it, but that stash is
              not saved to the file.
            </>
          }
          confirmLabel="Use custom board"
          onConfirm={() => {
            setActiveBoard(pendingActivate);
            setPendingActivate(null);
          }}
          onCancel={() => setPendingActivate(null)}
        />
      )}
    </div>
  );
}

/** Natural dimensions of an encoded data URL — the image space anchors are normalized against. */
function imageDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 2048, height: 2048 });
    img.src = url;
  });
}

const layout: CSSProperties = {
  display: 'flex',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};

const center: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
};

const toolbar: CSSProperties = {
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  padding: 8,
  borderBottom: '1px solid var(--c-border)',
};
