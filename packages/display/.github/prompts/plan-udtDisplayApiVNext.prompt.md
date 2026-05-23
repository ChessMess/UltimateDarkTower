## Plan: UDT Display API vNext Simplification

Deliver a cleaner vNext API for UltimateDarkTowerDisplay by reducing configuration ambiguity, unifying method/option patterns, and aligning docs/package exports with actual behavior. Breaking changes are allowed; include migration notes for UDT and UDTSync.

**Steps**

1. Phase 1: Lock vNext design decisions. Define the canonical API shape for renderer selection, 3D configuration, seal interaction model, and runtime controls. Remove contradictory or duplicate pathways (depends on user decision: vNext breaking).
2. Phase 1: Define naming consistency rules across mutators/actions/readers (for example one consistent family for scene and audio controls), and map old names to new names for migration guidance (parallel with step 1).
3. Phase 2: Refactor public types and exports in src/types.ts and src/index.ts to match the vNext contract, including explicit 3D option structure and removal of stale/phantom fields (depends on 1).
4. Phase 2: Refactor TowerDisplay orchestration to expose only the chosen vNext control surface and remove no-op ambiguity where feasible (depends on 1 and 2).
5. Phase 2: Refactor Tower3DView options/methods to match TowerDisplay and enforce one clear modelUrl strategy (required vs packaged default), then update internal call sites (depends on 3 and 4).
6. Phase 2: Adjust TowerSideView and TowerStateReadout interaction APIs so seal and side interactions follow one predictable pattern across classes (depends on 1 and 2).
7. Phase 3: Rewrite README and docs/API.md to exactly match exported symbols and runtime behavior, including all 3D control methods and any renamed APIs (depends on 3-6).
8. Phase 3: Add a migration section detailing old-to-new API mapping and minimal UDTSync integration changes (depends on 7).
9. Phase 4: Update example app wiring to use the new API so docs and live examples are authoritative (depends on 3-8).
10. Phase 4: Add/adjust unit tests to cover renamed APIs, option validation, and cross-renderer seal/side propagation semantics (depends on 3-9).

**Relevant files**

- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/types.ts — canonical public option and interface definitions.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/index.ts — exported surface; keep synchronized with docs.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/TowerDisplay.ts — primary orchestration and runtime control surface.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/3d/Tower3DView.ts — 3D option contract and runtime control implementation.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/2d/TowerSideView.ts — side/seal interaction semantics.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/src/TowerStateReadout.ts — readout interaction semantics.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/README.md — high-level API and usage guidance.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/docs/API.md — detailed API reference and method-level contracts.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/example/rendererController.ts — primary integration example.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/tests/unit/TowerDisplay.test.ts — API-level behavior tests.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/tests/unit/Tower3DView.test.ts — 3D API behavior and option validation tests.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/tests/unit/TowerSideView.test.ts — side/seal interaction tests.
- /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay/tests/unit/TowerStateReadout.test.ts — seal grid behavior tests.

**Verification**

1. Run npm run typecheck, npm run lint, npm test, and npm run build in UltimateDarkTowerDisplay.
2. Verify README API table and docs/API.md method list exactly match src/index.ts exports and class public members.
3. Verify no stale options remain in docs (for example phantom fields) and no implemented methods are undocumented.
4. Smoke-test example app flow for side switching, seal toggles, state updates, and 3D controls.
5. Perform a manual migration sanity check against UDTSync observer/client usage to confirm the migration guide covers required consumer changes.

**Decisions**

- Chosen strategy: cleaner vNext API even if breaking.
- In scope: API shape simplification, naming consistency, option validation clarity, and docs/export parity.
- Out of scope: protocol-layer changes in UltimateDarkTower or transport-layer changes in UltimateDarkTowerSync.

**Further Considerations**

1. modelUrl policy: Option A require modelUrl always; Option B ship a first-class package asset export path and default to it.
2. Seal control model: Option A internal toggle state only; Option B external-source-of-truth only; Option C explicit dual-mode API with clear persistence guarantees.
3. No-op behavior policy: keep silent no-op for absent 3D renderer or throw explicit capability errors for vNext clarity.
