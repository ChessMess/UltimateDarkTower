# Authoring `pocket_<side>_<level>` volumes in Blender

This is a step-by-step guide for adding the 12 optional "pocket" volumes to
`tower.glb` that let the physics sim (`/physics`'s `getSkullsBySeal()`) know
exactly which seal opening a resting skull is behind. It assumes you rarely
open Blender — every menu is spelled out.

You do **not** need to do this to use `getSkullsBySeal()` at all: without
these volumes, the sim automatically falls back to a nearest-seal heuristic
(see [PHYSICS.md §Counting skulls](PHYSICS.md#counting-skulls)). This guide is
for making that attribution exact instead of approximate.

## 1. What a pocket is and why

Behind each of the 12 seal panels is a compartment where a dropped skull can
come to rest. A "pocket" is an invisible box you place in that compartment,
named `pocket_<side>_<level>` (e.g. `pocket_north_top`). At runtime, the
library checks whether each resting skull's center falls inside that box — an
exact test, instead of guessing from distance to the seal alone. Pockets are
never rendered (the loader force-hides any `pocket_*` node) and never
collide with anything — they're pure markers.

## 2. Before you start

- **Prefer editing the original `.blend` file**, if you have it. If you only
  have `tower.glb`, you can `File → Import → glTF 2.0 (.glb/.gltf)` and work
  from that — but re-exporting a Draco-compressed import re-quantizes
  vertices that are already quantized once. Expect a slightly different file
  size and tiny (sub-visible) vertex drift. This is a real caveat, not a
  footnote — if you have the source `.blend`, use it.
- **Blender is Z-up; glTF is Y-up.** The exporter converts between them
  automatically (`+Y Up`, on by default — see the export checklist below).
  Every coordinate in this guide is given in **Blender's own coordinate
  system**, not glTF's. The one consequence worth memorizing: **"north" is
  Blender `−Y`**, "south" is `+Y`, "east" is `+X`, "west" is `−X`. (Height is
  Blender `+Z` either way — that axis doesn't flip.)
- **Reference table** — measured directly from the current `tower.glb`, given
  here in Blender coordinates, so you can sanity-check what you're looking at
  once it's imported:

  | Node                          | Radius (X/Y plane) | Height (Z)    |
  | ----------------------------- | ------------------ | ------------- |
  | `drum_top`                    | 3.75               | 11.91 … 16.66 |
  | `drum_middle`                 | 4.40               | 6.23 … 10.98  |
  | `drum_bottom`                 | 5.00               | 0.55 … 5.30   |
  | base (`Return to Dark Tower`) | 5.70               | −4.14 … −0.28 |

  Each seal panel sits just outside its drum: `seal_*_top` at radius ~4.14,
  `seal_*_middle` at ~4.83, `seal_*_bottom` at ~5.46.

## 3. Adding one pocket — worked example (`pocket_north_top`)

Use the snap-to-seal workflow below so you never have to type a coordinate by
hand, and the axis convention from step 2 can't bite you.

1. In the **Outliner** (the object list, top-right of the default layout),
   click `seal_north_top` to select it.
2. Hover over the 3D viewport and press `Shift+S` to open the **Snap** pie
   menu, then choose **Cursor to Selected**. The 3D cursor jumps to the
   seal's origin.
3. In the 3D viewport's header bar (top of the viewport, not the Outliner),
   click **Add → Mesh → Cube**. The cube spawns centered on the 3D cursor —
   i.e., right at the seal.
4. Press `N` to open the sidebar panel on the right edge of the viewport, and
   select the **Item** tab if it isn't already active. Under **Dimensions**,
   type in roughly the compartment's size (start with something like `1.5,
1.5, 2` and adjust by eye), then use the Move (`G`) and Scale (`S`) tools
   to fit the box into the space directly behind the seal: its outward face
   flush against the seal panel, its outer edge at the drum's inner wall, and
   its bottom resting on the drum floor.
5. **Err on the large side.** A skull whose center sits just outside a
   too-tight box will be reported as `unattributed` instead of behind this
   seal. It's fine if this box overlaps its neighbor slightly near the
   diagonal between two seals — ties there go to whichever pocket a skull's
   center is inside first, which is an acceptable ambiguity at that boundary.
6. Rename the **object** (double-click its name in the Outliner — not the
   mesh data underneath it, which can keep its default name) to exactly
   `pocket_north_top`. All lowercase, exact spelling — this name is read
   directly as the glTF node name.
7. **Leave it unparented**, sitting at the top level of the scene. Every
   existing node in this model — every `seal_*` and `drum_*` — is already
   unparented the same way, so this matches.
8. **Do not** use `Object → Apply → Transform → Rotation` on this object (or
   any pocket). The code tests containment using the box's _local-space_
   bounding box; applying rotation bakes it into the vertex data and inflates
   that local box past the volume you actually shaped. (Applying location or
   scale is harmless — just unnecessary.)
9. Don't worry about material or viewport visibility — the loader hides every
   `pocket_*` node at runtime regardless. Just make sure it's **not** hidden
   in the Outliner (no closed-eye icon) before you export, or the exporter
   may drop it — see the "Limit to" setting below.

## 4. The other 11

Repeat the recipe above for the remaining 11 seals. Using `Alt+D` (linked
duplicate) from an existing pocket and moving/renaming the copy is fine — the
tool only reads each pocket's own geometry bounds, never mutates them, so
sharing mesh data between pockets causes no problems.

Full name list — `pocket_<side>_<level>` for every combination:

```
pocket_north_top     pocket_east_top     pocket_south_top     pocket_west_top
pocket_north_middle  pocket_east_middle  pocket_south_middle  pocket_west_middle
pocket_north_bottom  pocket_east_bottom  pocket_south_bottom  pocket_west_bottom
```

All 12 must be present for the exact (pocket-based) attribution to activate —
see the "Troubleshooting" table below for what happens with a partial set.

## 5. Export settings

`File → Export → glTF 2.0 (.glb/.gltf)`. Match these settings — verified
against the file currently checked into this repo:

- **Format**: `glTF Binary (.glb)`.
- **Include → Limit to**: make sure `Selected Objects`, `Visible Objects`,
  `Renderable Objects`, and `Active Collection` are all **unchecked**. If
  `Visible Objects` is checked and you hid your pockets in the viewport
  while working, they'll silently vanish from the export.
- **Transform → +Y Up**: **checked** (this is the default). This is what
  lets you work entirely in Blender's own Z-up coordinates while the
  exported file comes out in the Y-up convention three.js expects.
- **Data → Mesh → Apply Modifiers**: checked.
- **Compression (Draco)**: **turn this on — it is required, not optional.**
  The file already checked into this repo declares Draco compression as
  required (`extensionsRequired: ["KHR_draco_mesh_compression"]`), and the
  project's asset-size budget assumes it (the current file is 2.4 MB
  compressed). Leave the quantization settings at their defaults
  (compression level 6; Position 14, Normal 10, Tex Coord 12, Color 10,
  Generic 12 bits). Exporting without compression will make the file roughly
  10x larger.
- The model has no image textures and 6 materials, so texture-related export
  options don't matter here.
- Save over `packages/assets/models/tower.glb`, then commit it through the
  normal git flow. (The model moved out of `packages/display/src/3d/assets/`
  when the game art was centralized into `@udtc/assets`; this package's build
  copies it into `dist/3d/assets/tower.glb`, which is still where consumers
  reference it.)

## 6. The one hard constraint: keep every pocket inside the tower's silhouette

The library measures the whole model's bounding box (`ModelLoader.ts`) to
derive its overall scale (`modelRadius`, the tower's top/bottom Y) — and that
measurement **includes hidden objects**, not just visible ones. If a pocket
box extends past the tower's existing outer surfaces, it will silently grow
that measured scale, and that scale feeds gravity strength, where skulls
spawn, the out-of-bounds despawn threshold, and the game-board floor size. A
sim-wide side effect from one invisible box you placed slightly too large.

Since every pocket lives _inside_ an existing compartment, this should never
come up in ordinary use — treat it as a "don't get creative" guardrail, not a
practical limitation.

## 7. Verify

Work through these in order — each tells you something different broke if it
fails:

1. **Check the exported file size** is in the same ballpark as the original
   (roughly 2.4 MB). A file several times larger almost certainly means Draco
   compression wasn't enabled.
2. Run `pnpm dev:display` and open the browser console. On model load you
   should see a line like `seal attribution mode: pocket`, with **no**
   preceding warning about missing pocket nodes. If you see `mode: nearest`
   plus a warning, some pocket names didn't match — the warning lists exactly
   which ones.
3. In the running demo, drop a few skulls and break a seal (via the seal
   toggle grid). Watch the "Behind seals" readout below the skull counts —
   the numbers should match what you can see happening in the 3D view.
4. Rotate a drum using the N/E/S/W buttons in the drum rotation grid. Any
   skull resting on that drum is carried around with it, and the "Behind
   seals" readout should update to reflect its new compartment. If it
   doesn't move, or moves to the wrong seal, double check the specific
   pocket's placement and name.

## 8. Troubleshooting

| Symptom                                                                                                            | Likely cause                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console always reports `mode: nearest`, with a warning listing missing pockets.                                    | One or more `pocket_*` object names are misspelled, or one wasn't exported (see the "Limit to" export setting). The warning names exactly which ones are missing — fix those and re-export.                                  |
| Skulls resting in a compartment show up as "loose" (`unattributed`) instead of behind that seal.                   | The pocket box is too small, or `Object → Apply → Rotation` was used on it (inflating its local bounding box away from the actual shaped volume — re-check step 8 in the worked example). Make the box larger and re-export. |
| One compartment's pocket keeps claiming skulls that are actually resting in the neighboring compartment.           | That pocket's box is too large and overlaps its neighbor further than intended — shrink it along the shared boundary.                                                                                                        |
| Grey/untextured boxes are visible in the 3D view.                                                                  | You're running against a stale build, or a pocket wasn't named with the `pocket_` prefix (the display library hides nodes by exact name match at load time).                                                                 |
| Physics behaves oddly after the model update (skulls fall too fast/slow, spawn in the wrong place, despawn early). | A pocket extends outside the tower's existing outer silhouette — see §6. Shrink it back inside the tower's other geometry and re-export.                                                                                     |

## See also

- [PHYSICS.md §Counting skulls](PHYSICS.md#counting-skulls) — how
  `getSkullsBySeal()` uses these volumes (and the nearest-seal fallback when
  they're absent).
- [ARCHITECTURE.md](ARCHITECTURE.md) and
  [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — the model's other named-node
  contracts (`drum_top`/`drum_middle`/`drum_bottom`, `seal_<side>_<level>`).
