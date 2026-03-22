# DarkTowerSync Troubleshooting

Common issues and recovery steps during a live game session.

---

## Table of Contents

- ["My tower stopped responding mid-game"](#my-tower-stopped-responding-mid-game)
- ["The host's tower disconnected"](#the-hosts-tower-disconnected)
- ["A player dropped off the relay entirely"](#a-player-dropped-off-the-relay-entirely)
- ["The companion app keeps disconnecting"](#the-companion-app-keeps-disconnecting)
- ["Bluetooth permission denied on macOS"](#bluetooth-permission-denied-on-macos)
- ["Web Bluetooth not available in my browser"](#web-bluetooth-not-available-in-my-browser)
- ["The Electron app quits immediately on launch"](#the-electron-app-quits-immediately-on-launch)

---

## "My tower stopped responding mid-game"

1. Check the host dashboard — your row should show the tower icon as disconnected.
2. Let the host know verbally to pause play.
3. Click **Connect to Tower (Bluetooth)** in your browser client.
4. Approve the Bluetooth pairing prompt — your tower will sync to the current state automatically.
5. Tell the host you're back — they resume from where they left off.

---

## "The host's tower disconnected"

1. All client screens will show a **"Game Paused"** overlay automatically.
2. **Host:** check that the companion app is still open and in the foreground on the iPhone.
3. **Host:** the fake tower re-advertises automatically — re-open the companion app and connect to the tower as normal.
4. Once reconnected, the companion app re-establishes state; the overlay clears and the host can resume.

---

## "A player dropped off the relay entirely"

1. The host dashboard shows the player's relay status as disconnected.
2. Their browser client is reconnecting automatically (exponential backoff, up to 30 s between attempts).
3. On reconnect their tower will auto-sync to the current state via `sync:state`.
4. If they don't reconnect within ~30 seconds, ask them to refresh the page.

---

## "The companion app keeps disconnecting"

- On the iPhone, go to **Settings → Display & Brightness → Auto-Lock** and set it to **Never** while hosting. iOS aggressively suspends backgrounded apps and kills BLE connections.
- Keep the iPhone within BLE range (~10 m / 30 ft) of the Mac running the host.
- If using **iPhone Mirroring**, keep the mirroring window focused — switching away may cause iOS to background the app.

---

## "Bluetooth permission denied on macOS"

1. Go to **System Settings → Privacy & Security → Bluetooth**.
2. Add your terminal app (Terminal, iTerm2, VS Code, etc.) to the allowed list.
3. If running the Electron app, add **DarkTowerSync** (or **Electron** during development).
4. Restart the host after granting permission.

---

## "Web Bluetooth not available in my browser"

Web Bluetooth requires Chrome 70+, Edge 79+, or a specialized browser like Bluefy (iOS). Firefox and Safari do not support it.

The client page must be served over `https://` or `localhost`. When hosting on a LAN, either:
- Access via `localhost` on the same machine, or
- Use a tunneling tool like `ngrok` that provides an HTTPS URL.

---

## "The Electron app quits immediately on launch"

1. Check the startup log for errors:
   ```
   cat ~/Library/Application\ Support/@dark-tower-sync/electron/startup.log
   ```
   If that file doesn't exist, check the fallback location:
   ```
   cat /tmp/DarkTowerSync/startup.log
   ```
2. You can also run the app from Terminal to see console output:
   ```
   /Applications/DarkTowerSync.app/Contents/MacOS/dark-tower-sync
   ```
3. Common causes:
   - **Native module ABI mismatch** — the app was built with a different Node.js version than Electron expects. Rebuild with `electron-rebuild` or use a locally-built DMG.
   - **`ELECTRON_RUN_AS_NODE=1` set in environment** — this makes Electron run as plain Node.js (no window, silent exit). Unset it: `env -u ELECTRON_RUN_AS_NODE /Applications/DarkTowerSync.app/Contents/MacOS/dark-tower-sync`
   - **macOS code signing** — unsigned apps may be blocked by Gatekeeper. Right-click the app and choose "Open" to bypass for the first launch.
