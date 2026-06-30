# Return to Dark Tower — Player↔Relay Protocol Contract

**v0.1.2 · Draft for review · The wire contract between the Player (as command source) and the Relay · Last updated: 2026-06-25**

> **v0.1.2 — seal/glyph ownership resolved + the seal-state sidecar.** The cross-document question carried since v0.1.1 (§10 Q12 / §11 R7) is now **decided in the rules-engine contract (v0.2)**: glyph facing and seal presence are **engine-owned, not tower-reported**. Glyph facing is *derived* from mirrored drum positions (`getGlyphsFacingDirection`); the seal to break is *engine-chosen* and commanded (`breakSeal`), and seal presence has **no hardware sensor**. So `tower:observed` now carries **only `skullCounter` and `towerState`** — `sealIndicated`/`glyphRevealed` are removed (§4.4). A source read of `UltimateDarkTowerDisplay` (2026-06-25) confirmed the corollary that v0.1.1 only half-saw: **seal presence is not in the 19-byte packed `TowerState`** (it is `drum[3]` + `layer[6]` lights + audio/beam/led_sequence — no seal field), so it **cannot ride the `tower:command` packet**. This version adds the **seal-state sidecar** (§5.6, §11 R12): an app-level broken-seal message the **emulator target** renders via its existing `applySeals(SealIdentifier[])` surface and the **physical tower ignores**. Idempotency wording (§5.1) and the seal/glyph rows (§4.4, §5.5) corrected to match. **Also resolves Q6/R9 (version-compat): semver-range, not exact-string** (§8). Prior banners preserved below.

> **v0.1.1:** Draft for review · re-grounded against repo *source* · Last updated: 2026-06-24

> **Verification pass — re-grounded against repo *source*, not just docs (2026-06-24).** A second pass read the Sync host/relay **source code** and the UDT v4.1.0 **command constants** (not only the type declarations and prose docs). Net result: several §10 assumptions are now **resolved**, two prior statements are **corrected**, and the things the Relay must implement are **tagged for review in §11**. Headlines: (1) **The 20-byte packet is resolved [UDT]** — `byte[0]` = command type (`0x00` = full tower-state), `byte[1..19]` = the 19-byte packed `TowerState` (`TOWER_COMMAND_PACKET_SIZE = 20`, `TOWER_STATE_DATA_SIZE = 19`, `TOWER_STATE_DATA_OFFSET = 1`, `TOWER_COMMAND_TYPE_TOWER_STATE = 0x00`). (2) **Version-mismatch hard-close is real prior-art behavior, not a tightening** — Sync's `relayServer.ts` *does* `socket.close(4000)` on mismatch (the prose `PROTOCOL.md` was stale); §8 corrected. (3) **The upstream observed channel is plumbing, not research** — the data already exists as UDT driver callbacks (`onSkullDrop(towerSkullCount)`, `onTowerStateUpdate`, `onCalibrationComplete`, `onTowerConnect/Disconnect`); only its wire surfacing is net-new; §4.4 downgraded. (4) **Audio is a one-shot trigger, not persistent state** — UDT's `sendTowerState` zeroes audio "to prevent persistence", so a replayed snapshot must zero audio or it re-fires the sound; idempotency claim qualified in §5.1. (5) **Role inversion confirmed** — Sync's host is a BLE *peripheral* (`bleno`); the new Relay's target side must be a BLE *central*, which UDT already supports via an injectable `BleConnection` (`setConnection`), so the Relay reuses UDT rather than forking it (§11). Original v0.1 banner preserved below.

> **v0.1 (original):** Draft for review · The wire contract between the Player (as command source) and the Relay · Last updated: 2026-06-24

> **This is a contract, not a tutorial.** It specifies the messages on the wire between the Player-as-**source** and the **Relay**, and nothing else. It sits **beside** the rules-engine contract and **below** nothing: it is the wire *realization* of one seam that contract already fixed — the `tower.program` directive going **down** and the `observed` inputs (`skullCounter` / `towerState`) coming **back up** (rules-engine §5.2 / §5.4). It does **not** redefine that seam; it carries it. It never re-describes game logic, scenario data, or BLE/calibration internals — those belong to the engine, the schema, and the Relay respectively.
>
> **Grounding — partly source-verified, partly intended-design (2026-06-24).** The standalone Relay repo is **not yet published**: a probe of `github.com/ChessMess/UltimateDarkTowerRelay` (and `Relay`, `UDTRelay`) returns *no such repo*. The Relay was split out of the prior **Sync** project, which **does** exist and was cloned and read: `github.com/ChessMess/UltimateDarkTowerSync` — its `docs/PROTOCOL.md`, `docs/ARCHITECTURE.md`, `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`, and `packages/shared/src/{protocol,types,version}.ts` are the wire grounding for everything marked **[Sync]** below. Tower command/state shapes are pinned to **UDT @ v4.1.0** (`npm pack ultimatedarktower@4.1.0`): `TowerState`, `rtdt_pack_state` / `rtdt_unpack_state`, `isCalibrated`, `STATE_DATA_LENGTH = 19`, the packet constants (`TOWER_COMMAND_PACKET_SIZE = 20`, `TOWER_STATE_DATA_OFFSET = 1`, `TOWER_COMMAND_TYPE_TOWER_STATE = 0x00`), the driver callbacks (`onSkullDrop` / `onTowerStateUpdate` / `onCalibrationComplete` / `onTowerConnect/Disconnect`), the injectable `BleConnection` (`setConnection`), and the BLE-identity constants (`UART_SERVICE_UUID`, `UART_RX/TX_CHARACTERISTIC_UUID`, `DIS_*`, `TOWER_DEVICE_NAME`) are all source-confirmed. The v0.1.1 pass additionally read Sync's **host source** (`relayServer.ts`, `connectionManager.ts`, `fakeTower.ts`, `packages/electron`), not just its docs. **Everything not marked [Sync] or [UDT] is grounded on intended design and flagged in §10/§11 for re-verification when the Relay repo lands.** This project has been burned by version drift; nothing here is assumed.

---

## 0. What this is, in one paragraph

The protocol is the **network seam** of the toolchain. The Player owns the game and runs the rules engine; the engine emits `tower.program` directives; the Player hands their resolved tower output to the **Relay** as a stream of full-state, idempotent command snapshots, and the Relay fans them out to whatever **targets** exist — a physical tower over Bluetooth, a Display **emulator**, and (post-MVP) remote clients. In the other direction, what the tower physically *reports* — the skull/beam counter, which seal a "remove a seal" event indicated, a revealed glyph, the full drum/calibration state — travels back up to the Player and re-enters the engine as `observed` inputs. The Player **never owns Bluetooth**: it presents the user a target choice, *requests* that target from the Relay, and otherwise opens no BLE, selects no device, and runs no calibration. This document defines the transport (§2), the target abstraction (§3), the closed message vocabularies in both directions (§4), command semantics and the tick model (§5), the calibration/connection lifecycle (§6), drop/reconnect/resync (§7), versioning (§8), the trust posture (§9), and the open questions (§10).

---

## 1. Purpose & boundaries

### 1.1 What the protocol is

The contract between the **Player (a command source)** and the **Relay (a source-agnostic command router)**. It is the only Phase-0 hard contract without a prior document, and the Player cannot connect, emit, or recover without it (Player §12).

- **Source.** Any producer of the tower's command stream — the Player app (custom scenarios) is one; the official companion app is another; the Relay is agnostic to which (Player §2.5).
- **Target.** Any consumer of that stream — a physical tower (Bluetooth), a Display **emulator**, and/or one or more remote clients. **One source fans out to many targets, and fan-out is the Relay's job, not the source's** (Player §2.5).
- **Dumb by design.** Commands are full-state, idempotent snapshots, so the Relay carries **no game logic, turn state, or scenario data**. It mirrors tower output; it does not coordinate gameplay. A missed command is corrected by the next; a late joiner catches up from the last full-state command (Player §2.5; **[Sync]** ARCHITECTURE "Why Full-State Commands Prevent Sync Drift").

### 1.2 What stays out of it

| Out of scope | Owner | Why it is not on this wire |
| --- | --- | --- |
| Turn/phase flow, legality, win/loss, decks, skull economy | **Rules engine** | The engine runs entirely in the Player; the Relay never sees game state (rules-engine §1). |
| The scenario file, schema, references | **Schema package** | Scenario data never crosses the wire; only resolved tower output does. |
| BLE connect/scan/GATT, calibration mechanics, fan-out | **Relay** | The source requests a target and reads status; it never drives the radio (Player §7.3). |
| `board.mutate`, `ui.*`, `media.*` directives | **Host / Board / Display** | Only `tower.program`'s realization crosses this wire (rules-engine §5.2). |
| **Emergence skull *count*** | **Physical tower** | The protocol reports it **up** (observed); it is **never** sent **down** as a command (the skull invariant, rules-engine §1.2; Player §7.12.2). |

The skull invariant is structural here: **no Source→Relay message carries a skull count.** The downstream "drop a skull" trigger (§4.2, `skull.dropTrigger`) is countless by construction; the count comes back as a `tower:observed` value (§4.3).

---

## 2. Transport & session model

### 2.1 Transport baseline — WebSocket over a local network

- **WebSocket, JSON text frames.** **[Sync]** The transport is WebSocket; every message is a JSON-encoded object sent as a text frame. The baseline endpoint in the prior art is `ws://<relay-host>:8765`.
- **Local-network / offline operation.** Table sessions may have no internet; the source↔Relay link must work over a LAN (Player §9.4). This forbids any design that requires a cloud round-trip on the command path.
- **Ordering & framing.** A single WebSocket connection gives in-order, reliable byte delivery (TCP). The protocol relies on that ordering and adds a monotonic `seq` for log correlation, not for retransmit (§5.2).

### 2.2 Envelope

**[Sync]** Every message — both directions — shares one envelope:

```jsonc
{
  "type": "<namespace>:<event>",   // colon-namespaced discriminant (closed set, §4)
  "payload": { /* message-specific */ },
  "timestamp": "2026-06-24T12:00:00.000Z"  // ISO-8601 UTC, set by the sender
}
```

`type` is a string discriminant; `payload` is a per-type object; `timestamp` is sender-stamped ISO-8601. The vocabulary of `type` values is **closed** (§4).

### 2.3 Connect + handshake

1. The source opens the WebSocket to the Relay.
2. **The source's first message is `source:hello`** (§4.1), carrying its role, an optional label, and the `protocolVersion` it speaks (§8). **[Sync]** The prior art requires the client's `hello` to be the first message and enforces a handshake timeout in `connectionManager.ts` — a non-completing handshake is closed with WebSocket code `1008` ("Handshake timeout").
3. The Relay replies with `relay:sync` (the last full-state command, or `null`) and a `relay:status` (§4.3). **[Sync]** `sync:state` is *always* sent on connect, even when `lastCommand` is `null`.
4. The source then requests a target (§3).

### 2.4 How a source identifies itself

`source:hello.payload` declares `{ role: "source", label?, protocolVersion, engineVersion?, udtPin? }`. `engineVersion` and `udtPin` are informational — they let the Relay and the play log correlate a session with the rules-engine and UDT versions the source ran (§8); the Relay does not interpret them as game state.

> **[intended-design]** In Sync the source seat is occupied by the *official companion app*, which the host impersonates a tower *to* (the host's `FakeTower` BLE peripheral) and which therefore never speaks this handshake — Sync's `client:hello` is sent by the **remote tower clients (targets)**, not by the source. In the Player↔Relay model the **Player is an explicit, first-class source that speaks the handshake directly.** This role inversion is the central generalization this protocol makes over the prior art; re-verify the handshake against the real Relay (§10).

---

## 3. Target abstraction

### 3.1 Naming & selection

The Player presents the user exactly two MVP target kinds and forwards the choice to the Relay; it never enumerates BLE devices itself (Player §7.2.1, §7.2.3).

| `target` value | Meaning | Path |
| --- | --- | --- |
| `tower` | A physical *Return to Dark Tower* over Bluetooth | Player → Relay → BLE tower |
| `emulator` | A Display software tower | Player → Relay → Display |

- **The emulator is a first-class target, not a hidden mode.** Selecting it routes Player → Relay → Display on the **same code path** as real-tower play, which is precisely what removes the Web Bluetooth platform constraint and enables iOS Safari (Player §2.5, §7.2.3, §9.1).
- **The source carries no BLE knowledge.** It sends `target:request { target }` (§4.2) and reads back `relay:status` (§4.3). Device discovery, GATT, and the radio live entirely in the Relay.
- **Fan-out lives in the Relay.** A single source can drive a tower *and* an emulator *and* remote clients at once; the source emits one stream and is agnostic to how many targets exist (Player §2.5). The MVP scopes this to **one** target (§1.2 here, Player §12 Phase 1).

### 3.2 Target enumeration

> **[intended-design]** Sync has **no target-enumeration message** — a client simply connects and uses its own local tower. The Player↔Relay model needs the source to *choose among* Relay-provided targets, so a `target:request` (and, post-MVP, a target list) is **net-new**. v0.1 specifies only the two-kind request above and defers a richer enumeration/`targetId` scheme to §10. Naming a *specific* physical tower (multiple towers on one Relay) is post-MVP.

---

## 4. Message vocabulary (closed, both directions)

Two closed vocabularies. `[Sync]` = shape inherited from the prior art (re-verify role/direction); `[intended-design]` = net-new for this protocol, re-verify against the real Relay.

### 4.1–4.2 Source → Relay

| `type` | Payload | Purpose | Grounding |
| --- | --- | --- | --- |
| `source:hello` | `{ role: "source", label?, protocolVersion, engineVersion?, udtPin? }` | Handshake; **must be the first message**; identifies + version-negotiates (§8). | **[Sync]** envelope of `client:hello`; role generalized |
| `target:request` | `{ target: "tower" \| "emulator", targetId? }` | Ask the Relay to provide/connect a target. No BLE detail. | **[intended-design]** |
| `calibrate:request` | `{}` | Ask the Relay to (re)calibrate the connected physical tower. No-op for `emulator`. | **[intended-design]** |
| `tower:command` | `{ data: number[], seq?: number }` | **The full-state idempotent snapshot** — the realization of `tower.program` (§5). `data` is the raw command bytes as a JSON array; `seq` is a monotonic counter for log correlation. | **[Sync]** `tower:command` (direction generalized to source→Relay) |
| `source:control` | `{ action: "pause" \| "resume" \| "resyncRequest" }` | Session control unrelated to game logic; maps to the engine's `control` input domain (rules-engine §5.3). `resyncRequest` asks the Relay to re-send `relay:sync`. | **[intended-design]** |

**The tower command is the only material downstream message.** Its `data` is a complete tower-state snapshot (§5.1); it never carries a skull count (§1.2).

### 4.3 Relay → Source

| `type` | Payload | Purpose | → engine `observed`? | Grounding |
| --- | --- | --- | --- | --- |
| `relay:status` | `{ relaying, targetKind, targetState, calibrated, clientCount?, lastCommandAt }` | Connection + target health (§6.3). `targetState ∈ {idle, connecting, connected, calibrating, ready, dropped, error}`; `calibrated: boolean`. | **No** — transport/UI only | **[Sync]** `host:status` (generalized) |
| `relay:sync` | `{ lastCommand: number[] \| null }` | Full-state catch-up on connect and on resync (§7). | **No** — transport/recovery only | **[Sync]** `sync:state` |
| `tower:observed` | `{ kind, ... }` — see §4.4 | **The upstream observed-event channel** — the tower's reported values. | **Yes** — each maps to one `ObservedKind` | **[intended-design]** (net-new) |
| `relay:ack` | `{ seq }` | Optional: last `seq` the Relay accepted (resync only; commands are otherwise fire-and-forget, §5.2). | **No** | **[intended-design]** |
| `relay:error` | `{ code, message, fatal? }` | A transport/target error to surface; `fatal: true` precedes a close. | **No** — surfaced in UI | **[intended-design]** |
| `relay:paused` | `{ reason }` | Target/source link dropped — pause the game UI (§7). | **No** | **[Sync]** `relay:paused` |
| `relay:resumed` | `{}` | Link restored — dismiss the pause overlay. | **No** | **[Sync]** `relay:resumed` |

> **Which Relay→Source messages are engine inputs.** Exactly one family is: **`tower:observed`**. Each `tower:observed` becomes an engine `observed` input (rules-engine §5.4) and a first-class member of the canonical input stream, so a recorded session replays bit-identically. **`relay:status`, `relay:sync`, `relay:ack`, `relay:error`, `relay:paused/resumed` are *not* engine inputs** — they drive the Player's transport, UI, and recovery layers only. Conflating the two would leak transport nondeterminism into the engine and break lockstep (rules-engine §6); this boundary is non-negotiable.

### 4.4 The `tower:observed` kinds — the §5.4 bridge

Each kind maps 1:1 to an engine `ObservedKind` (rules-engine §5.4). **As of v0.1.2 there are exactly two** — the only values the tower genuinely reports:

| `kind` | Payload | Engine `observed` | Source of truth |
| --- | --- | --- | --- |
| `skullCounter` | `{ count, delta? }` | `skullCounter` | **The emergence count** — tower-determined; the engine never predicts it (the skull invariant). **[UDT]** surfaced by the driver as `onSkullDrop(towerSkullCount)` / the `towerSkullDropCount` accessor (read from `SKULL_DROP_COUNT_POS` in the notification); it is **cumulative** and resettable via `resetTowerSkullCount()`, so the engine consumes the **delta** since the trigger. |
| `towerState` | `{ state }` where `state` is a `TowerState` (or its packed bytes) | `towerState` | Drum positions, calibration, full-state resync after a drop/reconnect. **[UDT]** pushed via `onTowerStateUpdate(new, old, source)`; `rtdt_unpack_state` decodes raw bytes. **Genuinely observed.** Used for recovery, not as a per-turn input. |

> **Removed in v0.1.2 — `sealIndicated` and `glyphRevealed` are not observed.** The v0.1.1 caveats are now decisions (rules-engine v0.2 §3.4/§5.4): **seal selection is engine-commanded** (`breakSeal`; seal presence has no sensor and is remembered, not read) and **glyph facing is engine-derived** from mirrored drum positions (`getGlyphsFacingDirection`). The Relay therefore never reports either. Seal *presence* still has to reach the **emulator target** for rendering — but as an **app-level sidecar** (§5.6), not as an observation, because it is not in the hardware packet.

> **[intended-design] — net-new on the wire, but the data already exists.** Sync has **no Relay→source observed channel** at all: its only upstream messages are the targets' handshake/ready/log (`client:hello` / `client:ready` / `client:log`); the official app, as Sync's source, reads tower responses over its *own* emulated BLE link to the host's `FakeTower`, not over the relay. In the Player↔Relay model the **Relay owns the real tower's radio**, so the tower's reported values *must* come back to the source over this wire — there is no other path. The v0.1.1 verification pass found the **values themselves are not a research problem**: UDT's driver already decodes and emits them as callbacks (`onSkullDrop`, `onTowerStateUpdate(new, old, source)`, `onCalibrationComplete`, `onTowerConnect/Disconnect`). So `tower:observed` is a **plumbing/exposure task** — the Relay subscribes to UDT's callbacks and forwards them up (§11 R7) — not a new decode effort. Only the **wire shape** is unspecified and must be locked against the real Relay (§10).

---

## 5. Command semantics

### 5.1 The command is a full-state snapshot (not a delta)

**[Sync]** Every `tower:command.data` is a **complete** tower-state snapshot — all drum positions, all LEDs, audio trigger, beam/skull flags, in one packet — never an incremental delta. **[UDT]** Its content is a `TowerState` packed by `rtdt_pack_state(buffer, len, state)` and read by `rtdt_unpack_state(bytes)`; `TowerState = { drum:[Drum×3], layer:[Layer×6], audio, beam:{count,fault}, led_sequence }`.

- **Idempotency — with one caveat.** Replaying the same snapshot reproduces the same **lights and drum positions**. This is what makes fire-and-forget safe and a missed command self-correcting (**[Sync]** ARCHITECTURE). **Caveat [UDT]:** *audio is a one-shot trigger, not persistent state.* UDT's `sendTowerState` deliberately **zeroes the audio field** (`audio = {sample:0, loop:false, volume:0}`) "to prevent persistence", because re-sending a snapshot whose audio sample is non-zero would **re-fire the sound**. The source must therefore zero audio on any **replay** (notably the resync re-emit, §7.1) so a state-restoring snapshot does not re-trigger a clip. Lights/drums are idempotent; audio is edge-triggered. **Seal state is *not* in this snapshot at all** (corrected v0.1.2): the packed `TowerState` has no seal field, so seal presence is replayed via its own sidecar (§5.6), not this packet.
- **Byte layout — resolved [UDT v4.1.0].** The 20↔19 question is answered in source: a command packet is `TOWER_COMMAND_PACKET_SIZE = 20` bytes = `byte[0]` command type + a `TOWER_STATE_DATA_SIZE = 19`-byte packed `TowerState` at `TOWER_STATE_DATA_OFFSET = 1`. The full-state snapshot uses `byte[0] = TOWER_COMMAND_TYPE_TOWER_STATE = 0x00`; other command types exist for non-state commands. v0.1.1 keeps `data: number[]` on the wire (the receiver validates length and `byte[0]`), and the **source owns packing** — it resolves the engine's `tower.program` into a `TowerState`, calls `rtdt_pack_state` (UDT, pinned at the workspace), prepends the type byte, and sends the bytes; **the Relay forwards the byte array verbatim to the tower's UART RX characteristic and never packs** (§11 R3, R5). The one residual is whether the real Relay forwards raw packed bytes (recommended, keeps it dumb) or a higher-level `TowerState` it packs itself — confirm at review (§10).

### 5.2 Ordering, sequence, and delivery

- **In-order over one socket.** Commands are applied in send order (TCP-ordered). The source emits at most one in-flight stream per target through the Relay.
- **`seq` is for correlation, not retransmit.** **[Sync]** a monotonic `seq` is assigned for cross-log correlation between source, Relay, and target logs; it is **not** an acknowledgement protocol.
- **Fire-and-forget on the command path.** **[Sync]** there is no per-command ack; the protocol prioritizes low latency over guaranteed delivery, *because* full-state idempotency makes loss self-healing (§5.1). The optional `relay:ack` (§4.3) exists for the resync handshake only.

### 5.3 "Completion fires at start" — respected by construction

The tower firmware reports an action "complete" when it *starts*, not when it ends, so cross-channel sequencing must **never chain on command-complete** (Player §7.16.2; Creator CR-7.8.3; schema §8). This protocol respects that by carrying **no completion semantics at all**: a `tower:command` is a state snapshot, not a "do X then tell me when done" request. All timing is pre-resolved into the schedule of snapshots (§5.4). The Relay never waits on, infers, or reports command completion.

### 5.4 The 50 Hz tick timeline over the wire — source-scheduled snapshots

The engine emits a resolved `tower.program` — one or more `towerOp`s and/or a `timeline` with `wait`s on the **50 Hz / 20 ms** tick (schema `$defs/towerOp`, 11 channels: `light.named` · `light.custom` · `light.effect` · `sound` · `drum.rotate` · `seal.break` · `seal.replace` · `skull.dropTrigger` · `wait` · `rotationBundle` · `timeline`; `wait` is the half-open `[atTick, endTick)` form). The wire must carry this timing **without** making the Relay smart.

**v0.1 design (recommended, grounded on "dumb by design" + full-state idempotency):** **the source pre-resolves the tick timeline into a time-scheduled stream of full-state `tower:command` snapshots**, emitting one snapshot per tick-boundary state change at its scheduled offset (`atTick × 20 ms` from the program's start). The Relay forwards each snapshot exactly as it forwards any command — it holds no timeline, no clock, and no program. A `rotationBundle` resolves to the drum-rotation snapshot plus its matching `rotation` light-sequence snapshot so physical and visual stay in sync (Player §7.16.3). This keeps every wire message idempotent and the Relay a pure forwarder.

> **Tension to reconcile (flagged, §10).** Rules-engine §4.6 notes the tick timeline is "played by the Relay/Display." The reading consistent with "the Relay carries no logic" (Player §2.5) is: the **source** plays the timeline into snapshots, and the **Display emulator** (a *target*) re-renders those snapshots at its own internal 50 Hz — i.e. "Relay/Display" means *the target end*, not the router. The alternative — ship the resolved program/timeline to the Relay and let it play out the schedule — would put timing state in the Relay and is **not** adopted in v0.1. Confirm which the real Relay implements before freezing this (§10).

### 5.5 What maps to what

| Schema `towerOp` channel | On the wire (v0.1) |
| --- | --- |
| `light.named` (MVP: one of 21 `TOWER_LIGHT_SEQUENCES`) | A snapshot setting `TowerState.led_sequence` |
| `light.custom` / `light.effect` *(post-MVP, software tower)* | Snapshot(s) targeting an emulator; out of MVP |
| `sound` | A snapshot setting `TowerState.audio` (firmware clip; distinct from app/device audio) |
| `drum.rotate` / `rotationBundle` | Drum-position snapshot (+ paired light snapshot for the bundle) |
| `seal.break` / `seal.replace` | A snapshot commanding the hardware **animation** (`sealReveal`); *which* seal is engine-chosen, and any glyph behind it is engine-derived — neither comes back as `tower:observed`. Persistent seal presence is carried separately (§5.6); only the emergent `skullCounter` returns |
| `skull.dropTrigger` | A snapshot that triggers emergence — **carries no count** |
| `wait` | Not a wire message — consumed by the source's scheduler (§5.4) |
| `timeline` | Not a wire message — expanded by the source into scheduled snapshots |

### 5.6 The seal-state sidecar — app-level, outside the hardware packet

Seal presence is **not** part of the packed `TowerState` (the 19 bytes are drum positions + layer lights + audio/beam/led_sequence; there is no seal field, because the firmware only ever receives a transient `sealReveal` *animation* and the tower has no seal sensor). It therefore **cannot ride `tower:command`**. The engine owns the authoritative broken-seal set (rules-engine v0.2 §3.1); to keep the **emulator target** rendering persistent open/sealed doorways, the source emits seal presence as a small **app-level companion message**:

```
{ type: "tower:seals", payload: { brokenSeals: SealIdentifier[] }, timestamp }
// SealIdentifier = { side: "north"|"south"|"east"|"west", level: "top"|"middle"|"bottom" }  [UDT]
```

- **Full-state, idempotent.** Like `tower:command`, it carries the **complete** broken-seal set, not a delta — so it self-heals on loss and replays cleanly. It is part of the `relay:sync` catch-up (§7.1) so a late-joiner/reconnecting emulator renders seals correctly.
- **Target-dependent handling.** The **physical-tower** target ignores it (no seal model in hardware; the player removes the seal by hand after the `sealReveal` animation). The **emulator (Display)** target applies it through its existing surface — `TowerRenderView.applySeals(brokenSeals: SealIdentifier[])` → `TowerDisplay`/`SealManager` — which already persists and re-applies seal state across re-renders. **[UDT/Display, source-verified 2026-06-25.]**
- **Relay stays dumb.** The Relay forwards `tower:seals` to the selected target exactly as it forwards a command; it holds no seal state of its own (it may cache the last one for `relay:sync`, the same way it caches the last command). See §11 R12.

---

## 6. Calibration & connection lifecycle

### 6.1 Request-through-Relay

The source asks for connection/calibration **through the Relay** and never implements BLE or calibration itself (Player §7.3.1). Sequence: `source:hello` → `target:request {target}` → (for `tower`) `calibrate:request` → the Relay drives the radio and reports progress via `relay:status`.

### 6.2 Gating the first rotation

**The scenario's first drum rotation is gated on a Relay-reported calibrated tower.** The source emits no `drum.rotate`/`rotationBundle` snapshot until `relay:status.calibrated === true` (Player §7.3.1, §7.16.3). **[UDT]** `calibrated` is `isCalibrated(towerState)` — true iff all three drums report calibrated. For the **emulator** target there is no physical calibration, so the Relay reports `calibrated: true` immediately and the gate passes on the same path.

### 6.3 Status transitions

`relay:status.targetState` walks: `idle → connecting → connected → calibrating → ready`, with `dropped` and `error` reachable from any state. `ready` implies `calibrated` for a `tower` target. (**[Sync]** the prior art's connection states are `connecting | connected | ready | disconnected` and a `fakeTowerState` of `idle | advertising | connected | error`; the set above generalizes those to the target-centric view this protocol needs.) The source reflects these as the pause/connect affordances (Player §7.2.2, §7.3.3) but takes no radio action.

### 6.4 Who owns retry

**The Relay owns connect/calibrate retry; the source surfaces it** (Player §7.3.3, §9.2). On a tower drop the source holds game state and shows a pause/reconnect affordance, relying on the Relay to reconnect, recalibrate, and accept a replay of the last full-state command (§7).

---

## 7. Drop, reconnect & resync

Realizes Player §7.2.4 and §7.15. Two drop classes, handled distinctly:

| Drop | What dropped | Source behavior |
| --- | --- | --- |
| **Network drop** | The source↔Relay WebSocket | Auto-reconnect with backoff; **never abandon the game** (Player §9.2). On reconnect, re-handshake and resync (§7.1). |
| **Target drop** | The Relay↔tower BLE link | Relay emits `relay:paused {reason}`; source holds state and shows pause; Relay owns reconnect/recalibrate, then `relay:resumed` (§6.4). |

### 7.1 The resync exchange (exact contents)

On reconnect, hold game state and resynchronize from the **last full-state command + the local checkpoint** (Player §7.2.4, §7.15.2). The exchange is:

1. Source → `source:hello` (re-handshake, same `protocolVersion`).
2. Relay → `relay:sync { lastCommand }` (**[Sync]** the last full-state command, or `null`).
3. Relay → `relay:status` (current `targetState` / `calibrated`).
4. Source → `tower:command` re-emitting its **own** last full-state snapshot (idempotent, §5.1) to re-establish target state from the source's authoritative view; the source's local checkpoint — engine `EngineState`, Board's versioned save, and the last command — is the game-state authority, **not** the Relay's `lastCommand` (which is only a transport convenience).
5. Relay → `tower:observed { kind: "towerState", ... }` so the engine re-mirrors drum/calibration/skull state (rules-engine §3.4).

Game state is **never** reconstructed from the Relay; the Relay holds none (§1.1). The un-observable physical board (token/skull *positions*) is reconciled with players by the host, not over this wire (Player §7.15.3): only tower-internal state is machine-readable here.

### 7.2 Late-joiner catch-up

**[Sync]** A target connecting mid-session receives `relay:sync` with the last full-state command and reaches the correct visual state immediately, with no dependency on the command history — the direct benefit of full-state idempotency (§5.1). This is the mechanism by which an emulator or a (post-MVP) remote client joins late.

---

## 8. Versioning & compatibility

- **`protocolVersion` (semver), negotiated on connect.** Carried in `source:hello` (§4.1). **[Sync]** the prior art's `PROTOCOL_VERSION` is `'0.1.0'` and is exchanged in the handshake; it defines a custom WebSocket close code `CLOSE_CODE_PROTOCOL_VERSION_MISMATCH = 4000` (on which the peer should **not** auto-reconnect — a hard reload is required).
- **Relation to the other version axes.** The command byte format tracks **UDT @ `meta.pins.udt`** (the `rtdt_pack_state`/`unpack_state` contract); `engineVersion` in the handshake records the source's rules-engine version (rules-engine §8) for the play log and compatibility surfacing — the Relay does not interpret it. These are *independent* of `protocolVersion`: a Relay protocol bump and a UDT pin bump can move on separate axes.
- **Clean failure, never mid-game.** On a `protocolVersion` mismatch the Relay closes with code `4000` **at connect time**; the session never starts. This mirrors the rules-engine's "fail at load, never mid-game" rule (rules-engine §8) and the Player's "fail at load, not mid-game" gate (Player §8, §7.1.2).

> **Corrected at v0.1.1 — hard-fail is the *actual* prior-art behavior, not a tightening.** The v0.1 draft said Sync "only warns and does not forcibly disconnect." Reading the source corrects this: **[Sync]** `relayServer.ts` does `socket.close(CLOSE_CODE_PROTOCOL_VERSION_MISMATCH, …)` on mismatch — it *is* a hard close; only the prose `PROTOCOL.md` lagged. **Resolved at v0.1.2 (rules-engine §8):** the comparison is a **semver-compatibility range**, not the prior art's exact-string equality (`clientVersion !== PROTOCOL_VERSION`). The Relay accepts any source satisfying its range (pre-1.0: same minor, `^0.1`; 1.0+: same major), so patch/compatible-minor bumps don't force lockstep reloads; a truly incompatible version still hard-closes with `4000` at connect. One policy across `schemaVersion`, `meta.pins.*`, `protocolVersion` (§11 R9).

---

## 9. Security / trust posture

- **Local-network, trusted-table assumption (MVP).** The source and Relay are on the same LAN, often with no internet (§2.1; Player §9.4). The MVP is a single shared Player device driving one Relay on a trusted home network.
- **No authentication in MVP.** No source auth, no target ACL, no transport encryption (`ws://`, not `wss://`). A source that can reach the Relay's socket is trusted to drive it. This is acceptable only under the trusted-LAN assumption above and is called out so it is a *decision*, not an oversight.
- **Explicitly out of scope for MVP:** TLS/`wss://`; source authentication or pairing; per-target authorization; multi-source arbitration (who wins when two sources connect); rate-limiting/abuse controls.
- **Inherited platform constraint (source/Relay side, not the Player).** **[Sync]** A tower-impersonating source/Relay cannot register the standard Device Information Service UUID (`0x180A`) in macOS peripheral mode — it fails silently and the companion app disconnects. The recommended deployments are a Raspberry Pi (preferred) or a UART HCI dongle. This lives entirely with the Relay/source platform and **never** touches the Player, which needs only a network link (Player §9.1, §10).

---

## 10. Open questions & grounding caveats

The protocol is grounded on intended design plus the prior **Sync** architecture and UDT v4.1.0 source. The v0.1.1 pass **resolved** several v0.1 questions; what remains is genuinely Relay-dependent. The full implementation checklist is **§11**; the items below are the design decisions still open.

**Resolved at v0.1.1 (moved to confirmed):**
- ~~Exact byte layout of the snapshot.~~ **Resolved [UDT]:** 20-byte packet = type byte (`0x00`) + 19-byte packed `TowerState` (§5.1). (`TOWER_TECH_NOTES.md` referenced by Sync confirms; not needed — the UDT constants are authoritative.)
- ~~Does the Relay expose tower notifications upward at all?~~ **Resolved [UDT]:** the values exist as driver callbacks; only the wire shape is open (now Q1 below).
- ~~Protocol-version enforcement — warn or fail?~~ **Resolved [Sync]:** the prior art hard-closes with `4000` (§8). Open sub-point folded into Q6 (exact-match vs. semver-range).

**Still open (decide at/with the Relay):**
1. **Exact wire shape of `tower:observed`.** The data is confirmed (UDT callbacks); the message envelope/fields for `skullCounter` and `towerState` (the only two observed kinds as of v0.1.2) must be locked against the real Relay (§4.4, §11 R7). In particular, decide whether `towerState` ships decoded JSON or the raw 19 bytes (the source can `rtdt_unpack_state` either way).
2. **Command direction over the existing relay.** Sync's `tower:command` flows **host → clients**; this protocol needs **source → Relay → target**. Confirm the real Relay accepts inbound commands from a source (not only fan-out) — the single largest *direction* change from the prior art (§11 R2).
3. **WebSocket vs. an alternative.** WebSocket + JSON text frames is the **[Sync]** baseline and satisfies LAN/offline. Confirm before depending on WS-specifics (the `4000`/`1008` close codes, text framing).
4. **Tick-timeline placement.** Source-scheduled snapshots (v0.1.1, §5.4 — keeps the Relay dumb) vs. shipping the resolved program to the Relay to play. Reconcile with rules-engine §4.6's "played by the Relay/Display" (the v0.1.1 reading: the *source* schedules, the *Relay* forwards, the *Display target* re-renders at 50 Hz).
5. **Raw-bytes vs. structured command on the wire.** Recommended: the source sends the packed 20-byte array and the Relay writes it verbatim (Relay stays dumb, §5.1). Confirm the Relay does not expect a higher-level `TowerState` to pack itself.
6. **✅ RESOLVED v0.1.2 — Version compatibility policy: semver-range.** Decided in rules-engine §8 as a single policy across all axes: **semver-range satisfaction**, not exact-string match. The Relay accepts any source whose `protocolVersion` satisfies the Relay's compatibility range (pre-1.0: same minor, e.g. `^0.1` ⇒ `>=0.1.0 <0.2.0`; 1.0+: same major). Patch and (pre-1.0) compatible-minor bumps no longer force reloads; a genuinely incompatible version still hard-closes with `4000` at connect. Supersedes Sync's exact-string `clientVersion !== PROTOCOL_VERSION` (§8, R9).
7. **Target enumeration & naming.** `target:request {target}` is net-new (§3.2). Define target listing and naming a specific physical tower when a Relay fronts more than one (post-MVP).
8. **Calibration request semantics.** `calibrate:request` is net-new (Sync calibration was target-local). Confirm the Relay accepts an explicit (re)calibration request and how it reports progress beyond `calibrating`.
9. **Multi-source arbitration.** MVP is one source → Relay → one target. Design for, but don't specify, the Player *and* the official app sourcing at once (§11 R10).
10. **Remote-client fan-out.** Post-MVP. The protocol must not *preclude* the Relay fanning one source out to remote-tower clients (Sync's original purpose); v0.1.1 does not specify the client-facing leg.
11. **Multiplayer view-sharing — explicitly deferred.** Sharing the full game *view* (cards, prompts, board) is **out of scope**: the Relay carries **tower output only**, never the game view (Player §3 Non-Goals, §11.3). Carried so it is not mistaken for an omission.
12. **✅ RESOLVED v0.1.2 — `sealIndicated` / `glyphRevealed` are not observations; seal presence rides a sidecar.** *(Original v0.1.1 finding, kept for traceability:)* the source read found UDT *derives* glyph facing from calibrated drum positions (`getGlyphsFacingDirection`) and *commands* seal breaks (`breakSeal`); neither is a tower notification, yet the rules-engine contract listed both as `observed`. **Decision (rules-engine v0.2 §3.4/§5.4):** glyph facing is engine-**derived** and seal selection is engine-**commanded** — both are engine-owned, not observed. `tower:observed` now carries only `skullCounter` and `towerState` (§4.4). The corollary, confirmed by a `UltimateDarkTowerDisplay` source read (2026-06-25): seal presence is **not in the packed `TowerState`**, so for the emulator target it travels as the **app-level `tower:seals` sidecar** (§5.6, §11 R12), consumed by Display's `applySeals`. No part of this is observed.

---

## 11. Relay implementation requirements (tagged for review)

Because we control every repo, this is the punch-list to run against the **published Relay** — *what* it must provide and *where* that function best lives. Status: **✅ exists** (already in UDT/Sync, the Relay just composes it) · **🔶 net-new** (must be built for this protocol) · **⚠️ verify** (exists but needs confirming/updating at review).

| Tag | The Relay must… | Best location | Status | Review check |
| --- | --- | --- | --- | --- |
| **R1** | Run a **WebSocket server** that accepts a source over the LAN, with the `{type,payload,timestamp}` envelope and the closed vocabulary (§4). | Relay (reuse Sync's `relayServer` / `connectionManager`). | ✅ Sync | Server accepts a *source*, applies the `1008` handshake timeout, sends `relay:sync` + `relay:status` on connect. |
| **R2** | Accept **inbound `tower:command`s from a source** and route them to the selected target — the direction flip from Sync (host→clients ⇒ source→Relay→target). | Relay (router core). | 🔶 net-new | The relay forwards an inbound command to a target; fan-out logic generalized from Sync's broadcast. |
| **R3** | Be a **BLE *central*** that connects to a real tower and **writes the 20-byte packet verbatim** to the UART RX characteristic. | UDT driver (`UltimateDarkTower`) + an injected Node central `BleConnection` (noble), run inside the Relay. | ✅ UDT (driver) / 🔶 (Node central transport) | Relay reuses UDT via `setConnection`; pulls UART/DIS UUIDs + `TOWER_DEVICE_NAME` from UDT constants. (Sync's `electron` pkg already bundles `@stoprocent/noble` + `ultimatedarktower` — but pinned `^2.1.0`; **must move to UDT v4.1.0** ⚠️.) |
| **R4** | Treat the **emulator (Display) as a first-class target** on the same routing path — `target:request {target:"emulator"}` routes to Display. | Relay + Display. | 🔶 net-new | Selecting the emulator needs no BLE; the Relay reports `calibrated:true` immediately (§6.2). |
| **R5** | **Not pack/unpack or hold any game logic.** Packing (`rtdt_pack_state`) lives in the source/shared workspace; the Relay forwards bytes. | Shared workspace (packing) / Relay (I/O only). | 🔶 design rule | Confirm the Relay has no scenario/turn/game state and no packing — "dumb by design" (§1.1). |
| **R6** | Report **target health** as `relay:status` (`idle→connecting→connected→calibrating→ready`, + `dropped`/`error`, and `calibrated`). | Relay, mapping UDT `ConnectionStatus` + connection-monitoring + `isCalibrated`. | ✅ UDT (signals) / 🔶 (mapping) | `calibrated` is `isCalibrated(towerState)`; drop detection reuses UDT connection monitoring → `relay:paused`. |
| **R7** | **Surface the two genuine UDT driver pushes upward** as `tower:observed`: `onSkullDrop`→`skullCounter` and `onTowerStateUpdate`→`towerState`. **Resolved v0.1.2:** glyph facing and seal selection are **engine-owned, not Relay-reported** (glyph derived via `getGlyphsFacingDirection`; seal chosen via `breakSeal`, no sensor), so the Relay reports neither. Persistent seal presence reaches the emulator via the **`tower:seals` sidecar** (R12), not this channel. | Relay (subscribe to UDT callbacks → emit messages). | ✅ UDT (skull/state pushed) / ✅ (glyph/seal resolved — engine-owned) | Only `skullCounter` + `towerState` are emitted as observed; `skullCounter` carries the delta. The Relay does **not** attempt to report glyph facing or seal selection. |
| **R8** | Provide **late-joiner / resync catch-up**: store the last full-state command, send it as `relay:sync` on (re)connect, accept a source re-emit. | Relay. | ✅ Sync (`sync:state`) | `relay:sync` sent even when `lastCommand` is null; resync exchange per §7.1; **source zeroes audio on re-emit** (§5.1). |
| **R9** | **Negotiate `protocolVersion`** on connect via **semver-range** satisfaction (resolved v0.1.2: same minor pre-1.0 / same major 1.0+; not exact-string); hard-close (`4000`) only on genuine incompatibility. | Relay + shared `PROTOCOL_VERSION`. | ✅ Sync (hard-close) / ✅ (range policy resolved, §8/§10 Q6) | Accept any source whose `protocolVersion` satisfies the Relay's range; reserve `4000` for out-of-range. |
| **R10** | **Not preclude** multiple sources or remote-client fan-out, without specifying them for MVP. | Relay (architecture). | 🔶 design rule | Single source → one target works; the data path doesn't bake in single-source assumptions (§10 Q9–Q10). |
| **R11** | Carry the **macOS DIS peripheral limitation** on the Relay/source platform (Pi preferred, or HCI dongle) — note this only bites the *peripheral* (official-app) path; the *central* (Player→tower) path is unaffected. | Relay deployment / docs. | ✅ Sync (documented) | The Player needs only a network link; the constraint never touches it (§9). |
| **R12** | **Forward the `tower:seals` sidecar** (§5.6) to the selected target and cache the last one for `relay:sync`. Seal presence is **not** in the packed `TowerState`, so it travels on its own message; the **emulator** target renders it via `applySeals(SealIdentifier[])`, the **physical tower** ignores it. | Relay (router + last-value cache) · Display (consumer, **already exists**). | 🔶 net-new (Relay forward/cache) / ✅ Display (`TowerRenderView`/`SealManager.applySeals`) | The Relay forwards `tower:seals` like a command, holds no seal logic, and replays the cached set on `relay:sync`. Display already persists `latestBrokenSeals` and re-applies after re-render — verify the **typed** path replaces the example controller's `postMessage(... as any)` glue. |

> **Topology in one line (for the review).** *Player (source) → WebSocket → Relay → { UDT central → BLE tower · Display emulator · (post-MVP) remote clients }*, with `tower:observed` flowing back up from the UDT central's callbacks. This inverts Sync's *peripheral host fanning the official app out to central clients* into a *central Relay driven by a WebSocket source* — same parts (UDT, WebSocket, full-state snapshots), reassembled around the new owner of the radio.

---

*Companion to: Player PRD v0.3 (§2.5, §7.2, §7.3, §7.15, §7.16, §9, §10, §11), Rules-Engine / Shared-Package Contract v0.1 (§3.4, §4.6, §5.2, §5.4), Canonical Scenario Schema v0.3 (`$defs/towerOp`, 11 channels, 50 Hz tick), Node Block Catalog v0.3 (§9 Tower Program). Grounded against `ChessMess/UltimateDarkTowerSync` (prior art; host + shared source read 2026-06-24) and UDT v4.1.0 (`ultimatedarktower@4.1.0`, command constants + driver callbacks source-verified). The standalone Relay repo is unpublished. Supersedes: nothing (new document).*

### Changelog

- **v0.1.2 (2026-06-25)** — **Seal/glyph ownership resolved + seal-state sidecar.** Closes §10 Q12 / §11 R7: glyph facing and seal presence are engine-owned (decided in rules-engine v0.2), so `tower:observed` now carries only `skullCounter` and `towerState` — removed `sealIndicated`/`glyphRevealed` (§4.4, intro). A `UltimateDarkTowerDisplay` source read (2026-06-25) confirmed seal presence is **not** in the 19-byte packed `TowerState`, so it cannot ride `tower:command`; added the **`tower:seals` app-level sidecar** (§5.6) consumed by the emulator target's existing `applySeals(SealIdentifier[])` and ignored by the physical tower, plus **R12**. Corrected the §5.1 idempotency wording (snapshot reproduces lights + drums, not seals) and the §5.5 `seal.break` row. R7 flipped ⚠️→✅. Also resolved **Q6 / R9 (version-compat policy):** adopt **semver-range** satisfaction (same minor pre-1.0 / same major 1.0+), not Sync's exact-string match, so patch/compatible-minor bumps don't force reloads while genuine incompatibility still hard-closes with `4000` (§8) — one policy shared with rules-engine §8.
- **v0.1.1 (2026-06-24)** — Verification pass against repo *source* (Sync host code + UDT v4.1.0 command constants/driver), not just docs. **Resolved:** the 20-byte packet layout (type byte `0x00` + 19-byte packed `TowerState`; §5.1); that the observed values already exist as UDT driver callbacks (§4.4 downgraded from "biggest assumption" to plumbing). **Corrected:** version-mismatch is a real hard-close (`4000`) in Sync's `relayServer`, not a warning (§8); `skullCounter` source is `towerSkullDropCount`/`onSkullDrop`, cumulative and resettable (§4.4); handshake timeout uses close `1008` (§2.3); and **`sealIndicated`/`glyphRevealed` are not hardware pushes** — UDT derives glyph facing from drum positions and commands seal breaks, so only `skullCounter`/`towerState` are genuinely observed (§4.4, §10 Q12 — a finding that reaches back into the rules-engine contract). **Added:** the audio one-shot idempotency caveat — replays must zero audio (§5.1); "source packs, Relay forwards bytes" boundary (§5.1); and **§11, the tagged Relay implementation requirements (R1–R11)** with best-location and review-status columns for the post-publish review. Open questions re-sorted into resolved vs. still-open.
- **v0.1 (2026-06-24)** — Initial draft. Realizes the rules-engine §5 directive/observed seam on the wire as a closed two-direction message vocabulary. Grounds the envelope, full-state idempotent `tower:command`, `sync:state`-style late-joiner catch-up, `host:status`-style health, the `4000` version-mismatch close code, and the macOS DIS peripheral limitation against the prior **Sync** project; pins the command/state shapes to UDT v4.1.0. Adds the upstream `tower:observed` channel, the source-as-first-class-source handshake, the `target:request` abstraction (emulator as first-class target), the calibration gate on `isCalibrated`, the resync exchange, and source-scheduled tick snapshots. Ten open questions carried forward.
