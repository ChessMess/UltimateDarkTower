# Tower Emulator — 3D Web-Based Virtual Dark Tower

**Status:** Research & Design Document
**Date:** 2026-03-21
**Audience:** Engineers, 3D artists, product stakeholders

---

## Table of Contents

- [1. Vision](#1-vision)
- [2. The Physical Tower — Complete Reference](#2-the-physical-tower--complete-reference)
  - [2.1 Overall Shape and Dimensions](#21-overall-shape-and-dimensions)
  - [2.2 Exterior Shell — Materials and Colors](#22-exterior-shell--materials-and-colors)
  - [2.3 Seals (12 Removable Panels)](#23-seals-12-removable-panels)
  - [2.4 Rotating Drums (3 Levels)](#24-rotating-drums-3-levels)
  - [2.5 Glyphs (Behind Seals)](#25-glyphs-behind-seals)
  - [2.6 LED Lighting System (24 LEDs)](#26-led-lighting-system-24-leds)
  - [2.7 Audio System](#27-audio-system)
  - [2.8 Skull Drop Mechanism](#28-skull-drop-mechanism)
  - [2.9 Base and Board Integration](#29-base-and-board-integration)
- [3. Architecture — How the Emulator Connects](#3-architecture--how-the-emulator-connects)
- [4. Technology Stack](#4-technology-stack)
- [5. 3D Model Requirements](#5-3d-model-requirements)
  - [5.1 Geometry Breakdown](#51-geometry-breakdown)
  - [5.2 Material Requirements](#52-material-requirements)
  - [5.3 Model Creation Approaches](#53-model-creation-approaches)
  - [5.4 AI-Powered 3D Model Generation](#54-ai-powered-3d-model-generation)
- [6. Rendering and Visual Effects](#6-rendering-and-visual-effects)
  - [6.1 LED Glow Effects](#61-led-glow-effects)
  - [6.2 Seal Animations](#62-seal-animations)
  - [6.3 Drum Rotation Animation](#63-drum-rotation-animation)
  - [6.4 Skull Drop Animation](#64-skull-drop-animation)
  - [6.5 LED Sequence Animations](#65-led-sequence-animations)
  - [6.6 Post-Processing Effects](#66-post-processing-effects)
- [7. Audio System](#7-audio-system)
  - [7.1 Complete Sound Library](#71-complete-sound-library)
  - [7.2 Web Audio API Implementation](#72-web-audio-api-implementation)
- [8. State Management and Protocol Integration](#8-state-management-and-protocol-integration)
  - [8.1 Connecting to the Host](#81-connecting-to-the-host)
  - [8.2 Decoding Tower Commands](#82-decoding-tower-commands)
  - [8.3 State-to-Visual Mapping](#83-state-to-visual-mapping)
- [9. User Interface and Interaction](#9-user-interface-and-interaction)
- [10. Implementation Plan](#10-implementation-plan)
  - [10.1 Phase 1 — Static Model and Scene](#101-phase-1--static-model-and-scene)
  - [10.2 Phase 2 — LED System](#102-phase-2--led-system)
  - [10.3 Phase 3 — Mechanical Animation](#103-phase-3--mechanical-animation)
  - [10.4 Phase 4 — Audio](#104-phase-4--audio)
  - [10.5 Phase 5 — Protocol Integration](#105-phase-5--protocol-integration)
  - [10.6 Phase 6 — Polish and Deployment](#106-phase-6--polish-and-deployment)
- [11. Performance Considerations](#11-performance-considerations)
- [12. Open Questions](#12-open-questions)
- [Appendix A — Tower Command Packet Structure](#appendix-a--tower-command-packet-structure)
- [Appendix B — Complete Audio Sample Index](#appendix-b--complete-audio-sample-index)
- [Appendix C — LED Layer and Channel Map](#appendix-c--led-layer-and-channel-map)
- [Appendix D — Glyph-to-Drum Position Map](#appendix-d--glyph-to-drum-position-map)

---

## 1. Vision

Create a standalone web application that renders a **photorealistic 3D replica** of the physical Return to Dark Tower tower in a web browser. This emulator:

- Connects to the DarkTowerSync host as an observer client via WebSocket.
- Receives the same 20-byte tower commands that drive real hardware.
- Renders all tower behavior in real-time: LED illumination, drum rotation, seal states, glyph reveals, skull drops, and audio playback.
- Produces an experience indistinguishable from watching a real physical tower — a fully software-based tower replacement.

The emulator is a **separate client application** that runs entirely in the browser. It does not modify or depend on the existing client codebase except for shared protocol types. It is **read-only** — it observes and renders, never sends commands.

---

## 2. The Physical Tower — Complete Reference

### 2.1 Overall Shape and Dimensions

The Return to Dark Tower is a physical mechatronic tower manufactured by Restoration Games (designed by Tim Burrell-Saward of Beasts of Balance fame). It went through 8 major design revisions before the final production version.

| Property | Value |
| --- | --- |
| Height | ~12 inches (30 cm) |
| Shape | Tapered cylinder — wider at the base, narrowing toward the top |
| Cross-section | Roughly round/octagonal with four distinct "faces" (N, E, S, W) |
| Weight | Substantial — robust mechanized plastic construction |
| Power | 3 × AA batteries |
| Connectivity | Bluetooth Low Energy (Nordic UART Service) |
| Manufacturer | Restoration Games LLC |
| Model designation | "ReturnToDarkTower" |
| Hardware revision | 1.11 |
| Firmware | Git commit `79556657694099f3ca293f534b9cc5b55bfeaa31` |

**Structural tiers (bottom to top):**

1. **Base** — Wide foundation that sits on the game board. Contains base LEDs and skull exit openings on all four sides. The base connects to four C-shaped board segments that surround it.
2. **Ledge** — A protruding rim/shelf between the base and the main tower body. Contains 4 ledge LEDs at ordinal positions (NE, SE, SW, NW).
3. **Main body** — The central column containing three tiers of seal openings (bottom, middle, top rings). Each tier has 4 openings, one on each face (N, E, S, W). Behind each opening is a rotating drum. Contains 12 ring LEDs (4 per tier).
4. **Crown/Top** — The tapered upper section with a central well/funnel where skulls are dropped in. The top narrows to the skull entry hole.

### 2.2 Exterior Shell — Materials and Colors

The tower's exterior is crafted from **dark red translucent plastic** that generally appears **black** under normal lighting. When the internal LEDs illuminate, the shell **glows red** from within, creating an ominous, foreboding effect. This is a defining visual characteristic.

| Element | Material / Color |
| --- | --- |
| Outer shell (stone sections) | Dark red/near-black plastic with natural stone texture — weathered, craggy surface detail |
| Crystal sections | Blood-red semi-transparent plastic, smooth faceted surfaces — these glow most prominently when backlit |
| Seals | Dark plastic panels with semi-translucent backing for LED illumination from behind |
| Interior drums | Dark plastic with glyph symbols molded/printed on specific faces |
| Skulls | Black plastic miniatures with wash for detail |

The juxtaposition between weathered stone textures and smooth crystal facets is key to the tower's visual identity. The stone sections appear ancient and crumbling; the crystal sections appear sharp and supernatural.

### 2.3 Seals (12 Removable Panels)

The tower has **12 seals** — small rectangular plastic panels that slide onto the tower to cover the openings on each face.

**Layout:**

```
            NORTH face
         ┌─────────────┐
         │  Top Seal    │  ← Layer 0 (Top Ring)
         │  Middle Seal │  ← Layer 1 (Middle Ring)
         │  Bottom Seal │  ← Layer 2 (Bottom Ring)
         └─────────────┘

  Same pattern on EAST, SOUTH, WEST faces
  = 4 faces × 3 seals = 12 seals total
```

**Seal behavior:**
- At game start, all 12 seals are in place (tower fully sealed).
- The companion app commands the tower to "reveal" a seal via the `sealReveal` LED sequence (byte 19 = `0x0e`).
- The tower performs a light animation, then illuminates the specific seal to be removed.
- Edge lights (ledge/base) indicate which **face** (N/E/S/W) the seal is on.
- The seal's own backlight indicates **which tier** (top/middle/bottom) to remove.
- Players physically slide the seal panel up and off.
- Removing a seal either reveals an **opening** (where skulls can exit) or a **glyph** on the drum behind it.

**For the 3D emulator:** Seals should be modeled as separate meshes that can animate (slide upward and fade/disappear) when removed. Their semi-translucent backing should glow when backlit by LEDs.

### 2.4 Rotating Drums (3 Levels)

Behind the seals, three **independently rotating drums** form the tower's interior mechanism.

| Drum | Position | Stopping positions | Glyphs |
| --- | --- | --- | --- |
| Top drum | Layer 0 | 4 (N, E, S, W) | Cleanse (N), Quest (S) |
| Middle drum | Layer 1 | 4 (N, E, S, W) | Battle (N) |
| Bottom drum | Layer 2 | 4 (N, E, S, W) | Banner (N), Reinforce (S) |

Each drum:
- Rotates to one of 4 cardinal positions.
- Uses photo-reflector (IR) sensors with white markings on the drum surface for position detection.
- Has **4 faces**, some showing glyph symbols, others showing openings (holes where skulls can exit).
- Has status flags: `calibrated`, `jammed`, `playSound`, `reverse`.

**For the 3D emulator:** Each drum should be a separate rotatable cylinder mesh inside the tower body. Drum rotation should be animated smoothly with easing when the position changes between state updates.

### 2.5 Glyphs (Behind Seals)

When a seal is removed, it may reveal a glyph — a symbol on the drum face that forces players to spend spirit to take a specific action. There are **5 distinct glyphs**:

| Glyph | Action | Drum Level | Drum Face (calibrated) |
| --- | --- | --- | --- |
| **Cleanse** | Remove all skulls from a building | Top | North |
| **Quest** | Complete a quest or explore dungeon | Top | South |
| **Battle** | Engage a foe in combat | Middle | North |
| **Banner** | Take your character's banner ability | Bottom | North |
| **Reinforce** | Use a building's effects | Bottom | South |

The remaining drum faces (East, West on each drum, and some South/North faces) show openings rather than glyphs.

**For the 3D emulator:** Glyph symbols should be texture-mapped or modeled onto the appropriate drum faces. When a seal is removed and the drum is in the correct position, the glyph should be visible through the opening. The glyph should glow subtly when backlit by the ring LEDs.

### 2.6 LED Lighting System (24 LEDs)

The tower contains **24 individually addressable LEDs** organized into 6 logical layers with 4 LEDs each:

```
Layer 0: TOP RING      — 4 LEDs at N, E, S, W      (behind top seal row)
Layer 1: MIDDLE RING   — 4 LEDs at N, E, S, W      (behind middle seal row)
Layer 2: BOTTOM RING   — 4 LEDs at N, E, S, W      (behind bottom seal row)
Layer 3: LEDGE         — 4 LEDs at NE, SE, SW, NW  (on the protruding ledge/rim)
Layer 4: BASE1         — 4 LEDs at NE, SE, SW, NW  (upper base lights)
Layer 5: BASE2         — 4 LEDs at NE, SE, SW, NW  (lower base lights)
```

**Direction systems:**
- **Ring layers (0-2):** Cardinal directions (North, East, South, West)
- **Ledge/Base layers (3-5):** Ordinal directions (North-East, South-East, South-West, North-West)

**LED hardware channel mapping:**

```
Layer 0: Top Ring    → Channels [0, 3, 2, 1]     (N, E, S, W)
Layer 1: Middle Ring → Channels [7, 6, 5, 4]     (N, E, S, W)
Layer 2: Bottom Ring → Channels [10, 9, 8, 11]   (N, E, S, W)
Layer 3: Ledge       → Channels [12, 13, 14, 15]  (NE, SE, SW, NW)
Layer 4: Base1       → Channels [16, 17, 18, 19]  (NE, SE, SW, NW)
Layer 5: Base2       → Channels [20, 21, 22, 23]  (NE, SE, SW, NW)
```

**LED effect types (3-bit values):**

| Value | Name | Visual Effect |
| --- | --- | --- |
| 0 | `off` | LED is dark |
| 1 | `on` | Solid steady illumination |
| 2 | `breathe` | Slow sinusoidal pulsing (period ~3s) |
| 3 | `breatheFast` | Fast sinusoidal pulsing (period ~1s) |
| 4 | `breathe50percent` | Slow pulsing at 50% max brightness |
| 5 | `flicker` | Irregular flame-like flickering |

Each LED also has a 1-bit **loop flag** controlling whether the effect repeats continuously.

**LED Sequence Overrides (byte 19):**

These are pre-programmed animation sequences that override individual LED states:

| Value | Name | Description |
| --- | --- | --- |
| `0x01` | `twinkle` | Gentle twinkling across all LEDs |
| `0x02` | `flareThenFade` | Bright flare followed by fade-out |
| `0x03` | `flareThenFadeBase` | Flare/fade on base LEDs only |
| `0x04` | `flareThenFlicker` | Flare followed by sustained flicker |
| `0x05` | `angryStrobe01` | Aggressive red strobing pattern 1 |
| `0x06` | `angryStrobe02` | Aggressive red strobing pattern 2 |
| `0x07` | `angryStrobe03` | Aggressive red strobing pattern 3 |
| `0x08` | `gloat01` | Triumphant pulsing pattern 1 |
| `0x09` | `gloat02` | Triumphant pulsing pattern 2 |
| `0x0A` | `gloat03` | Triumphant pulsing pattern 3 |
| `0x0B` | `defeat` | Dramatic defeat animation |
| `0x0C` | `victory` | Celebratory victory lights |
| `0x0D` | `dungeonIdle` | Ambient dungeon glow |
| `0x0E` | `sealReveal` | Animation when revealing a seal for removal |
| `0x0F` | `rotationAllDrums` | Accompanies all-drum rotation |
| `0x10` | `rotationDrumTop` | Accompanies top drum rotation |
| `0x11` | `rotationDrumMiddle` | Accompanies middle drum rotation |
| `0x12` | `rotationDrumBottom` | Accompanies bottom drum rotation |
| `0x13` | `monthStarted` | New month beginning animation |

**For the 3D emulator:** This is the most visually critical system. LEDs must:
- Illuminate the correct areas of the tower shell with volumetric/emissive glow.
- The dark red translucent shell should glow when backlit, with light bleeding through realistically.
- Ring LEDs should illuminate the corresponding seal/drum area.
- Ledge and base LEDs should cast light onto the game board surface below.
- All 6 effect types must be implemented as shader animations.
- All 19 sequence overrides must be implemented as scripted animation timelines.

### 2.7 Audio System

The physical tower has a **56mm speaker** and plays audio samples driven by byte 15 of the command packet.

**Audio encoding:**
- Bits 0-6: Sample index (0-127, where 0 = silence)
- Bit 7: Loop flag (0 = play once, 1 = loop continuously)

**Volume control (byte 18, bits 4-7):**
- 0 = Loud (maximum)
- 1 = Medium
- 2 = Quiet
- 3 = Mute

The tower produces a wide range of sounds: adversary themes, battle effects, dungeon ambience, foe spawn sounds, classic 8-bit retro callbacks, seal rotation mechanics, gloating/angry tower moods, and more.

**For the 3D emulator:** The Web Audio API should play matching audio samples. Sound files will need to be sourced or recreated. Volume levels should match the 4-level firmware scheme.

### 2.8 Skull Drop Mechanism

Players drop small black plastic skulls into a **well/funnel at the top** of the tower. Inside, a labyrinth of passages directed by the rotating drum positions routes each skull to one of the openings:

- **Base exits:** 4 openings at the very bottom (one per face) — skulls always have a path to exit here.
- **Drum openings:** When a seal is removed and the drum face behind it shows an opening (not a glyph), skulls can exit at that height.
- **Trapped skulls:** If all seals on a path are closed, skulls accumulate behind them — building up corruption that is released en masse when seals are removed later.

The skull counter is tracked in bytes 16-17 (16-bit beam break counter) using IR beam-break sensors.

**For the 3D emulator:** Animate a skull dropping into the top funnel and tumbling down through the interior when `beam.count` increments. Physics-based or scripted path animation with the skull emerging from the correct opening based on drum positions.

### 2.9 Base and Board Integration

The tower sits at the center of a **circular neoprene game mat** divided into 4 kingdoms (quadrants):

- North, East, South, West kingdoms
- Four C-shaped board segments surround the tower base
- Each C-board segment has 2 small LEDs for base illumination (these are part of the Base1/Base2 LED layers)

**For the 3D emulator:** The scene should include a simple representation of the game board surface below the tower — a dark circular mat with subtle kingdom markings. Base LEDs should cast light onto this surface.

---

## 3. Architecture — How the Emulator Connects

The emulator operates as an **observer client** in the existing DarkTowerSync architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    HOST (Electron/Node)                      │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ FakeTower│────►│ RelayServer  │────►│ WebSocket Server │ │
│  │  (BLE)   │     │ (broadcasts) │     │   (port 8765)    │ │
│  └──────────┘     └──────────────┘     └────────┬─────────┘ │
└─────────────────────────────────────────────────┼───────────┘
                                                  │
            ┌─────────────────────────────────────┼──────┐
            │                                     │      │
    ┌───────▼──────┐  ┌───────▼──────┐  ┌────────▼─────────┐
    │ Player Client│  │ Player Client│  │  TOWER EMULATOR  │
    │  (Browser +  │  │  (Browser +  │  │  (Browser, 3D)   │
    │  real tower) │  │  real tower) │  │  observer: true   │
    └──────────────┘  └──────────────┘  └──────────────────┘
```

**Connection flow:**

1. Emulator opens WebSocket to host at `ws://<host>:<port>`.
2. Sends `client:hello` with `{ observer: true, protocolVersion: "0.1.0", label: "Tower Emulator" }`.
3. Receives `sync:state` with the last command (or null) for immediate catchup.
4. Receives `tower:command` messages continuously.
5. Decodes each 20-byte command using `rtdt_unpack_state()` from the `ultimatedarktower` library.
6. Applies decoded `TowerState` to the 3D scene.
7. Never sends `client:ready` (has no physical tower).

The emulator also handles:
- `relay:paused` / `relay:resumed` — show/hide a pause overlay.
- `host:status` — display connection info.
- Auto-reconnect with exponential backoff on disconnect.

---

## 4. Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| **3D Rendering** | [Three.js](https://threejs.org/) (r170+) | Industry standard WebGL library; massive ecosystem; glTF support; PBR materials; post-processing pipeline |
| **3D Model Format** | glTF 2.0 / GLB | Web-optimized; supports PBR materials, animations, and entire scenes in a single file; native Three.js loader |
| **3D Modeling Tool** | Blender 4.x | Free, exports glTF natively, excellent PBR material authoring, procedural geometry tools |
| **Audio** | Web Audio API | Browser-native; supports spatial audio, gain control, looping, multiple simultaneous sources |
| **WebSocket** | Browser native WebSocket API | No dependencies needed; matches existing protocol |
| **Protocol decode** | `ultimatedarktower` npm package | Already used by the project; provides `rtdt_unpack_state()` and all constants |
| **UI Framework** | Vanilla TypeScript + HTML/CSS | Minimal overhead; the 3D canvas is the primary UI |
| **Build** | Vite | Already used in the project; fast HMR for development |
| **Animation** | Three.js AnimationMixer + GSAP (optional) | Smooth tweening for drum rotation, seal removal |

### Browser Requirements

- WebGL 2.0 (Three.js default since r118)
- Web Audio API
- WebSocket API
- Modern browser: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+

---

## 5. 3D Model Requirements

### 5.1 Geometry Breakdown

The tower model should be built as a **multi-part assembly** with separately animatable components:

```
tower_root (Group)
├── base_platform (Mesh)           — Wide circular/octagonal base
│   ├── base_exit_N (Mesh)         — Skull exit opening, north
│   ├── base_exit_E (Mesh)         — Skull exit opening, east
│   ├── base_exit_S (Mesh)         — Skull exit opening, south
│   └── base_exit_W (Mesh)         — Skull exit opening, west
├── ledge_ring (Mesh)              — Protruding rim/shelf
├── tower_body (Group)             — Main cylindrical body
│   ├── shell_stone (Mesh)         — Outer stone-textured shell
│   └── shell_crystal (Mesh)       — Translucent crystal panels
├── drum_top (Mesh)                — Rotatable, pivot at center axis
│   ├── glyph_cleanse (Mesh)       — Glyph face (north when calibrated)
│   ├── glyph_quest (Mesh)         — Glyph face (south when calibrated)
│   ├── opening_east (Mesh)        — Skull exit opening
│   └── opening_west (Mesh)        — Skull exit opening
├── drum_middle (Mesh)             — Rotatable
│   ├── glyph_battle (Mesh)        — Glyph face (north when calibrated)
│   └── openings... (Mesh)         — 3 skull exit openings
├── drum_bottom (Mesh)             — Rotatable
│   ├── glyph_banner (Mesh)        — Glyph face (north when calibrated)
│   ├── glyph_reinforce (Mesh)     — Glyph face (south when calibrated)
│   └── openings... (Mesh)         — 2 skull exit openings
├── seal_T_N (Mesh)                — Removable seal: top ring, north face
├── seal_T_E (Mesh)                — ... (12 seal meshes total)
├── seal_T_S (Mesh)
├── seal_T_W (Mesh)
├── seal_M_N through seal_M_W      — Middle ring seals
├── seal_B_N through seal_B_W      — Bottom ring seals
├── crown (Mesh)                   — Upper tapered section
│   └── skull_funnel (Mesh)        — Top opening where skulls are dropped
├── led_TR_N (PointLight/Mesh)     — LED: Top Ring North (× 24 total)
│   ... (24 LED light sources)
├── skull_animated (Mesh)          — Animated skull for drop effect
└── board_surface (Mesh)           — Game mat below tower
```

**Polygon budget target:** ~50,000-100,000 triangles total for smooth browser performance.

### 5.2 Material Requirements

| Component | Material Type | Key Properties |
| --- | --- | --- |
| Stone shell | `MeshStandardMaterial` | Dark grey-black diffuse, high roughness (0.85), normal map for stone texture, subtle AO |
| Crystal panels | `MeshPhysicalMaterial` | Dark red base color, transmission: 0.3-0.5, thickness: 2.0, roughness: 0.1, emissive when backlit |
| Seals | `MeshStandardMaterial` | Dark diffuse, translucent backing (separate material with emissive capability for LED backlight) |
| Drums | `MeshStandardMaterial` | Dark grey, low roughness, glyph areas use emissive map |
| Glyph symbols | Emissive texture/decal | Subtle glow when illuminated by ring LEDs |
| Base/ledge | `MeshStandardMaterial` | Match stone texture of shell |
| Board surface | `MeshStandardMaterial` | Dark neoprene texture, very dark with subtle markings |
| Skulls | `MeshStandardMaterial` | Black with slight gloss |

**Critical visual effect — translucent shell glow:**
The defining characteristic of the tower is its dark shell that glows red when lit from within. This can be achieved via:
1. `MeshPhysicalMaterial` with `transmission` for actual light transmission through the crystal panels.
2. Emissive maps on the shell interior that respond to LED state — quick to render, easy to control.
3. A combination: crystal sections use transmission, stone sections use emissive bleeding at edges.

### 5.3 Model Creation Approaches

**Option A — Blender Modeling (Recommended)**

Create the tower model in Blender using reference photos:

1. Model the base shape as a tapered cylinder with architectural detail.
2. Boolean-cut the 12 seal openings and 4 base exits.
3. Model drums as separate cylinders nested inside.
4. Sculpt stone texture onto the shell (or use procedural textures baked to normal maps).
5. Create crystal panel geometry with smooth surfaces.
6. UV-unwrap and apply PBR textures.
7. Export as glTF/GLB with separate objects for animatable parts.
8. Place empties at LED positions for runtime light placement.

**Option B — Procedural Three.js Geometry**

Build the tower programmatically using Three.js primitives:

1. `CylinderGeometry` with varying radii for the tapered shape.
2. `LatheGeometry` for the circular profile.
3. `ExtrudeGeometry` for seal cutouts.
4. CSG (Constructive Solid Geometry) via `three-bvh-csg` for boolean operations.
5. Procedural textures for stone surface.

Option A produces higher visual quality; Option B is faster to iterate and requires no external tools.

**Option C — Hybrid**

Use Blender for the outer shell and visible geometry, but define LED positions and drum pivots in code. This gives artistic control over appearance while keeping animation logic in TypeScript.

### 5.4 AI-Powered 3D Model Generation

A fourth approach leverages AI tools that generate 3D meshes from text prompts or reference images. This could dramatically accelerate the modeling phase — particularly for the tower shell, drums, and base — though all AI-generated meshes will need manual cleanup in Blender before use.

#### 5.4.1 Commercial AI 3D Generation Platforms

##### Tripo AI (tripo3d.ai) — Best Overall for Game Assets

| Attribute | Detail |
| --- | --- |
| Capabilities | Text-to-3D, image-to-3D, sketch-to-3D, multi-image reconstruction |
| Model | 20B+ parameter Tripo 3.0 engine |
| Speed | 25–100 seconds per model |
| Export formats | OBJ, STL, **GLB/glTF**, FBX, USD, USDZ, 3MF |
| PBR textures | Yes — base color, metallic, roughness, normal maps |
| Topology | Clean quad-based with auto-retopology; best-in-class for game engines |
| Auto-rigging | Yes (static → animation-ready) |
| Integrations | Blender, Unity, Unreal Engine, ComfyUI, Godot plugins |

**Pricing:**

| Tier | Price | Credits/Month | ~Models |
| --- | --- | --- | --- |
| Basic (Free) | $0 | 300 | ~24–30 |
| Professional | $19.90/mo ($11.94 yearly) | 3,000 | ~300 |
| Advanced | $49.90/mo ($29.94 yearly) | 8,000 | ~800 |
| Premium | $139.90/mo ($83.94 yearly) | 25,000 | ~2,500 |
| API | — | $0.10–$0.40/model | — |

**Quality reviews:**
- Rated top choice for game developers across multiple comparison reviews (SimInsights, Unite.AI)
- "Best overall workflow and editability" — SimInsights production-readiness testing
- Best geometry capture of form and occlusions among commercial tools
- Cleanest topology for game engine use; quad meshes suitable for rigging and physics
- Auto-repair proactively fixes non-manifold geometry before export
- Weakness: occasional holes/broken geometry, textures can be stylized rather than photorealistic

**Tower suitability:** Strong. Multi-image input could capture tower geometry from reference photos. Clean topology means less Blender cleanup. Free tier (300 credits) allows experimentation before committing.

##### Meshy AI (meshy.ai) — Fastest Iteration

| Attribute | Detail |
| --- | --- |
| Capabilities | Text-to-3D, image-to-3D (now on Meshy 6 model) |
| Speed | Preview in seconds, refined models in 30–90 seconds |
| Export formats | FBX, **GLB**, OBJ, STL, 3MF, USDZ, BLEND, VOX |
| PBR textures | Yes — diffuse, roughness, metallic, normal maps; option to remove baked highlights |
| Polygon count | Configurable 100–300K (default 30K); v3.0 delivers up to 2M |
| Art styles | Realistic, cartoon, low-poly, voxel |

**Pricing:**

| Tier | Price | Credits/Month |
| --- | --- | --- |
| Free | $0 | 200 |
| Pro | $16/mo ($10 yearly) | 1,000 |
| Max | $48/mo | 4,000 |
| Max Unlimited | $96/mo | Unlimited |

**Quality reviews:**
- Fastest generation of all tools — best for rapid prototyping and iteration
- SOC2 + ISO 27001 certified; best documentation in the market
- SimInsights testing: "majority of outputs didn't pass review" for production use — broken geometry and weak textures common
- Reddit users report issues with cylinders, hard surfaces, and texture fidelity
- 97% slicer compatibility for 3D printing
- "Gives you a starting point, not a final deliverable"

**Tower suitability:** Good for rapid prototyping early concepts. The tower's cylindrical shape is a known weakness for Meshy. Expect moderate Blender cleanup.

##### Rodin / Hyper3D (hyper3d.ai) — Highest Quality Per Model

| Attribute | Detail |
| --- | --- |
| Capabilities | Text-to-3D, image-to-3D (10B parameter model) |
| Speed | 2–3 minutes per model |
| Export formats | **GLB**, USDZ, FBX, OBJ, STL |
| PBR textures | Yes — base color, metallic, roughness, normal; HighPack option for 4K textures |
| Polygon count | Configurable 2K–200K standard; 40K–1.5M advanced; quad mode up to 16× |

**Pricing:**

| Tier | Price | Credits/Month |
| --- | --- | --- |
| Free | $0 | Limited (at $1.50/credit) |
| Education | $15/mo | 30 |
| Creator | $30/mo | 30 |
| Business | $120/mo | 208 |
| Per model | $0.50–$1.50 | — |

**Quality reviews:**
- Rated 8.5–9.5/10; called "undisputed leader in quality and speed"
- SimInsights: highest single-output quality, best textures, fewer hole-prone meshes
- Best at photorealistic objects — furniture, weapons, **architecture**
- Weaknesses: heavier meshes, more frequent shape mistakes, higher costs, less modifiable outputs
- Inconsistent: same prompt can produce noticeably different results across runs
- STL exports frequently require 20–40 min of Blender repair for non-manifold edges

**Tower suitability:** Best visual quality option — especially strong for architectural models. Most expensive, and meshes need significant cleanup. Worth testing on the Business tier for a single high-quality tower shell.

##### Kaedim (kaedim3d.com) — Human-Verified Quality

| Attribute | Detail |
| --- | --- |
| Capabilities | Concept art / images to production-ready 3D with human QA verification |
| Export formats | OBJ, FBX, **GLB/glTF**, USD |
| PBR textures | Yes — albedo, normal, roughness at up to 2048×2048 |
| Topology | Always low-poly, quad-based, watertight, separated into subparts |

**Pricing:**

| Tier | Price | Credits |
| --- | --- | --- |
| Prototype | $22 | 20 credits |
| Indie | $18 | 60 credits |
| Starter | $29/mo | 50/month |
| Pro | $99/mo | 200/month |

**Quality reviews:**
- Hard-surface objects: 85–90% accuracy; organic shapes: 70–80%
- **Unique differentiator:** human QA team verifies and cleans every output
- Saves 60–70% modeling time; rated 4.7/5
- Produces base meshes for further refinement — not always final production quality

**Tower suitability:** The human QA step makes outputs more reliable than fully automated tools, but the low-poly focus may not capture the tower's fine architectural detail.

##### Luma AI Genie (lumalabs.ai) — Creative/Stylized

| Attribute | Detail |
| --- | --- |
| Pricing | Free (30/mo), Lite $9.99, Standard $29.99, Pro $99.99 |
| Export formats | **GLB**, FBX, OBJ |
| PBR | Yes (on refined models) |
| Speed | ~10s preview, then optional refinement |

**Quality reviews:** Produces stylized, creative 3D models — NOT photorealistic. Best for concept work, not product replicas. Also has video-to-3D photogrammetry from phone footage, which could be useful if you have access to a physical tower.

##### 3DAI Studio (3daistudio.com) — Multi-Engine Aggregator

Accesses Meshy, Rodin, Tripo, and TRELLIS through a single $29/mo subscription. Credits last 365 days. **Recommended for experimentation** — try multiple engines and compare results for the tower model without committing to one platform.

#### 5.4.2 Open-Source / Self-Hosted Options

##### Microsoft TRELLIS.2 — Best Open-Source Option

| Attribute | Detail |
| --- | --- |
| Parameters | 4 billion (TRELLIS.2-4B) |
| License | MIT |
| Speed | 3s (512³), 17s (1024³), 60s (1536³) on NVIDIA H100 |
| Export formats | **GLB**, OBJ, FBX, STL with full PBR |
| PBR textures | Yes — base color, metallic, roughness, alpha (including transparency/translucency) |
| Hardware | Requires NVIDIA GPU with 6GB+ VRAM (H100/A100 ideal) |

**Quality reviews:**
- CVPR 2025 Spotlight paper; state-of-the-art open-source quality
- Handles complex topologies, sharp features, transparency — all relevant for the tower
- Uses novel O-Voxel structure for detailed geometry
- Limitation: occasional small holes requiring post-processing (scripts provided)
- Available via 3DAI Studio at $0.25–$0.35/generation if you don't want to self-host

**Tower suitability:** Excellent. Handles architectural geometry well. Transparency/translucency support is directly relevant for the tower's translucent shell. Free to self-host with an NVIDIA GPU.

##### Tencent Hunyuan 3D 3.0 — Highest Resolution Open-Source

| Attribute | Detail |
| --- | --- |
| Parameters | Up to 10 billion (v2.5+) |
| License | Apache 2.0 (restricted in EU, UK, South Korea) |
| Speed | Under 60 seconds |
| Resolution | Up to 1536³ (3.6 billion voxels); up to 8K PBR textures (v3.5) |
| Pricing | Free (self-hosted) or $0.025–$0.48/model via third-party APIs |

**Quality reviews:**
- Triple the modeling accuracy of v2.0; professional-grade output
- CLIP score 0.821; 15% improved geometric precision over v2.0
- 3M+ downloads on Hugging Face
- Two-stage pipeline: bare mesh generation, then texture synthesis

**Tower suitability:** Very strong. Highest resolution available in open-source. 8K PBR textures could capture the tower's stone surface detail. Requires self-hosting with 6GB+ VRAM GPU.

##### Other Open-Source Tools

| Tool | Developer | Speed | Quality | Notes |
| --- | --- | --- | --- | --- |
| TripoSR | Tripo + Stability AI | <0.5s | Medium | Fast prototyping; $0.07/gen via fal.ai |
| Stability SV3D | Stability AI | Varies | Medium | Multi-view orbital video from single image; building block |
| Stable Fast 3D | Stability AI | <1s | Low | Albedo only — no PBR materials |
| Shap-E | OpenAI | ~13s | Low | Open-source (MIT); fast but quality far below commercial tools |
| InstantMesh | TencentARC | ~10s | Medium | Feed-forward single-image to mesh |
| Wonder3D | Research | 2–3 min | Medium | Generates multi-view RGB + normal maps |
| LGM | 3DTopia | ~5s | Medium | Gaussian splatting output; needs conversion for mesh |

**Research-only (no product/API):** Google DreamFusion, NVIDIA Magic3D, NVIDIA GET3D, OpenAI Point-E. These are foundational research but not usable tools.

#### 5.4.3 Blender AI Plugins and Workflows

Several AI tools integrate directly into Blender, enabling generation and refinement without leaving the modeling environment. The most relevant for our tower model:

**Native Generation Plugins (generate 3D directly inside Blender):**

| Plugin | What It Does | Pricing | Notes |
| --- | --- | --- | --- |
| [3D-Agent](https://3d-agent.com/) | Text-to-3D via Claude MCP; produces clean quad topology | Free (15/mo), Starter (100/mo) | Best for architectural meshes; native Blender integration |
| [Tripo 3D for Blender](https://github.com/VAST-AI-Research/tripo-3d-for-blender) | Text/image/sketch-to-3D with auto-retopology and rigging | Uses Tripo credits | Claims 50% faster than multi-tool pipelines |
| [Meshy for Blender](https://docs.meshy.ai/en/blender-plugin/introduction) | One-click bridge import, model analysis, automated cleanup | Uses Meshy credits | Built-in geometry repair tools |
| [TRELLIS Blender Plugin](https://github.com/FishWoWater/trellis_blender) | Microsoft TRELLIS.2 integration; text/image-to-3D | Free (self-hosted) | Requires running TRELLIS API server |
| [Hunyuan 3D Bridge](https://github.com/jfranmatheu/Hunyuan3DBlenderBridge) | Tencent Hunyuan3D integration | Free (self-hosted) | Requires Blender 4.4.0+ |
| [StableGen](https://github.com/sakalond/StableGen) | TRELLIS.2 mesh gen + SDXL/FLUX texturing | Free (open-source) | Uses ComfyUI as backend |
| [Hitem3D](https://www.hitem3d.ai/) | Single reference image to studio-ready 3D asset | Varies | No remeshing required |

**AI-Assisted Modeling Tools (natural language → Blender Python scripts):**

| Plugin | What It Does | Pricing |
| --- | --- | --- |
| [Blender MCP](https://blender-mcp.com/) | Connect Blender to Claude AI via MCP for natural language modeling | Free (open-source) |
| [BlenderGPT](https://blendergpt.org/) | GPT-4 generates and executes Blender Python scripts | $14/mo (250 credits) |
| [Blender Copilot](https://github.com/pramishp/BlenderCopilot) | ChatGPT-powered automation of Blender operations | Free (requires OpenAI API key) |
| [Blender LLM Add-in](https://github.com/mac999/blender-llm-addin) | Local LLMs (Ollama) or OpenAI for script generation | Free (open-source) |

**AI Texturing Plugins:**

| Plugin | What It Does | Pricing |
| --- | --- | --- |
| [Dream Textures](https://github.com/carson-katri/dream-textures) | Stable Diffusion in Blender's shader editor; seamless tiling, inpainting, AI upscaling | Free (runs locally, 4GB+ VRAM) |
| [Stability for Blender](https://github.com/Stability-AI/stability-blender-addon-public) | Stable Diffusion rendering and texture generation | Free addon; DreamStudio API credits |
| [AI Render](https://github.com/benrugg/AI-Render) | SD-powered rendering with animatable parameters | Free (local or cloud) |

**Recommended workflow guides for importing and cleaning AI-generated models in Blender:**

- [Importing AI Models into Blender — Tripo3D](https://www.tripo3d.ai/blog/explore/how-to-import-ai-models-into-blender-correctly) — format recommendations (FBX > glTF > OBJ), systematic cleanup order
- [Creating Clean Meshes in Blender & Tripo AI](https://www.tripo3d.ai/blog/how-to-create-clean-meshes) — retopology, UV unwrapping, mesh optimization
- [Meshy to Blender: Complete Workflow](https://help.meshy.ai/en/articles/11973187-meshy-to-blender-a-complete-workflow) — official end-to-end pipeline
- [How to Import & Optimize AI Models — 3DAI Studio](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/how-to-import-optimize-ai-models-in-blender) — consistent post-import routines
- [AI Blender Model Generator Guide — fal.ai](https://fal.ai/learn/devs/gen-ai-blender-models) — developer-focused; covers how AI reduces 23–35 hour workflows to minutes
- [AI-Powered 3D Modeling and Animation — Meshy](https://www.meshy.ai/blog/3d-modeling-and-animation) — end-to-end from AI generation through Blender to cinematic animation
- [Blender MCP + Claude Setup Guide](https://www.harknessai.nz/articles/generate-3d-models-claude-blender) — step-by-step natural language 3D modeling
- [From Blender-MCP to 3D-Agent: Evolution of AI Blender Modeling](https://dev.to/glglgl/from-blender-mcp-to-3d-agent-the-evolution-of-ai-powered-blender-modeling-1m7d) — architecture and lessons learned

**Roundup articles comparing Blender AI tools:**

- [Top AI Tools for Blender 3D (2026) — Vagon](https://vagon.io/blog/best-ai-tools-for-blender-3d-model-generation)
- [7 Best Blender AI Plugins (2026) — 3D-Agent](https://3d-agent.com/blender-ai/plugin)
- [Best Blender AI Plugins (2025) — Tripo3D](https://www.tripo3d.ai/content/en/use-case/the-best-blender-ai-plugin)
- [Blender AI for Game Developers — Alpha3D](https://www.alpha3d.io/kb/3d-modelling/blender-ai-modeling/)
- [Best AI 3D Model Generators for Game Devs — The Tool Nerd](https://www.thetoolnerd.com/p/the-best-ai-3d-model-generators-for)

#### 5.4.4 Comparison Matrix

| Tool | Type | Cost/Month | GLB Export | PBR | Max Polys | Tower Suitability | Cleanup Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Tripo AI** | Commercial | $0–140 | Yes | Yes | Configurable | **Strong** | Least |
| **Meshy AI** | Commercial | $0–96 | Yes | Yes | 2M | Good (weak on cylinders) | Moderate |
| **Rodin/Hyper3D** | Commercial | $0–120 | Yes | Yes (4K) | 1.5M | **Best quality** | Significant |
| **Kaedim** | Commercial | $18–99 | Yes | Yes (2K) | Low-poly | Moderate | Moderate (human QA) |
| **Luma Genie** | Commercial | $0–100 | Yes | Yes | Configurable | Low (stylized) | Moderate |
| **3DAI Studio** | Aggregator | $29 | Yes | Yes | Varies | **Best for testing** | Varies |
| **TRELLIS.2** | Open-source | Free (GPU) | Yes | Yes | High | **Strong** | Light–Moderate |
| **Hunyuan 3D** | Open-source | Free (GPU) | Yes | Yes (8K) | Very high | **Strong** | Light–Moderate |

#### 5.4.5 Production Readiness — Industry Reality Check

SimInsights' 2025 production-readiness study found that roughly **1 in 10 AI-generated 3D models are client-ready** without manual rework. Key findings:

- All tools produce meshes that need some degree of hole-filling, topology cleanup, and texture re-authoring
- AI 3D tools are **accelerators, not replacements** for 3D artists
- Hard-surface architectural objects (like the tower) fare better than organic shapes
- Rodin produces the highest per-model quality; Tripo produces the cleanest topology; Meshy is fastest
- Every tool occasionally generates broken geometry — budget for iteration (generate 3–5 attempts, pick the best)

#### 5.4.6 Recommended AI Pipeline for the Tower Model

**Option D — AI-Assisted Modeling (New Recommendation)**

Combine AI generation with manual Blender refinement for the best speed-to-quality ratio:

1. **Generate initial 3D mesh** using one or more of these approaches (ordered by recommendation):
   - **3DAI Studio ($29/mo):** Try the tower across TRELLIS, Tripo, and Rodin engines; pick the best result.
   - **Tripo 3D for Blender (free tier):** Generate directly inside Blender; 300 credits/month; cleanest topology for Three.js.
   - **TRELLIS.2 via Blender plugin (free, self-hosted):** Best open-source quality; transparency support for the shell.
   - **3D-Agent (free tier):** Text-to-3D directly in Blender with clean quad topology — describe the tower in natural language.

2. **Refine in Blender** (always required):
   - Fix non-manifold edges and fill holes
   - Retopologize for proper animation (drums must be separate objects)
   - Boolean-cut the 12 seal openings
   - Re-UV-unwrap areas with texture seams
   - Place empties at the 24 LED positions
   - Separate geometry into animatable parts (shell, 3 drums, 12 seals, base)
   - Use [Dream Textures](https://github.com/carson-katri/dream-textures) for AI-assisted texture generation directly in Blender

3. **Apply PBR materials** in Blender (AI textures are a starting point):
   - Stone surface: re-bake normal maps from higher-res AI mesh
   - Translucent shell panels: set up `MeshPhysicalMaterial` properties (transmission, thickness)
   - Drum faces: apply glyph decals at correct positions

4. **Export as GLB** with separate meshes and material slots for runtime control.

**Estimated cost:** $0–$60 depending on approach (free with self-hosted open-source, $29 with 3DAI Studio, or $0 with Tripo/Meshy free tiers). **Estimated time saved vs. pure manual modeling:** 40–60% for the initial shell and base geometry; drums and mechanical detail still need manual work.

---

## 6. Rendering and Visual Effects

### 6.1 LED Glow Effects

Each of the 24 LEDs should produce visible illumination. Implementation approach:

```typescript
// Per-LED components:
// 1. A PointLight for casting light into the scene
// 2. An emissive sphere/plane for the visible LED "bulb"
// 3. Emissive intensity on nearby shell materials for glow bleed

interface LEDState {
  layer: number;       // 0-5
  position: number;    // 0-3
  effect: number;      // 0-5 (off, on, breathe, breatheFast, breathe50, flicker)
  loop: boolean;
}
```

**Effect animations (per frame):**

| Effect | Implementation |
| --- | --- |
| `off` | intensity = 0 |
| `on` | intensity = 1.0 (constant) |
| `breathe` | intensity = 0.5 + 0.5 * sin(time * 2.0) — ~3s period |
| `breatheFast` | intensity = 0.5 + 0.5 * sin(time * 6.0) — ~1s period |
| `breathe50percent` | intensity = 0.25 + 0.25 * sin(time * 2.0) — 50% max |
| `flicker` | intensity = noise(time * 10) * 0.8 + 0.2 — irregular |

**Light color:** Deep red (#CC1100 to #FF2200) matching the tower's dark red translucent shell.

### 6.2 Seal Animations

When the tower state indicates a seal should be removed (via `sealReveal` LED sequence + specific LEDs illuminating):

1. Backlight the seal with increasing brightness (0.5s).
2. Slide the seal mesh upward along the tower face (+Y direction, ~2cm travel).
3. Fade the seal mesh opacity to 0 (0.3s).
4. Remove the seal mesh from the scene.

Track seal state by monitoring which ring LEDs transition from `off` to `on` after a `sealReveal` sequence.

### 6.3 Drum Rotation Animation

When a drum's `position` value changes between state updates:

1. Calculate shortest rotation path (could go CW or CCW).
2. Animate the drum mesh rotation around the Y-axis with easing (ease-in-out, ~1.5s).
3. Play rotation sound effect if `playSound` flag is set.

```
Position mapping:
  North = 0°
  East  = 90° (π/2)
  South = 180° (π)
  West  = 270° (3π/2)
```

### 6.4 Skull Drop Animation

When `beam.count` increases:

1. Spawn a skull mesh at the top funnel opening.
2. Animate the skull dropping down through the interior using a curved path.
3. The skull exits from one of the base openings or a drum opening (determined by which openings are currently unsealed).
4. Play the `TowerSkullDropped` sound (sample `0x71`).
5. The skull rolls away from the base and fades out.

For visual fidelity, use a simple physics-informed bezier curve path rather than full rigid-body physics.

### 6.5 LED Sequence Animations

The 19 pre-programmed LED sequences must be implemented as scripted animation timelines:

```typescript
// Each sequence is a timeline of LED states over time
interface SequenceKeyframe {
  time: number;        // seconds from start
  leds: Map<string, { intensity: number; effect: string }>;
}

type SequenceTimeline = SequenceKeyframe[];
```

Key sequences to implement with high fidelity:
- `sealReveal` — Dramatic sweep followed by sustained illumination of the target seal.
- `angryStrobe01-03` — Aggressive red strobing during threatening events.
- `gloat01-03` — Triumphant pulsing when the tower "gloats" over players.
- `victory` / `defeat` — Full LED celebrations/mourning.
- `rotationAllDrums` / `rotationDrum*` — Accompaniment to drum rotation.
- `monthStarted` — New month transition.

These sequences will need to be reverse-engineered from observing real tower behavior or approximated from names and context.

### 6.6 Post-Processing Effects

To achieve the brooding, atmospheric look of the real tower:

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass';
import { RenderPass } from 'three/addons/postprocessing/RenderPass';

// Bloom makes LED glow bleed convincingly through the shell
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength — controls glow intensity
  0.4,   // radius — controls glow spread
  0.85   // threshold — only bright areas bloom
);
```

Additional effects:
- **Ambient occlusion (SSAO)** — Darkens crevices in the stone texture.
- **Tone mapping** — ACES filmic for cinematic color grading.
- **Vignette** — Subtle edge darkening to focus attention on the tower.
- **Environment map** — Dark HDR environment for subtle reflections on crystal surfaces.

---

## 7. Audio System

### 7.1 Complete Sound Library

The tower firmware defines **113 unique audio samples** across 11 categories. Each sample has a unique ID (1-113, hex `0x01`-`0x71`):

**Adversaries (8 samples, `0x01`-`0x08`):**
Ashstrider, Bane of Omens, Empress of Shades, Gaze Eternal, Gravemaw, Isa the Hollow, Lingering Rot, Utuk'Ku

**Allies (10 samples, `0x09`-`0x12`):**
Gleb, Grigor, Hakan, Letha, Miras, Nimet, Tomas, Vasa, Yana, Zaida

**Battle (23 samples, `0x13`-`0x29`):**
Apply Advantage 01-05, Max Advantages, No Advantages, Adversary Escaped, Battle Button, Card Flip 01-03, Card Flip Paper 01-03, Card Select 01-03, Battle Start, Battle Victory, Button Hold Press Combo, Button Hold, Button Press

**Classic 8-bit (11 samples, `0x2A`-`0x34`):**
8-bit Advantage, 8-bit Attack Tower, 8-bit Bazaar, 8-bit Confirmation, 8-bit Dragons, 8-bit Quest Failed, 8-bit Retreat, 8-bit Start Month, 8-bit Start Dungeon, 8-bit Tower Lost, 8-bit Unsure

**Dungeon (12 samples, `0x35`-`0x40`):**
Dungeon Advantage 01-02, Dungeon Button, Dungeon Footsteps, Dungeon Caves, Dungeon Complete, Dungeon Encampment, Dungeon Escape, Dungeon Fortress, Dungeon Ruins, Dungeon Shrine, Dungeon Tomb

**Foes (15 samples, `0x41`-`0x4F`):**
Foe Event, Foe Spawn, Brigands, Clan of Neuri, Dragons, Lemures, Leveled Up, Mormos, Oreks, Shadow Wolves, Spine Fiends, Strigas, Titans, Frost Trolls, Widowmade Spiders

**Spawns (8 samples, `0x50`-`0x57`):**
Ashstrider Spawn, Bane of Omens Spawn, Empress of Shades Spawn, Gaze Eternal Spawn, Gravemaw Spawn, Isa the Hollow Spawn, Lingering Rot Spawn, Utuk'Ku Spawn

**Quest (2 samples):**
Quest Complete (`0x58`), Quest Failed (`0x6C`)

**Glyph (5 samples, `0x59`-`0x5D`):**
Tower All Glyphs, Tower Angry 1-4

**State (12 samples):**
Tower Connected (`0x5E`), Game Start (`0x5F`), Tower Gloat 1-3 (`0x60`-`0x62`), Tower Glyph (`0x63`), Tower Idle 1-5 (`0x64`-`0x68`), Tower Disconnect (`0x69`), Month Ended (`0x6A`), Month Started (`0x6B`)

**Seals (4 samples, `0x6D`-`0x70`):**
Rotate Exit, Rotate Loop, Rotate Start, Tower Seal

**Other:**
Tower Skull Dropped (`0x71`)

### 7.2 Web Audio API Implementation

```typescript
class TowerAudio {
  private ctx: AudioContext;
  private gainNode: GainNode;
  private samples: Map<number, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;

  // Volume mapping (firmware values to gain)
  private static VOLUME_MAP: Record<number, number> = {
    0: 1.0,    // Loud
    1: 0.5,    // Medium
    2: 0.2,    // Quiet
    3: 0.0,    // Mute
  };

  async loadSample(id: number, url: string): Promise<void> {
    const response = await fetch(url);
    const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
    this.samples.set(id, buffer);
  }

  play(sampleId: number, loop: boolean, volume: number): void {
    this.stop();
    const buffer = this.samples.get(sampleId);
    if (!buffer) return;

    this.currentSource = this.ctx.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.loop = loop;
    this.gainNode.gain.value = TowerAudio.VOLUME_MAP[volume] ?? 1.0;
    this.currentSource.connect(this.gainNode);
    this.currentSource.start();
  }

  stop(): void {
    this.currentSource?.stop();
    this.currentSource = null;
  }
}
```

**Audio sourcing options:**
1. **Record from real tower** — Connect to a real tower, trigger each sample, record. Highest fidelity.
2. **Extract from companion app** — The app contains the same audio assets. Requires reverse-engineering the app bundle.
3. **Recreate/synthesize** — Create sound-alike samples using audio tools. Most labor-intensive.
4. **Placeholder approach** — Start with simple synthesized tones per category; replace with real samples over time.

---

## 8. State Management and Protocol Integration

### 8.1 Connecting to the Host

The emulator reuses the same WebSocket protocol as the existing client:

```typescript
// Connection (reuse shared protocol types)
import { MSG_TYPE, PROTOCOL_VERSION } from '@darktowersync/shared';

const ws = new WebSocket(`ws://${host}:${port}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: MSG_TYPE.CLIENT_HELLO,
    payload: {
      protocolVersion: PROTOCOL_VERSION,
      label: 'Tower Emulator',
      observer: true,
    },
    timestamp: new Date().toISOString(),
  }));
};
```

### 8.2 Decoding Tower Commands

Every `tower:command` message contains a 20-byte array. The emulator decodes it into a structured `TowerState`:

```typescript
import { rtdt_unpack_state, TOWER_STATE_DATA_OFFSET } from 'ultimatedarktower';

function handleTowerCommand(data: number[]): void {
  const bytes = new Uint8Array(data);
  const stateData = bytes.slice(TOWER_STATE_DATA_OFFSET); // bytes 1-19
  const state: TowerState = rtdt_unpack_state(stateData);
  emulator.applyState(state);
}
```

### 8.3 State-to-Visual Mapping

The emulator maintains a mapping between decoded `TowerState` and 3D scene objects:

```typescript
interface EmulatorState {
  // Drums
  drums: [DrumVisual, DrumVisual, DrumVisual];  // top, middle, bottom

  // LEDs (24 total)
  leds: LEDVisual[];  // indexed by (layer * 4 + position)

  // Seals (12 total)
  seals: Map<string, SealVisual>;  // keyed by "T_N", "M_E", etc.

  // Audio
  audio: { currentSample: number; loop: boolean; volume: number };

  // Skull tracking
  skullCount: number;
}

function applyState(state: TowerState): void {
  // 1. Update drums — animate rotation if position changed
  state.drum.forEach((drum, i) => {
    if (drum.position !== this.state.drums[i].position) {
      this.animateDrumRotation(i, drum.position);
    }
    this.state.drums[i].calibrated = drum.calibrated;
  });

  // 2. Update LEDs — set effect and intensity for each
  state.layer.forEach((layer, li) => {
    layer.light.forEach((light, pi) => {
      this.setLEDEffect(li, pi, light.effect, light.loop);
    });
  });

  // 3. Update LED sequence override
  if (state.led_sequence !== 0) {
    this.playLEDSequence(state.led_sequence);
  }

  // 4. Update audio — play/stop sounds
  if (state.audio.sample !== this.state.audio.currentSample ||
      state.audio.loop !== this.state.audio.loop) {
    this.towerAudio.play(state.audio.sample, state.audio.loop, state.audio.volume);
  }

  // 5. Check for skull drops
  if (state.beam.count > this.state.skullCount) {
    this.animateSkullDrop();
  }
  this.state.skullCount = state.beam.count;
}
```

---

## 9. User Interface and Interaction

The emulator UI is primarily the 3D viewport with minimal overlay controls:

**3D Viewport:**
- Full-screen Three.js canvas.
- Camera orbits around the tower (OrbitControls) — user can rotate, zoom, pan.
- Default camera position: slightly elevated, looking at the tower from an angle that shows 2 faces.
- Ambient dark lighting — the tower's own LEDs are the primary light source.

**Overlay HUD (minimal, semi-transparent):**
- Connection status indicator (connected/reconnecting/disconnected).
- Current audio sample name (small text, bottom of screen).
- Skull count badge.
- Volume indicator icon.

**Controls:**
- Mouse drag: Orbit camera around tower.
- Scroll: Zoom in/out.
- Double-click: Reset camera to default position.
- `F` key: Toggle fullscreen.
- `M` key: Mute/unmute audio.
- Settings gear icon: Host URL input, audio volume, quality preset (low/medium/high).

**Responsive design:**
- Works on desktop and mobile browsers.
- Touch events for mobile orbit/zoom.
- Adjusts render resolution and effect quality based on device capability.

---

## 10. Implementation Plan

### 10.1 Phase 1 — Static Model and Scene

**Goal:** A non-interactive 3D tower model rendered in the browser.

- Set up Vite + TypeScript project (new package: `packages/emulator`).
- Create or import tower 3D model (GLB format).
- Set up Three.js scene with camera, lighting, and post-processing.
- Render the static tower with PBR materials.
- Implement OrbitControls for camera interaction.
- Dark atmospheric scene with subtle ambient lighting.

**Deliverable:** A rotating 3D tower you can orbit around in the browser.

### 10.2 Phase 2 — LED System

**Goal:** All 24 LEDs illuminate with correct effects.

- Place 24 point lights + emissive meshes at correct positions.
- Implement all 6 LED effects (off, on, breathe, breatheFast, breathe50, flicker).
- Shell material responds to LED illumination (emissive glow).
- Bloom post-processing for realistic light bleed.
- Test with hardcoded LED states.

**Deliverable:** Tower with working, animated LED system.

### 10.3 Phase 3 — Mechanical Animation

**Goal:** Drums rotate, seals animate, skulls drop.

- Implement drum rotation animation (Y-axis, eased, per drum).
- Implement seal removal animation (slide up + fade).
- Implement skull drop animation (spawn → fall → exit).
- Glyph visibility tied to drum position and seal state.

**Deliverable:** All mechanical tower elements animate correctly.

### 10.4 Phase 4 — Audio

**Goal:** Tower plays all sound effects.

- Set up Web Audio API audio engine.
- Source or create placeholder audio samples (113 samples).
- Implement play/stop/loop/volume controls.
- Wire audio state to sample playback.

**Deliverable:** Tower produces audio matching real hardware.

### 10.5 Phase 5 — Protocol Integration

**Goal:** Emulator connects to live host and renders real-time tower state.

- Implement WebSocket connection with `client:hello` (observer mode).
- Handle `sync:state` for initial catchup.
- Handle `tower:command` — decode and apply to 3D scene.
- Handle `relay:paused` / `relay:resumed`.
- Auto-reconnect with exponential backoff.
- Implement LED sequence override animations.

**Deliverable:** Fully functional emulator connected to a live game session.

### 10.6 Phase 6 — Polish and Deployment

**Goal:** Production-quality visuals and user experience.

- Fine-tune materials, lighting, bloom parameters.
- Performance profiling and optimization.
- Mobile responsive design.
- Connection UI (host URL input, status).
- Quality presets (low/medium/high).
- Build for static hosting (single HTML + assets).

**Deliverable:** Deployable web application ready for players.

---

## 11. Performance Considerations

| Concern | Mitigation |
| --- | --- |
| 24 dynamic point lights | Use deferred rendering or bake static lights; only update changed LEDs per frame |
| Post-processing (bloom) | Reduce bloom resolution on low-end devices; make optional |
| Model complexity | Target 50-100K triangles; use LOD if needed |
| Texture memory | Compress textures (KTX2/Basis); lazy-load audio |
| Animation overhead | Pool animation tweens; skip animations for unchanged state |
| Mobile GPU | Detect capability via `renderer.capabilities`; disable bloom/SSAO on low-end |
| Audio latency | Pre-decode all samples on load; use AudioBufferSourceNode (not HTMLAudioElement) |
| WebSocket throughput | Tower commands are small (20 bytes); no bandwidth concern |
| Frame rate target | 60 FPS on desktop, 30 FPS acceptable on mobile |

---

## 12. Open Questions

1. **Audio sourcing:** How do we obtain the 113 tower audio samples? Recording from real hardware is most authentic but requires access to a tower and systematic capture of every sample.

2. **LED sequence reverse-engineering:** The 19 LED sequence animations are firmware-defined patterns. They need to be observed on real hardware or approximated from their names and context. Can we capture these by recording a real tower during gameplay?

3. **Exact tower geometry:** Reference photos and measurements are available but imprecise. A 3D scan or precise measurements of a physical tower would significantly improve model accuracy. Alternatively, can we obtain the original CAD/mold design files from Restoration Games?

4. **Seal state tracking:** The protocol doesn't explicitly track which seals have been removed — it only triggers seal reveals via LED sequences. The emulator will need to infer seal state from the combination of LED patterns and drum positions over time. Should we maintain explicit seal state?

5. **Skull routing:** The physical tower routes skulls through a labyrinth based on drum positions and open seals. Should the emulator simulate the exact internal routing, or simply animate skulls exiting from random open positions?

6. **Project structure:** Should this be a new package (`packages/emulator`) in the monorepo, or a separate repository? Monorepo keeps shared types accessible; separate repo keeps the emulator independent.

7. **Hosting:** Static web hosting (GitHub Pages, Vercel, Netlify) would allow anyone to access the emulator with just a URL and a host address. Is this the desired deployment model?

8. **Crystal panel exact locations:** Where exactly on the tower body are the smooth crystal sections vs. the textured stone sections? This requires close reference photos or hands-on examination.

---

## Appendix A — Tower Command Packet Structure

Complete 20-byte packet layout (from `TOWER_TECH_NOTES.md`):

```
Byte:  00  01  02  03  04  05  06  07  08  09  10  11  12  13  14  15  16  17  18  19
      [CMD][DRUM STATE][          LED STATES (6 layers × 2 bytes)          ][AUD][BEAM][VDF][SEQ]

Byte 0:    Command type (0x00 = tower state)
Byte 1:    Top drum + Middle drum position/flags
Byte 2:    Middle drum flags + Bottom drum position/flags
Bytes 3-4: Layer 0 (Top Ring) LED states — N, E, S, W
Bytes 5-6: Layer 1 (Middle Ring) LED states
Bytes 7-8: Layer 2 (Bottom Ring) LED states
Bytes 9-10:  Layer 3 (Ledge) LED states — NE, SE, SW, NW
Bytes 11-12: Layer 4 (Base1) LED states
Bytes 13-14: Layer 5 (Base2) LED states
Byte 15: Audio sample (bits 0-6) + loop flag (bit 7)
Byte 16: Beam break counter high byte
Byte 17: Beam break counter low byte (SKULL_DROP_COUNT_POS)
Byte 18: Volume (bits 4-7), drum reverse flags (bits 1-3), beam fault (bit 0)
Byte 19: LED sequence override (0x00 = normal, 0x0E = sealReveal, etc.)
```

Each LED uses 4 bits: 3 bits for effect (0-5) + 1 bit for loop flag.

---

## Appendix B — Complete Audio Sample Index

| Hex | Dec | Name | Category |
| --- | --- | --- | --- |
| `0x01` | 1 | Ashstrider | Adversary |
| `0x02` | 2 | Bane of Omens | Adversary |
| `0x03` | 3 | Empress of Shades | Adversary |
| `0x04` | 4 | Gaze Eternal | Adversary |
| `0x05` | 5 | Gravemaw | Adversary |
| `0x06` | 6 | Isa the Hollow | Adversary |
| `0x07` | 7 | Lingering Rot | Adversary |
| `0x08` | 8 | Utuk'Ku | Adversary |
| `0x09` | 9 | Gleb | Ally |
| `0x0A` | 10 | Grigor | Ally |
| `0x0B` | 11 | Hakan | Ally |
| `0x0C` | 12 | Letha | Ally |
| `0x0D` | 13 | Miras | Ally |
| `0x0E` | 14 | Nimet | Ally |
| `0x0F` | 15 | Tomas | Ally |
| `0x10` | 16 | Vasa | Ally |
| `0x11` | 17 | Yana | Ally |
| `0x12` | 18 | Zaida | Ally |
| `0x13` | 19 | Apply Advantage 01 | Battle |
| `0x14` | 20 | Apply Advantage 02 | Battle |
| `0x15` | 21 | Apply Advantage 03 | Battle |
| `0x16` | 22 | Apply Advantage 04 | Battle |
| `0x17` | 23 | Apply Advantage 05 | Battle |
| `0x18` | 24 | Max Advantages | Battle |
| `0x19` | 25 | No Advantages | Battle |
| `0x1A` | 26 | Adversary Escaped | Battle |
| `0x1B` | 27 | Battle Button | Battle |
| `0x1C` | 28 | Card Flip 01 | Battle |
| `0x1D` | 29 | Card Flip 02 | Battle |
| `0x1E` | 30 | Card Flip 03 | Battle |
| `0x1F` | 31 | Card Flip Paper 01 | Battle |
| `0x20` | 32 | Card Flip Paper 02 | Battle |
| `0x21` | 33 | Card Flip Paper 03 | Battle |
| `0x22` | 34 | Card Select 01 | Battle |
| `0x23` | 35 | Card Select 02 | Battle |
| `0x24` | 36 | Card Select 03 | Battle |
| `0x25` | 37 | Battle Start | Battle |
| `0x26` | 38 | Battle Victory | Battle |
| `0x27` | 39 | Button Hold Press Combo | Battle |
| `0x28` | 40 | Button Hold | Battle |
| `0x29` | 41 | Button Press | Battle |
| `0x2A` | 42 | 8-bit Advantage | Classic |
| `0x2B` | 43 | 8-bit Attack Tower | Classic |
| `0x2C` | 44 | 8-bit Bazaar | Classic |
| `0x2D` | 45 | 8-bit Confirmation | Classic |
| `0x2E` | 46 | 8-bit Dragons | Classic |
| `0x2F` | 47 | 8-bit Quest Failed | Classic |
| `0x30` | 48 | 8-bit Retreat | Classic |
| `0x31` | 49 | 8-bit Start Month | Classic |
| `0x32` | 50 | 8-bit Start Dungeon | Classic |
| `0x33` | 51 | 8-bit Tower Lost | Classic |
| `0x34` | 52 | 8-bit Unsure | Classic |
| `0x35` | 53 | Dungeon Advantage 01 | Dungeon |
| `0x36` | 54 | Dungeon Advantage 02 | Dungeon |
| `0x37` | 55 | Dungeon Button | Dungeon |
| `0x38` | 56 | Dungeon Footsteps | Dungeon |
| `0x39` | 57 | Dungeon Caves | Dungeon |
| `0x3A` | 58 | Dungeon Complete | Dungeon |
| `0x3B` | 59 | Dungeon Encampment | Dungeon |
| `0x3C` | 60 | Dungeon Escape | Dungeon |
| `0x3D` | 61 | Dungeon Fortress | Dungeon |
| `0x3E` | 62 | Dungeon Ruins | Dungeon |
| `0x3F` | 63 | Dungeon Shrine | Dungeon |
| `0x40` | 64 | Dungeon Tomb | Dungeon |
| `0x41` | 65 | Foe Event | Foe |
| `0x42` | 66 | Foe Spawn | Foe |
| `0x43` | 67 | Brigands | Foe |
| `0x44` | 68 | Clan of Neuri | Foe |
| `0x45` | 69 | Dragons | Foe |
| `0x46` | 70 | Lemures | Foe |
| `0x47` | 71 | Leveled Up | Foe |
| `0x48` | 72 | Mormos | Foe |
| `0x49` | 73 | Oreks | Foe |
| `0x4A` | 74 | Shadow Wolves | Foe |
| `0x4B` | 75 | Spine Fiends | Foe |
| `0x4C` | 76 | Strigas | Foe |
| `0x4D` | 77 | Titans | Foe |
| `0x4E` | 78 | Frost Trolls | Foe |
| `0x4F` | 79 | Widowmade Spiders | Foe |
| `0x50` | 80 | Ashstrider Spawn | Spawn |
| `0x51` | 81 | Bane of Omens Spawn | Spawn |
| `0x52` | 82 | Empress of Shades Spawn | Spawn |
| `0x53` | 83 | Gaze Eternal Spawn | Spawn |
| `0x54` | 84 | Gravemaw Spawn | Spawn |
| `0x55` | 85 | Isa the Hollow Spawn | Spawn |
| `0x56` | 86 | Lingering Rot Spawn | Spawn |
| `0x57` | 87 | Utuk'Ku Spawn | Spawn |
| `0x58` | 88 | Quest Complete | Quest |
| `0x59` | 89 | Tower All Glyphs | Glyph |
| `0x5A` | 90 | Tower Angry 1 | Glyph |
| `0x5B` | 91 | Tower Angry 2 | Glyph |
| `0x5C` | 92 | Tower Angry 3 | Glyph |
| `0x5D` | 93 | Tower Angry 4 | Glyph |
| `0x5E` | 94 | Tower Connected | State |
| `0x5F` | 95 | Game Start | State |
| `0x60` | 96 | Tower Gloat 1 | State |
| `0x61` | 97 | Tower Gloat 2 | State |
| `0x62` | 98 | Tower Gloat 3 | State |
| `0x63` | 99 | Tower Glyph | State |
| `0x64` | 100 | Tower Idle 1 | State |
| `0x65` | 101 | Tower Idle 2 | State |
| `0x66` | 102 | Tower Idle 3 | State |
| `0x67` | 103 | Tower Idle 4 | State |
| `0x68` | 104 | Tower Idle 5 | Unlisted |
| `0x69` | 105 | Tower Disconnect | State |
| `0x6A` | 106 | Month Ended | State |
| `0x6B` | 107 | Month Started | State |
| `0x6C` | 108 | Quest Failed | Quest |
| `0x6D` | 109 | Rotate Exit | Seals |
| `0x6E` | 110 | Rotate Loop | Seals |
| `0x6F` | 111 | Rotate Start | Seals |
| `0x70` | 112 | Tower Seal | Seals |
| `0x71` | 113 | Tower Skull Dropped | State |

---

## Appendix C — LED Layer and Channel Map

```
Physical Layout (top view, looking down at tower):

                    NORTH
                      │
               NW ────┼──── NE
              /       │       \
             /    ┌───────┐    \
            │     │ TOWER │     │
    WEST ───┤     │ BODY  │     ├─── EAST
            │     │       │     │
             \    └───────┘    /
              \       │       /
               SW ────┼──── SE
                      │
                    SOUTH

Layer 0: TOP RING      [N=ch0,  E=ch3,  S=ch2,  W=ch1]   ← Ring LEDs behind top seals
Layer 1: MIDDLE RING   [N=ch7,  E=ch6,  S=ch5,  W=ch4]   ← Ring LEDs behind middle seals
Layer 2: BOTTOM RING   [N=ch10, E=ch9,  S=ch8,  W=ch11]  ← Ring LEDs behind bottom seals
Layer 3: LEDGE         [NE=ch12, SE=ch13, SW=ch14, NW=ch15]  ← Ledge rim LEDs
Layer 4: BASE1         [NE=ch16, SE=ch17, SW=ch18, NW=ch19]  ← Upper base LEDs
Layer 5: BASE2         [NE=ch20, SE=ch21, SW=ch22, NW=ch23]  ← Lower base LEDs

Side View:
                ╱╲
               ╱  ╲         ← Crown / skull funnel
              ╱    ╲
             │ ○  ○ │       ← Layer 0: Top Ring LEDs (N, E, S, W)
             │[SEAL]│       ← Top seals (4)
             │ ○  ○ │       ← Layer 1: Middle Ring LEDs
             │[SEAL]│       ← Middle seals (4)
             │ ○  ○ │       ← Layer 2: Bottom Ring LEDs
             │[SEAL]│       ← Bottom seals (4)
            ╱────────╲      ← Layer 3: Ledge LEDs (NE, SE, SW, NW)
           ╱──────────╲     ← Layer 4: Base1 LEDs
          ╱────────────╲    ← Layer 5: Base2 LEDs
         ════════════════   ← Board surface
```

---

## Appendix D — Glyph-to-Drum Position Map

When a drum is **calibrated**, the glyph symbols are at fixed positions on the drum surface. The drum `position` value indicates which face is currently facing **North**:

```
TOP DRUM (drum index 0):
  position=0 (North): Cleanse glyph faces North, Quest faces South
  position=1 (East):  Cleanse faces West, Quest faces East
  position=2 (South): Cleanse faces South, Quest faces North
  position=3 (West):  Cleanse faces East, Quest faces West

MIDDLE DRUM (drum index 1):
  position=0 (North): Battle glyph faces North
  position=1 (East):  Battle faces West
  position=2 (South): Battle faces South
  position=3 (West):  Battle faces East

BOTTOM DRUM (drum index 2):
  position=0 (North): Banner glyph faces North, Reinforce faces South
  position=1 (East):  Banner faces West, Reinforce faces East
  position=2 (South): Banner faces South, Reinforce faces North
  position=3 (West):  Banner faces East, Reinforce faces West
```

The `position` field tells which compass direction the drum's "calibrated north" face is currently pointing toward. The glyph definitions in the `GLYPHS` constant define which face of the drum (relative to calibrated north) each glyph is on.

A glyph is **visible** when:
1. The drum is calibrated.
2. The seal covering that position has been removed.
3. The drum face with the glyph is facing the opening direction.

---

*This document consolidates research from the Return to Dark Tower physical product, the `ultimatedarktower` BLE protocol library, the DarkTowerSync codebase, and web research on Three.js/WebGL 3D rendering techniques.*
