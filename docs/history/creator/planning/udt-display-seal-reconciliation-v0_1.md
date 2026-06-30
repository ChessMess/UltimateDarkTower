# UDT ↔ Display Seal-State Reconciliation

**v0.1 · Engineering note · Last updated: 2026-06-25**

> **What this is.** A short note documenting how broken-seal state flows across `ultimatedarktower` (the library), `UltimateDarkTowerDisplay` (the emulator), and the Player/Relay toolchain — and the one integration seam that is still net-new. It is the companion to the observed-vs-derived correction made in Rules-Engine Contract v0.2 and Player↔Relay Protocol v0.1.2.
>
> **Grounding (source-verified 2026-06-25).** Read at `--depth 1` source: `ChessMess/UltimateDarkTower` and `ChessMess/UltimateDarkTowerDisplay`. Symbols cited below are confirmed present, not assumed.

---

## 1. The finding, up front

The reconciliation worry — "I need to mirror in Display how I did seals in the library, and it needs to be remembered" — is **already addressed at the package level.** The library owns an authoritative seal model, the Display package already consumes the *same* `SealIdentifier` type and persists what it's given. The genuinely net-new work is not in either package; it is the **transport** that carries seal state from the rules engine to the Display when the Display runs as a Relay *target* (rather than being driven by the example controller's window message).

## 2. Seal presence is unobservable — so it must be remembered

There is **no seal sensor** on the tower. The firmware receives only a transient `sealReveal` *animation* command; it never reports whether a seal is physically present. Two consequences fix the whole design:

- Seal presence can **never** be an observed/hardware-reported value. (This is why Rules-Engine v0.2 removed `sealIndicated` from the observed-input set.)
- Seal presence is therefore **state someone must remember**, derived only from the breaks that were *commanded*. The authoritative owner is the rules engine (`EngineState`); the library and Display each hold a derived mirror.

It is also **not** part of the packed `TowerState`: the 19-byte packet is `drum[3]` + `layer[6]` lights + audio/beam/led_sequence — there is no seal field. So seal state cannot ride the 20-byte `tower:command` packet; it needs its own channel.

## 3. What the library already provides (`ultimatedarktower`)

In `src/UltimateDarkTower.ts`, a durable software model keyed `level-side`:

- `private brokenSeals: Set<string>` — the remembered set.
- `breakSeal(seal: SealIdentifier)` — fires the firmware `sealReveal` animation **and** records the seal.
- `isSealBroken()`, `getBrokenSeals()`, `markSealBroken()` / `markSealRestored()`, `resetBrokenSeals()`, `getRandomUnbrokenSeal()`.
- A `brokenSeals?: SealIdentifier[]` init-config option; the set is also included in the BLE connection snapshot (`udtBleConnection.ts`) and diagnostics (`udtDiagnostics.ts`), so it is serializable for resync.
- `SealIdentifier = { side: TowerSide; level: TowerLevels }` is defined in `src/udtConstants.ts` and exported from the package root (and via the cycle-free `udtDisplayExports` barrel, since that does `export * from './udtConstants'`).

## 4. What Display already provides (`UltimateDarkTowerDisplay`)

A complete, **typed** seal render pipeline that imports the canonical type — `import type { SealIdentifier } from 'ultimatedarktower'` — rather than redefining it:

- `TowerRenderView.applySeals(brokenSeals: SealIdentifier[])` → `TowerDisplay.applySeals` → `state.applySeals(...)` → fans to all renderers.
- `SealManager.applySeals(brokenSeals, lighting)` — 3D seal nodes + backlights, with listeners (`onSealsApplied`).
- `Tower3DView` persists `latestBrokenSeals` and **re-applies** them after re-render/calibration, and warns if a model seal node is missing.
- `PhysicsManager.applyBrokenSeals(broken: SealIdentifier[])` — colliders.
- `onSealClick?: (seal: SealIdentifier) => void` for interactive seal selection.

So Display already (a) shares the library's `SealIdentifier`, (b) renders broken seals in 2D and 3D, and (c) **remembers** them across re-renders. The "is it in there?" answer is **yes**.

## 5. The one seam that is net-new

Today the only thing wiring seal state into the emulator is the **example controller**: `TowerController.ts` reads `Tower.getBrokenSeals()` and `postMessage({type:'applySeals', seals})` to the emulator window, where `TowerEmulator.ts` calls `display?.applySeals(seals as any)`. That works, but:

1. It is **example glue**, not a contracted channel; the real driver in the toolchain is the rules engine, not a controller UI.
2. The `as any` cast exists only because the data crosses an untyped `postMessage` boundary — not a real type mismatch.

For the toolchain, the contracted path is: **engine (authoritative `brokenSeals`) → Relay `tower:seals` sidecar (Protocol v0.1.2 §5.6 / R12) → Display `applySeals(SealIdentifier[])`.** The physical-tower target ignores the sidecar (no seal model in hardware); the emulator target renders from it. Nothing in Display needs to change to *consume* it — `applySeals` is already the right entry point.

## 6. Recommended actions (small)

- **No package-level seal-model change needed.** Library and Display already agree on `SealIdentifier` and both remember state.
- **Define the `tower:seals` message** as a typed shape in the shared workspace (`{ brokenSeals: SealIdentifier[] }`), so the engine→Relay→Display path is typed end-to-end and the `postMessage(... as any)` cast can be replaced with the shared type.
- **Relay (when published):** forward `tower:seals` to the selected target and cache the last set for `relay:sync` catch-up (R12). Hold no seal logic.
- **Optional hygiene:** have the example controller import the same `tower:seals` type at the window boundary to drop the `as any`.

## 7. The invariant to preserve

One authoritative seal model (the engine). The library's `brokenSeals` and Display's `latestBrokenSeals` are **derived mirrors**, fed only from commanded breaks — never independently re-derived, never read from hardware. This is the same rule applied to glyph facing (derived from drum positions, not reported), and it is what keeps the simulator and the live runtime in lockstep.

---

*Companion to: Rules-Engine / Shared-Package Contract v0.2 (§3.1, §3.4, §4.3, §5.2, §5.4), Player↔Relay Protocol v0.1.2 (§4.4, §5.6, §11 R12), Player PRD v0.3 (PR-7.7.4, PR-7.11.2, PR-7.15.3). Source-verified against `ultimatedarktower` v4.1.0 and `UltimateDarkTowerDisplay` (2026-06-25).*
