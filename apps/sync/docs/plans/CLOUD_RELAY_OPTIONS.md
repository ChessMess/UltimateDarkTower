# Cloud Relay Options for Remote Play

This document compares approaches for making the DarkTowerSync relay accessible over the internet, so remote players can connect without requiring port forwarding on the host machine.

Date: 2026-03-21

---

## Table of Contents

- [Cloud Relay Options for Remote Play](#cloud-relay-options-for-remote-play)
  - [Table of Contents](#table-of-contents)
  - [Traffic Reality Check](#traffic-reality-check)
  - [Option 1 — Cloudflare Tunnel (`cloudflared`)](#option-1--cloudflare-tunnel-cloudflared)
  - [Option 2 — ngrok](#option-2--ngrok)
  - [Option 3 — Fly.io Self-Hosted Relay Proxy](#option-3--flyio-self-hosted-relay-proxy)
  - [Option 4 — Render](#option-4--render)
  - [Option 5 — AWS (Three Variants)](#option-5--aws-three-variants)
    - [5a. AWS API Gateway WebSocket + Lambda](#5a-aws-api-gateway-websocket--lambda)
    - [5b. AWS EC2 t3.micro](#5b-aws-ec2-t3micro)
    - [5c. AWS App Runner / Fargate](#5c-aws-app-runner--fargate)
  - [Option 6 — Ably / Pusher Managed Pub/Sub](#option-6--ably--pusher-managed-pubsub)
  - [Option 7 — Open Source Self-Hosted Tunnels](#option-7--open-source-self-hosted-tunnels)
  - [Option 8 — Open Source WebSocket Brokers (Self-Hosted)](#option-8--open-source-websocket-brokers-self-hosted)
  - [Summary Matrix](#summary-matrix)
  - [Recommendation](#recommendation)

---

## Traffic Reality Check

DarkTowerSync generates extremely low-volume traffic:

- ~12 keepalive messages/min (20s ping/pong + 5s `host:status` per client)
- Tower commands: event-driven, approximately 10–60 per minute during active gameplay
- 20-byte payloads per command
- 2–8 concurrent connections maximum (host + a handful of remote players)

This fits comfortably inside virtually every free tier. Cost is essentially not a differentiator — **complexity and code-change surface area** are the real criteria when choosing between options.

---

## Option 1 — Cloudflare Tunnel (`cloudflared`)

**What it is:** An outbound tunnel from the host machine to Cloudflare's edge network. No port forwarding, no firewall changes required. Cloudflare gives you a public WSS endpoint that proxies traffic to the local relay.

| Attribute                 | Detail                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Cost**                  | Free; no account required for quick tunnels                                                                                  |
| **Connections**           | No documented limit                                                                                                          |
| **WebSocket support**     | Full native support — transparent proxy                                                                                      |
| **Code changes required** | **None** — players just enter the new WSS URL in the client UI                                                               |
| **URL stability**         | Random subdomain changes on restart (quick tunnel); stable with a named tunnel (still free, requires account)                |
| **Latency overhead**      | +10–50 ms (Anycast routing, regionally optimized)                                                                            |
| **Open source**           | `cloudflared` client is Apache 2.0 licensed ([github.com/cloudflare/cloudflared](https://github.com/cloudflare/cloudflared)) |
| **Reliability**           | Cloudflare global network — extremely high                                                                                   |
| **Host must be online**   | Yes — host machine runs `cloudflared`                                                                                        |

**How it works:**

```bash
cloudflared tunnel --url ws://localhost:8765
```

The command prints a public URL like `wss://xxx.trycloudflare.com`. Players paste that URL into the client UI. For a stable subdomain (e.g., `wss://darktowersync.cfargotunnel.com`), create a named tunnel with a free Cloudflare account.

**Verdict:** Best option for zero code changes and zero cost. Ideal for casual and development use. Can be running in under 15 minutes.

---

## Option 2 — ngrok

| Attribute                 | Detail                                                        |
| ------------------------- | ------------------------------------------------------------- |
| **Cost**                  | Free tier: 1 static domain, 1 active agent                    |
| **Connections**           | Not hard-limited; rate limits apply (verify current limits)   |
| **WebSocket support**     | Supported                                                     |
| **Code changes required** | None                                                          |
| **URL stability**         | Free tier includes 1 static domain (verify — changed in 2024) |
| **Latency overhead**      | +20–80 ms                                                     |
| **Open source**           | Client partially open source; service is proprietary          |
| **Potential issue**       | Rate limits could matter during rapid command sequences       |

**Verdict:** Viable, but Cloudflare Tunnel is strictly better: larger network, no rate limits, fully open source client. ngrok has strong brand recognition but no advantage for this use case.

---

## Option 3 — Fly.io Self-Hosted Relay Proxy

**What it is:** Deploy a small Node.js WebSocket broker to Fly.io's cloud infrastructure. The host connects _outbound_ to the cloud broker (role: publisher). Remote players also connect to the cloud broker (role: subscribers). This removes the dependency on the host machine being internet-reachable entirely.

| Attribute                           | Detail                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Cost**                            | Free allowance includes 3 shared VMs (256 MB RAM) + 3 GB outbound/mo — **verify current free tier** (restructured in 2024–2025) |
| **Connections**                     | No practical limit at this traffic scale                                                                                        |
| **WebSocket support**               | Full support                                                                                                                    |
| **Code changes required**           | Moderate — host becomes a WS client (outbound connection), relay logic moves to cloud service                                   |
| **URL stability**                   | Stable `*.fly.dev` subdomain, always-on                                                                                         |
| **Latency overhead**                | ~20–60 ms (regional deployment available)                                                                                       |
| **Open source**                     | You write the relay; existing `RelayServer` code in `packages/host/src/relayServer.ts` is the starting point                    |
| **Host must be internet-reachable** | **No** — host dials out from behind any NAT/firewall                                                                            |

**Architecture shift:** The current `RelayServer` (hub, server role) moves to Fly.io. The host process gains a second outbound WebSocket connection alongside its local one. Remote players connect to the Fly.io URL instead of directly to the host.

**Key caveat:** Fly.io requires a credit card to create an account even for free resources. Verify that the free tier still includes always-on compute before building against it.

**Verdict:** Best option if you want cloud-hosted relay with no proprietary dependencies and no host machine exposure. Moderate refactoring effort.

---

## Option 4 — Render

| Attribute             | Detail                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cost**              | Free tier available                                                                                                                                        |
| **WebSocket support** | Supported                                                                                                                                                  |
| **Fatal flaw**        | Free tier services **sleep after 15 minutes of inactivity** — cold start takes 30–60 seconds. The first player connecting after inactivity would time out. |
| **Paid tier**         | $7/mo for always-on                                                                                                                                        |

**Verdict:** Free tier is unusable for a relay due to sleep behavior. The paid tier is fine but Fly.io is comparable at the same price point. Skip unless you are already on Render for other services.

---

## Option 5 — AWS (Three Variants)

### 5a. AWS API Gateway WebSocket + Lambda

| Attribute                 | Detail                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cost**                  | Free tier (12 months): 1M connection-minutes + 1M messages/mo. After: ~$0.01/month at this traffic volume                                   |
| **Connections**           | 10,000 concurrent default (soft limit, adjustable)                                                                                          |
| **WebSocket support**     | Yes — native API Gateway WebSocket API                                                                                                      |
| **Code changes required** | **High** — Lambda functions for `$connect`, `$disconnect`, `$default` routes; DynamoDB or ElastiCache to store connection IDs for broadcast |
| **Complexity**            | Significant infrastructure: API Gateway + Lambda + DynamoDB + IAM                                                                           |
| **Latency overhead**      | +20–100 ms (Lambda cold start on first connection)                                                                                          |
| **Open source**           | No — fully managed AWS                                                                                                                      |

The architecture mismatch is real: API Gateway WebSocket routes each message to a stateless Lambda function. Broadcasting to all clients requires storing all `connectionId` values in DynamoDB, then calling the API Gateway Management API to push to each one. This is approximately 200 lines of Lambda code plus IAM policy setup.

**Verdict:** Works, but significant complexity for near-zero actual cost benefit. Overkill unless you are already deeply invested in the AWS ecosystem.

### 5b. AWS EC2 t3.micro

| Attribute                           | Detail                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| **Cost**                            | Free for 12 months (750 hrs/mo). After free tier: ~$7.50–$8.50/mo (us-east-1) |
| **Code changes required**           | Moderate — host becomes an outbound WS client; deploy `RelayServer` to EC2    |
| **WebSocket support**               | Full support (your own Node.js server)                                        |
| **Complexity**                      | Medium — EC2 setup, security groups, Node.js deployment                       |
| **Open source**                     | You run your own code                                                         |
| **Host must be internet-reachable** | No — host dials out                                                           |

**Verdict:** A sensible long-term option if you want cloud-hosted relay with no proprietary dependencies. Free for a year, then the cheapest always-on VPS-class option in AWS.

### 5c. AWS App Runner / Fargate

More expensive than EC2, no free tier advantage for this use case. Not recommended.

---

## Option 6 — Ably / Pusher Managed Pub/Sub

|                           | **Ably**                                                          | **Pusher Channels**                           |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| **Free tier**             | 200 concurrent connections, 6M messages/mo                        | 100 concurrent connections, 200k messages/day |
| **Code changes required** | **High** — replace raw WebSocket with Ably SDK on host and client | Same                                          |
| **WebSocket support**     | Uses their own protocol, not raw WS                               | Same                                          |
| **Latency**               | Low (~20 ms)                                                      | Low                                           |
| **Cost after free tier**  | $25–35/mo for next tier                                           | $50/mo                                        |
| **Open source**           | No — vendor SDK lock-in                                           | No                                            |

Free tier limits are vastly more than sufficient technically for this game. However, both services require replacing the clean native-WebSocket architecture with a vendor SDK on both the host and client. This is a meaningful coupling tradeoff.

**Verdict:** Not recommended when simpler options with no vendor lock-in exist.

---

## Option 7 — Open Source Self-Hosted Tunnels

These require a small VPS (~$4–6/mo on Hetzner, DigitalOcean, or Vultr), but are free if you already have a server. Like Cloudflare Tunnel and ngrok, they require zero code changes — they tunnel the existing WebSocket port transparently.

| Tool        | Language | GitHub Stars | Notes                                                                                                              |
| ----------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **chisel**  | Go       | ~13k         | [jpillora/chisel](https://github.com/jpillora/chisel) — WS-based TCP tunnel; server on VPS, client on host machine |
| **frp**     | Go       | ~90k         | [fatedier/frp](https://github.com/fatedier/frp) — More feature-rich; TCP/UDP/HTTP tunneling                        |
| **rathole** | Rust     | ~9k          | [rapiz1/rathole](https://github.com/rapiz1/rathole) — High performance, minimal resource use                       |
| **bore**    | Rust     | ~5k          | [ekzhang/bore](https://github.com/ekzhang/bore) — Minimal and simple; good for prototyping                         |

All are MIT or Apache 2.0 licensed. Zero code changes required to the relay.

**Verdict:** Best option if you have or want a cheap VPS for other reasons. As a standalone solution for this project, Cloudflare Tunnel is free and requires no VPS to maintain.

---

## Option 8 — Open Source WebSocket Brokers (Self-Hosted)

If you want the cloud broker pattern (host dials out, no host exposure) with open source tooling:

| Tool                        | Language   | Free hosting     | Notes                                                                                                                                            |
| --------------------------- | ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Soketi**                  | Node.js    | Fly.io free tier | [soketi/soketi](https://github.com/soketi/soketi) — Pusher-compatible protocol; would require SDK changes on both ends                           |
| **Centrifugo**              | Go         | Fly.io free tier | [centrifugal/centrifugo](https://github.com/centrifugal/centrifugo) — Full-featured, JWT auth, pub/sub channels — solid but significant overkill |
| **Custom relay (50 lines)** | TypeScript | Fly.io free tier | Deploy existing `RelayServer` logic to cloud with small outbound-client modification; cleanest architecture fit                                  |

---

## Summary Matrix

| Option                              | Free?                | Code Changes | Complexity | Host Exposure Removed | Notes                                  |
| ----------------------------------- | -------------------- | ------------ | ---------- | --------------------- | -------------------------------------- |
| **Cloudflare Tunnel**               | Always free          | None         | Trivial    | No (outbound tunnel)  | **Best overall for free**              |
| **ngrok**                           | Free tier            | None         | Trivial    | No (outbound tunnel)  | Rate limit risk; verify limits         |
| **Open source tunnel** (chisel/frp) | Free (need VPS)      | None         | Low        | No (outbound tunnel)  | Best if you already have a VPS         |
| **Fly.io + custom relay**           | Likely free (verify) | Moderate     | Medium     | **Yes**               | Best cloud-hosted relay option         |
| **AWS EC2 t3.micro**                | 12 months free       | Moderate     | Medium     | **Yes**               | After free tier: ~$8/mo                |
| **AWS API GW + Lambda**             | Effectively free     | High         | High       | **Yes**               | Infrastructure complexity not worth it |
| **Ably**                            | Free tier            | High (SDK)   | Medium     | **Yes**               | Vendor lock-in                         |
| **Pusher**                          | Free tier (smaller)  | High (SDK)   | Medium     | **Yes**               | Vendor lock-in                         |
| **Render**                          | Unusable free tier   | Moderate     | Medium     | **Yes**               | Sleep behavior breaks relay            |
| **Railway**                         | No free tier         | Moderate     | Medium     | **Yes**               | Credits only                           |

---

## Recommendation

**For free deployment with minimal work:**

1. **Start with Cloudflare Tunnel** — zero code changes, zero cost, zero maintenance. Players manually enter the `wss://` URL in the existing client UI input. Use a named tunnel (free Cloudflare account) for a stable subdomain that survives host restarts. This can be running in under 15 minutes with no code changes to this repository.

2. **If you want the host to work from behind any NAT/firewall without any exposed port:** Fly.io + a small cloud relay proxy. The host gains a second outbound WebSocket connection; the existing `RelayServer` code in `packages/host/src/relayServer.ts` becomes the cloud service. Verify Fly.io free tier includes always-on compute before committing to this approach.

3. **If you want zero vendor dependency long-term and already have a server:** `chisel` or `frp` on a cheap VPS — same zero-code-change benefit as Cloudflare Tunnel, on infrastructure you fully control.

> **Note:** Fly.io and ngrok pricing changed in 2024–2025. Confirm current free tier limits at their respective pricing pages before designing around them.
