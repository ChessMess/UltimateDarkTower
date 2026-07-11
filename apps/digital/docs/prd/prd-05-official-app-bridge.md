# PRD-05 — Official App Bridge *(future — stub)*

> **Status: future / not MVP.** This stub captures intent and constraints so MVP code leaves the door
> open. Flesh out into a full PRD before implementation. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

Connect UTDD to Restoration Games' **official companion app** so the app becomes the game brain and
UTDD becomes the tower + board it drives. The official app then commands the emulated tower (lights,
sounds, drum rotation, seal/glyph state) and tells the player where to place foes; the player's
physical actions (drop skull, break seal) are reported back to the app.

## 2. Goals

- Let the official app connect to UTDD as if UTDD were a real tower.
- Drive the existing UTDD tower + board UI from the app, with **no UI rewrite** — by swapping the
  MVP `ManualSource` for a `BridgeSource`.
- Report player-initiated tower events back to the app accurately.

## 3. Hard constraint (why this needs a Node/Electron layer)

The official app connects to the tower as a **Bluetooth LE peripheral** (the app is the central). **A
browser cannot advertise as a BLE peripheral.** Therefore the bridge needs a **Node/Electron process**
running a fake BLE peripheral. UDT Sync already implements one: `packages/host/src/fakeTower.ts`
(`@stoprocent/bleno`), with a WebSocket relay the browser can subscribe to.

## 4. Functional Requirements (draft)

1. **FR-05.1** A Node/Electron host MUST advertise a BLE peripheral matching the tower's GATT service
   UUID and device name, and accept the official app's connection (reuse/extend UDT Sync's FakeTower).
2. **FR-05.2** The host MUST decode each 20-byte command the app writes (`rtdt_unpack_state`) into a
   `TowerState` and relay it (WebSocket) to the UTDD UI.
3. **FR-05.3** The host MUST **synthesize tower→app notifications** a real tower would send — skull
   drops (advancing `beam.count`), calibration-complete, and the battery heartbeat (~200 ms; the app
   times out ~3 s) — encoding state with `rtdt_pack_state`. *(This is the main net-new work beyond
   UDT Sync, which today relies on real towers for return traffic.)*
4. **FR-05.4** UTDD MUST provide a `BridgeSource` implementing `TowerStateSource`/`BoardStateSource`
   that consumes the relay stream and forwards player inputs to the host, swappable for `ManualSource`
   with no UI changes.
5. **FR-05.5** Player tower actions in the UTDD UI (drop skull, break seal) MUST result in the
   appropriate synthesized notification to the app.
6. **FR-05.6** Board placement instructions from the app SHOULD drive board tokens automatically where
   the protocol allows; otherwise the player confirms placement manually (the app communicates board
   instructions out-of-band of the tower BLE protocol).

## 5. Non-Goals

- Reverse-engineering anything beyond what's needed to faithfully emulate tower I/O.
- Reimplementing game rules (still the app's job).

## 6. Open Questions

- Packaging: extend UDT Sync's `electron` package vs. a dedicated UTDD host; single Electron app vs.
  browser + local host process.
- Exactly which app→tower commands require synthesized responses, and the precise response timing the
  app expects (validate against logs/UDT Sync diagnostics).
- How board placement instructions reach UTDD (the BLE tower protocol carries tower state, not board
  placement — so this likely stays a manual/assisted step, or needs another channel).
