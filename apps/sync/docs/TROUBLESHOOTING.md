# DarkTowerSync Troubleshooting

Common issues and recovery steps during a live game session. DarkTowerSync is the **client**; for host-side
issues (the relay, the tower emulator, BLE permissions, the operator app) see
[UltimateDarkTowerRelay](../../../docs/relay) — its
[docs/SETUP.md](../../../docs/relay/SETUP.md) and
[MACOS_BLE_PERIPHERAL_LIMITATION.md](../../../docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md).

---

## Table of Contents

- ["My tower stopped responding mid-game"](#my-tower-stopped-responding-mid-game)
- ["A player dropped off the relay entirely"](#a-player-dropped-off-the-relay-entirely)
- ["The companion app keeps disconnecting"](#the-companion-app-keeps-disconnecting)
- ["Web Bluetooth not available in my browser"](#web-bluetooth-not-available-in-my-browser)
- [Host-side issues (the relay)](#host-side-issues-the-relay)

---

## "My tower stopped responding mid-game"

1. Check the host dashboard — your row should show the tower icon as disconnected.
2. Let the host know verbally to pause play.
3. Click **Connect to Tower (Bluetooth)** in your browser client.
4. Approve the Bluetooth pairing prompt — your tower will sync to the current state automatically.
5. Tell the host you're back — they resume from where they left off.

---

## "A player dropped off the relay entirely"

1. The host dashboard shows the player's relay status as disconnected.
2. Their browser client is reconnecting automatically (exponential backoff, up to 30 s between attempts).
3. On reconnect their tower will auto-sync to the current state via `sync:state`.
4. If they don't reconnect within ~30 seconds, ask them to refresh the page.

---

## "The companion app keeps disconnecting"

This is a **host-side** concern, but it pauses the game for everyone:

- On the iPhone, go to **Settings → Display & Brightness → Auto-Lock** and set it to **Never** while hosting.
  iOS aggressively suspends backgrounded apps and kills BLE connections.
- Keep the iPhone within BLE range (~10 m / 30 ft) of the machine running the relay host.
- If using **iPhone Mirroring**, keep the mirroring window focused — switching away may cause iOS to
  background the app.

---

## "Web Bluetooth not available in my browser"

Web Bluetooth requires Chrome 70+, Edge 79+, or a specialized browser like Bluefy (iOS). Firefox and Safari do
not support it.

The client page must be served over `https://` or `localhost`. When hosting on a LAN, either:

- Access via `localhost` on the same machine, or
- Use a tunneling tool like `ngrok` that provides an HTTPS URL.

---

## Host-side issues (the relay)

The host runs [UltimateDarkTowerRelay](../../../docs/relay), not this repo. For:

- **the host's tower / companion app disconnecting**, **the "Game Paused" overlay**, the tower emulator
  re-advertising,
- **Bluetooth permission denied on macOS**,
- the **DIS / "checking firmware"** stall,
- the **operator GUI** (Electron app) not launching or being blocked by Gatekeeper,

see the relay's [docs/SETUP.md](../../../docs/relay/SETUP.md) and
[MACOS_BLE_PERIPHERAL_LIMITATION.md](../../../docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md).
