# DarkTowerSync Setup Guide

Platform-specific instructions for getting the host and client running.

## Prerequisites (all platforms)

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm 7+** — included with Node.js 18
- A physical **Return to Dark Tower** game tower
- The official **Return to Dark Tower companion app** (iOS or Android)
- A second device running the companion app is the host; remote players need a compatible browser

---

## macOS (Primary Platform)

macOS is the primary development and deployment target for the host.

### 1. Install dependencies

```bash
brew install node
```

### 2. Clone and install

```bash
git clone https://github.com/ChessMess/DarkTowerSync.git
cd DarkTowerSync
npm install
```

### 3. Bluetooth permissions

macOS requires explicit Bluetooth permission for Node.js processes:

1. Go to **System Settings → Privacy & Security → Bluetooth**.
2. Add **Terminal** (or your terminal app) to the allowed list.
3. If using a script runner or IDE, add that app as well.

> **Note:** On Apple Silicon Macs the built-in Bluetooth controller supports peripheral mode.
> On Intel Macs you may need a USB BLE dongle that supports peripheral mode.

### 4. Running the companion app via iPhone Mirroring

The simplest setup is to run the official iOS companion app on an iPhone and mirror it to the host Mac using **iPhone Mirroring** (macOS Sequoia 15+):

1. Connect your iPhone via USB or ensure it is on the same Wi-Fi as your Mac.
2. Open **iPhone Mirroring** on your Mac.
3. Launch the **Return to Dark Tower** app on your iPhone.
4. Start the DarkTowerSync host — the companion app will see the fake tower.

### 5. Start the host

```bash
npm run dev:host
```

The relay server listens on `ws://0.0.0.0:8765` by default.
Set the `RELAY_PORT` environment variable to use a different port.

### 6. Open the client

```bash
npm run dev:client
# Opens http://localhost:3000 in your browser
```

---

## Linux

Linux is supported but requires manual BlueZ configuration.

### 1. Install BlueZ and Node.js

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Grant Bluetooth permissions

Node.js needs raw socket access for BLE peripheral mode:

```bash
sudo setcap cap_net_raw,cap_net_admin+eip $(which node)
```

Or run the host with `sudo` during development (not recommended for production).

### 3. Running the companion app on Linux

Use **Android** with **Phone Link** (if available), or an Android emulator.
Alternatively, use an iOS device and AirPlay/screen-mirroring tools.

### 4. Start the host and client

```bash
npm install
npm run dev:host   # Terminal 1
npm run dev:client # Terminal 2
```

---

## Windows (Stretch Goal)

> Windows support is a stretch goal. The core blocker is BLE peripheral mode:
> the Windows built-in Bluetooth stack does not expose peripheral-mode APIs
> accessible to Node.js.

### Workaround: external BLE dongle

A USB BLE dongle with peripheral-mode support (e.g., a dongle compatible with
`@stoprocent/bleno` on Windows) may work. Contributions and testing reports welcome.

### Running the companion app on Windows

Use **Phone Link** (Windows 11) to mirror and interact with the Android companion app.

### Client only (no host on Windows)

If another machine runs the host, the Windows browser client works fine —
Web Bluetooth is supported in Chrome and Edge on Windows.

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

> **HTTPS required:** Web Bluetooth only works on `https://` or `localhost`.
> When hosting the client on a LAN, use a self-signed cert or a tunneling tool like `ngrok`.

---

## Network Setup

The relay WebSocket server must be reachable by all remote clients.

### Same LAN

The simplest case — all players on the same Wi-Fi network:

1. Find the host machine's LAN IP: `ifconfig | grep "inet "` (macOS/Linux)
2. Give clients the URL: `ws://192.168.x.x:8765`

### Over the internet

Use a tunneling service:

```bash
# Example with ngrok:
ngrok tcp 8765
# Gives you: tcp://x.tcp.ngrok.io:XXXXX
# Client URL: ws://x.tcp.ngrok.io:XXXXX
```

Or set up port forwarding on your router to expose port 8765.

---

## Verifying the Setup

```bash
# Full CI pipeline — lint + type-check + test + build
npm run ci
```

All checks should pass before starting development.
