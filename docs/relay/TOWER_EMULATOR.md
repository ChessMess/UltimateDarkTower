# TowerEmulator — return-traffic & echo timing

*Docs: [Index](README.md) > Protocol-level developer > TowerEmulator*

`TowerEmulator` (`packages/core/src/towerEmulator.ts`) is the BLE peripheral the official *Return to Dark Tower*
companion app connects to instead of a real tower. Decoding the app's commands and fanning them out is only
half the job — the relay must also **send back the tower→app return traffic** a real tower would, or the
companion app's state machine stalls. This doc captures the **echo-response behavior** (the "why" behind the
code); for the raw 20-byte packet layout itself see the UltimateDarkTower library's
[TOWER_TECH_NOTES.md](../../UltimateDarkTower/docs/TOWER_TECH_NOTES.md). For the macOS DIS / "checking firmware"
limitation and ghost-connection handling, see [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md).

> The synthesis of *player-action* responses (skull drops, calibration-complete) is a separate concern handled
> by `NotificationSynthesizer` — see [ARCHITECTURE.md](ARCHITECTURE.md#notification-synthesis). This doc is
> only about the per-command **echo** every write must produce.

---

## The three echo rules

The real tower sends a state notification (on the UART notify characteristic) after **every** command write.
`TowerEmulator` replicates this in the command characteristic's `onWriteRequest` handler. Three rules govern the
echo:

### 1. Always echo

Without a response the companion app has no flow control and fires rapid command pairs within ~1ms. Every
write must produce a notification back. (`TowerEmulator` only echoes once a notify subscription exists —
`_txUpdateValue` is set in `onSubscribe`; the real tower also sends an initial heartbeat immediately on
subscribe.)

### 2. Clear the transient fields (bytes 15 and 19)

The real tower always returns **byte 15 (audio)** and **byte 19 (LED sequence override)** as `0` in its
response, regardless of what was written. These are "fire-and-forget": the tower executes the sound/animation,
then reports them as complete. If the echo preserves non-zero values, the companion app reads the response as
"still animating" and falls back to an **18-second hardcoded timeout** before sending the next command.

`TowerEmulator` builds the echo by copying the command bytes and then:

```
response[0]  = TOWER_STATE_NOTIFICATION_TYPE   // 0x00 — a state notification
response[15] = 0                               // clear audio (sample + loop)
response[19] = 0                               // clear LED override — animation complete
```

### 3. Delay the echo for animations (byte 19 ≠ 0)

When the command triggers a visual animation (byte 19, LED override, is non-zero), the real tower delays its
response until the animation finishes. `TowerEmulator` mirrors this with `ANIMATION_ECHO_DELAY_MS` (**1600 ms**,
measured visually from the `sealReveal` animation, ~1.5–2 s):

```
hasAnimation = data[19] !== 0
hasAnimation ? setTimeout(send, ANIMATION_ECHO_DELAY_MS)   // animated: wait for the animation
             : setImmediate(send)                          // otherwise: echo on the next tick
```

Without the delay the companion app sends the follow-up command within ~60ms, **interrupting the animation**
on the participant's physical tower (mirrored via `PhysicalTowerReplay`).

---

## Why the timing matters: command-flow patterns

Not every command waits for the echo — the companion app uses three different pacing patterns, so the echo
timing matters most for the first:

| Pattern        | Example command                | App behavior                                            | Echo-timing impact                                              |
| -------------- | ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------- |
| Wait-for-echo  | `sealReveal` (`0x0e`)          | App blocks until the response arrives, then sends seal LED positions | **Critical** — too fast interrupts the animation; too slow shows a visible pause |
| Internal timer | `rotationAllDrums` (`0x0f`)    | App uses its own 8–13s timer regardless of the echo     | Low — the echo arrives during the timer window                 |
| Rapid pair     | `flareThenFadeBase` (`0x03`)   | Two commands sent 1–31ms apart without waiting          | None — the echo is ignored for pacing                          |

See [TOWER_TECH_NOTES.md — Tower Response Behavior](../../UltimateDarkTower/docs/TOWER_TECH_NOTES.md#tower-response-behavior)
for the authoritative reference on transient fields, animation timing, and response types.

---

## Related behavior

- **Ghost connections (macOS).** macOS CoreBluetooth has no peripheral-initiated disconnect API, so a
  Stop/Start cycle can leave the companion's BLE link alive while `TowerEmulator` thinks it is only advertising.
  `onWriteRequest` detects this — a write arriving in `advertising` state promotes the state machine to
  `connected` and emits `ghost-connection` + `companion-connected` (a write can only arrive on an active
  link). See [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md).
- **Device Information Service.** The app gates on the DIS firmware revision before it will exchange commands;
  macOS cannot expose the DIS. The tower emulator advertises the DIS on non-macOS hosts (`deviceInfo.ts`). Same
  doc as above.
- **Configurable identity.** DIS values are per-instance (`new TowerEmulator({ deviceInfo })` / `TOWER_DIS_*`
  env). The echo constants (`ANIMATION_ECHO_DELAY_MS`) are capture-pending tuning values — validate against a
  real tower capture when one is available.

---

**See also:** [PROTOCOL.md](PROTOCOL.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md) ·
[TOWER_TECH_NOTES.md](../../UltimateDarkTower/docs/TOWER_TECH_NOTES.md)
