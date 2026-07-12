# PRD-06 — Online Multiplayer _(future — stub)_

> **Status: future / not MVP.** Captured so the MVP architecture stays compatible. Flesh out before
> implementation. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

Let multiple remote players share one game: each controls their hero(s) while everyone sees a
synchronized tower, board, and the relevant player boards. The MVP's state-source seam is designed so
this becomes "another kind of state source" rather than a rewrite.

## 2. Goals

- A shared session multiple clients can join, with synchronized tower + board state.
- Per-player ownership of hero player boards, with appropriate visibility of others'.
- Reuse the `TowerStateSource`/`BoardStateSource` seam: a `NetworkSource` syncs over a server.

## 3. Functional Requirements (draft)

1. **FR-06.1** A player MUST be able to host/create a session and others MUST be able to join it.
2. **FR-06.2** Tower and board state MUST stay synchronized across all clients (full-state, idempotent
   updates — the same property UDT Sync relies on — make this robust to drops and late joiners).
3. **FR-06.3** Each player MUST own their hero player board(s); the app MUST define visibility/edit
   rules for others' boards and for trading.
4. **FR-06.4** Sync MUST flow through a `NetworkSource` implementing the state-source interfaces, so
   feature UIs are unchanged.
5. **FR-06.5** The design MUST coexist with PRD-05: the official app can still be the brain while
   multiple remote clients observe/participate.

## 4. Non-Goals

- Matchmaking, accounts, or persistence beyond what a session needs (initially).
- Anti-cheat / authority arbitration beyond a simple host-authoritative model.

## 5. Open Questions

- Transport/topology: host-authoritative WebSocket relay (like UDT Sync) vs. a dedicated server vs.
  peer-to-peer.
- Conflict handling for simultaneous edits to shared board state.
- Relationship to PRD-05: is the official-app host also the multiplayer host, or separate roles?
