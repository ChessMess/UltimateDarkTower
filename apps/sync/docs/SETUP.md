# DarkTowerSync Setup Guide

DarkTowerSync is the **browser client**. Getting a game running needs two parts: a **relay host**
(run separately — [UltimateDarkTowerRelay](../../../docs/relay)) and this **client**, which each
remote player opens in a browser.

## Prerequisites

- **Node.js 18+** and **npm 7+** — [nodejs.org](https://nodejs.org/) (for developing/serving the client)
- A physical **Return to Dark Tower** game tower (one per player)
- The official **Return to Dark Tower companion app** (iOS or Android) — on the host side
- A **Chrome or Edge** browser (Web Bluetooth) on each player's machine
- A **relay host** reachable on the network — see below

---

## Run the relay host

The host role (BLE tower emulator + WebSocket relay + log server) is **[UltimateDarkTowerRelay](../../../docs/relay)**.
Follow its [docs/SETUP.md](../../../docs/relay/SETUP.md) for per-platform host setup (macOS
real-tower handoff, Raspberry Pi / Windows standalone, Bluetooth permissions, iPhone Mirroring, the DIS
"checking firmware" workaround). In short:

```bash
# in the UltimateDarkTowerRelay checkout
npm install && npm run build
npm start                      # relay listens on ws://0.0.0.0:8765
# or: TOWER_SOURCE=mock npm start   (BLE-free desk test)
# or: npm run start:electron        (operator GUI)
```

Note the host machine's LAN IP — players connect to `ws://<host-ip>:8765`.

---

## Client setup

The client runs in any browser with Web Bluetooth. To develop or self-host it:

### 1. Clone and install

```bash
git clone https://github.com/ChessMess/UltimateDarkTowerSync.git
cd UltimateDarkTowerSync
npm install
```

> The relay client SDK, UltimateDarkTower, and UltimateDarkTowerDisplay are all published to npm, so
> `npm install` resolves everything from the registry — no sibling checkouts required. For working against
> unreleased changes in those packages, see the optional local-development workflow in
> [CONTRIBUTING.md](../CONTRIBUTING.md).

### 2. (Optional) Local UltimateDarkTowerDisplay

If you're developing the [UltimateDarkTowerDisplay](https://github.com/ChessMess/UltimateDarkTowerDisplay)
visualizer (`TowerDisplay`) locally:

```bash
cd ../UltimateDarkTowerDisplay && npm link
cd ../DarkTowerSync && npm link ultimatedarktowerdisplay
```

> Running `npm install` again restores the published `ultimatedarktowerdisplay`; re-run the `npm link` to
> restore the local symlink.

### 3. Run the client

```bash
npm run dev:client
# Opens http://localhost:3000 in your browser
```

Enter the host's WebSocket address (`ws://<host-ip>:8765`) and click **Connect to Tower** to pair via Web
Bluetooth. Add `?observer` to the URL to join as an observer (no tower; visualizer only).

Remote players can also use the hosted build (no install) at
**[https://chessmess.github.io/UltimateDarkTowerSync/](https://chessmess.github.io/UltimateDarkTowerSync/)**.

---

## Browser Requirements (Client)

The client uses the **Web Bluetooth API** to connect to the player's local tower.

| Browser           | Web Bluetooth | Notes                               |
| ----------------- | ------------- | ----------------------------------- |
| Chrome 70+        | ✅ Yes        | Recommended                         |
| Edge 79+          | ✅ Yes        | Chromium-based, works the same      |
| Firefox           | ❌ No         | Web Bluetooth not implemented       |
| Safari            | ❌ No         | Web Bluetooth not implemented       |
| iOS (Bluefy app)  | ✅ Yes        | Third-party browser with BT support |
| Chrome on Android | ✅ Yes        | Works well on Android 10+           |

> **HTTPS required:** Web Bluetooth only works on `https://` or `localhost`. When hosting the client on a LAN,
> use a self-signed cert or a tunneling tool like `ngrok`.

---

## Network Setup

The relay WebSocket server must be reachable by all remote clients.

### Same LAN

The simplest case — all players on the same Wi-Fi network:

1. Find the **relay host** machine's LAN IP: `ifconfig | grep "inet "` (macOS/Linux)
2. Give clients the URL: `ws://192.168.x.x:8765`

### Over the internet

Use a tunneling service:

```bash
# Example with ngrok:
ngrok tcp 8765
# Gives you: tcp://x.tcp.ngrok.io:XXXXX
# Client URL: ws://x.tcp.ngrok.io:XXXXX
```

Or set up port forwarding on the host's router to expose port 8765.

---

## Verifying the Setup

```bash
# Client CI pipeline — lint + type-check + test + build
npm run ci
```

All checks should pass before starting development.
