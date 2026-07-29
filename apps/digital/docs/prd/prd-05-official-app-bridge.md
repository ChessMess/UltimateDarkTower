# PRD-05 — Official App Bridge

> **Status: implemented (tower channel).** The official companion app can drive UTDD's tower through
> the relay. Board placement remains manual — see §6. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

Connect UTDD to Restoration Games' **official companion app** so the app becomes the game brain and
UTDD becomes the tower it drives. The app commands the emulated tower (lights, sounds, drum rotation,
seal reveals) and UTDD renders it; the player's physical actions (dropping a skull) are reported back
to the app.

This closes the loop the MVP left open: the player no longer mirrors the tower channel by hand.

## 2. Architecture — three processes, one already built

```
official app  ──BLE──▶  relay host  ──WebSocket──▶  UTDD (browser)
                        (Node/Electron)             BridgeTowerSource
```

**The host side already existed.** When this PRD was a stub it assumed the BLE peripheral, the
command decoding, and the synthesized return traffic were all net-new work living in a separate
repo (`UltimateDarkTowerSync`'s `packages/host/src/fakeTower.ts`). That repo was folded into this
monorepo, and all of it now ships in **`packages/relay-core`**:

| Piece                                        | Where                                              |
| -------------------------------------------- | -------------------------------------------------- |
| BLE peripheral advertising as the tower      | `packages/relay-core/src/towerEmulator.ts`         |
| 20-byte command decode + WebSocket broadcast | `commandParser.ts` + `relayServer.ts`              |
| Synthesized tower→app notifications          | `notificationSynthesizer.ts`                       |
| Runnable hosts                               | `apps/relay-cli` (headless), `apps/relay-electron` |

So the only work this PRD required was the **UTDD end**: a relay client behind the existing
`TowerStateSource` seam.

**Why a Node/Electron host is unavoidable:** the app connects to the tower as a Bluetooth LE
**peripheral** (the app is the central), and a browser cannot advertise as a BLE peripheral. Web
Bluetooth is central-only.

## 3. Functional Requirements

1. **FR-05.1** A Node/Electron host MUST advertise a BLE peripheral matching the tower's GATT service
   UUID and device name and accept the app's connection. — **Done** (`TowerEmulator`).
2. **FR-05.2** The host MUST decode each 20-byte command the app writes and relay it to UTDD. —
   **Done** (`CommandParser` → `RelayServer.broadcast`).
3. **FR-05.3** The host MUST synthesize the tower→app notifications a real tower would send: skull
   drops, calibration-complete, and (optionally) a battery heartbeat. — **Done**
   (`NotificationSynthesizer`).
4. **FR-05.4** UTDD MUST provide a `BridgeSource` implementing `TowerStateSource` that consumes the
   relay stream, swappable for `ManualSource` with no UI changes. — **Done**
   (`apps/digital/src/sources/BridgeTowerSource.ts`).
5. **FR-05.5** Player tower actions in UTDD MUST result in the appropriate synthesized notification
   to the app. — **Done** for skull drops (`client:action` → `NotificationSynthesizer.dropSkull()`).
   Seal breaks are **not** reported: a real tower cannot detect a snapped seal, so there is no
   notification to synthesize (see §5).
6. **FR-05.6** Board placement instructions SHOULD drive board tokens where the protocol allows. —
   **Not possible over this channel**; stays manual (see §6).

## 4. How UTDD consumes it

`BridgeTowerSource` **wraps** a `ManualTowerSource` rather than replacing it. The 3D stage
(`TowerBoardStage`) captures the store's tower source once at mount, so swapping the object at
runtime would leave the scene painting a dead source. Wrapping keeps a single instance for the app's
lifetime:

- **Disconnected** — every call falls through to the inner manual source. UTDD behaves exactly as it
  did before the bridge existed.
- **Connected** — decoded `TowerState` from the app replaces local state; `rotateDrum` is ignored
  (the app owns the drums); `dropSkull` goes out over the wire.

Two details worth knowing:

- **The skull counter is UTDD's own while connected.** Every command the app writes carries its own
  beam count (bytes 15-16 of the state block), so reading `TowerState.beam.count` would let the app
  clobber the player's count on the next command. The bridge keeps its own counter, mirroring
  `NotificationSynthesizer`'s.
- **Loading a saved session while connected** restores seals and the skull count, but the tower state
  itself is transient — the app's next command replaces it.

## 5. Seal reveals

The protocol has no "seal broken" field, and the tower has no sensor for it — breaking a seal is
purely physical. What the app _does_ send is the firmware's `sealReveal` LED sequence (`0x0e`) with
the target opening lit. `detectSealReveal` (`apps/digital/src/sources/sealReveal.ts`) maps that to a
`SealRef`: ring layers 0/1/2 are the top/middle/bottom drums and light indices 0-3 are N/E/S/W.

It auto-breaks the seal only when **exactly one** ring light is lit. Zero or several is ambiguous and
is treated as no reveal rather than a guess — the player's manual seal tap still works and overrides.
The mapping is inferred from the library's layer constants, **not** yet confirmed against a capture
from the live app; validate it against `apps/relay-cli`'s JSONL logs during a real session.

## 6. Non-Goals

- Reverse-engineering anything beyond faithful tower I/O emulation.
- Reimplementing game rules — still the app's job.
- **Automated board placement.** The BLE protocol carries _tower_ state, not board placement, so
  "place [foe] at [location]" cannot arrive over this channel. It stays a manual step, as in the MVP.
- **Calibration animation.** `TowerDisplay` already runs a drum sweep when a state carries the
  calibration command byte, but `TowerStateSource` passes a plain `TowerState` with no command byte,
  so it never fires. Wiring it means widening the seam to `AppliedTowerState` — a follow-up.

## 7. Running it

**As a player** — no checkout, no build:

```bash
npx ultimatedarktowerrelay-cli   # then open the URL it prints and click Connect
```

The relay publishes to npm (`apps/relay-cli`, `private: false`) and the BLE natives ship N-API
prebuilds, so there is no compile step. The UI is the deployed Pages build,
<https://chessmess.github.io/UltimateDarkTower/digital/>.

**From a checkout**, for development:

```bash
pnpm build
node apps/relay-cli/dist/index.js          # default TOWER_SOURCE=emulator
pnpm --filter ultimatedarktowerdigital dev # then Connect in the "Official app" panel
```

`TOWER_SOURCE=mock` gives a BLE-free host for verifying the UTDD end without the app.

### macOS: the "checking firmware" wall

macOS **cannot** expose the Bluetooth Device Information Service in peripheral mode (CoreBluetooth
blocks standard SIG UUIDs), and the app reads the DIS firmware revision before it will proceed. Two
ways past it, per [MACOS_BLE_PERIPHERAL_LIMITATION.md](../../../../docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md):

1. **Real-tower handoff** — connect the app to a real tower first so it clears the firmware screen,
   disconnect the tower, then reconnect the app to the emulator.
2. **Run the host on Linux/Raspberry Pi or Windows**, where the DIS is exposed and the app clears the
   screen on its own. Recommended for a standalone setup.

### The deployed build CAN reach a local relay — but only on loopback

An earlier revision of this PRD claimed the Pages build was cut off from a local relay by
mixed-content blocking. **That was wrong**, and it was the reason the player guide routed people
through a local dev server (and therefore a clone and a full build).

`localhost` / `127.0.0.1` are _potentially trustworthy_ URLs, which the mixed-content algorithm
exempts, so an `https://` page may open a `ws://localhost` socket. Verified in Chrome 150 against
the live Pages site:

| From `https://chessmess.github.io` | Result                                             |
| ---------------------------------- | -------------------------------------------------- |
| `ws://localhost:8765`              | allowed — fails only with `ERR_CONNECTION_REFUSED` |
| `ws://127.0.0.1:8765`              | allowed — same                                     |
| `ws://example.invalid:8765`        | **blocked** — `SecurityError` at construction      |

`RelayServer` sets no `verifyClient`/Origin check, so the cross-origin handshake completes normally.
The Pages build is therefore the **recommended** UI for a relay on the same machine.

**The exemption is loopback only.** A relay on another machine — a Pi, a second PC — reached at
`ws://192.168.x.x:8765` **is** blocked from the `https://` page. That case needs one of:

1. run the browser on the relay machine (it's loopback again);
2. `ssh -L 8765:localhost:8765 user@relay-host` — restores loopback, no extra software;
3. real TLS, e.g. `tailscale serve` fronting the relay with a
   `https://<host>.<tailnet>.ts.net` certificate so the URL becomes `wss://`. Note the Tailscale
   `100.x` address alone does **not** help — it isn't loopback.

### Local Network Access — the second gate, and the one that actually bites

Mixed content is not the only check. **Chrome's Local Network Access permission gates
public-origin → loopback requests**, it shipped in Chrome 142, and it was
[extended to WebSockets in Chrome 147](https://developer.chrome.com/blog/local-network-access).
So the Pages build reaching `ws://localhost:8765` requires the player to grant a permission prompt.

**Confirmed on the live Pages origin in Chrome 150**, against a running relay. The dialog is:

> **chessmess.github.io wants to:**
> Access other apps and services on this device — \[Block] \[Allow]

Observed sequence, and the part that matters:

1. First attempt → the prompt appears and **that attempt is aborted**, instantly: an `error` event
   then `close 1006`, with a bare `failed:` and no `net::` reason. (Contrast the
   `ERR_CONNECTION_REFUSED` you get when nothing is listening — different signature, useful for
   telling the two apart.)
2. Player clicks **Allow**.
3. Every subsequent attempt connects in ~4ms.

Consequences:

- **The first Connect click is expected to fail.** `BridgeTowerSource.connect` therefore retries
  **once**, gated on `awaitLocalNetworkGrant()` — it waits for the permission to actually flip to
  `granted` (Permissions API `onchange`, 30s cap) rather than guessing a delay, because the abort is
  instantaneous while the click is however long the player takes to read. Covered by three tests in
  `BridgeTowerSource.test.ts`. Browsers without the permission throw on `query()` and fall through
  to the existing error path.
- Chrome **remembers a Block** and will not re-prompt, so the guide documents the site-settings
  recovery (`Site settings → Local network access → Allow`).
- **A local-origin page is not gated.** LNA gates _public_ → local, and `http://localhost:5173` is
  itself a local origin — which is exactly why development never hit this.

**Testing this correctly needs all three of: a live relay, the hosted origin, and a non-automated
browser.** Drop any one and you get a false result. This was misdiagnosed twice: first as "not a
blocker" from a run with nothing listening (a connection refusal short-circuits before the
permission gate engages), then as "no gate at all" from a run on `http://localhost:5173` (a local
origin, never gated). Under CDP the prompt is suppressed entirely and the socket just hangs in
`CONNECTING`.

## 8. Open questions

- The exact seal-reveal light pattern the app emits (see §5) — resolve from a live capture.
- Whether the app needs the optional periodic battery heartbeat; `NotificationSynthesizer` has it
  disabled by default on the theory that the initial heartbeat plus per-write echoes suffice.
- The DIS firmware revision value the current app accepts (`TOWER_DIS_FIRMWARE_REVISION`).
