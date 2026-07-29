/**
 * BridgeTowerSource — the official-app bridge (PRD-05).
 *
 * Drives the source against a mock WebSocket (the reason `RelayClient` takes a
 * `webSocketImpl`), so these tests need no relay host and no BLE.
 */
import { describe, expect, it } from 'vitest';
import {
  createDefaultTowerState,
  rtdt_pack_state,
  STATE_DATA_LENGTH,
  type TowerState,
} from 'ultimatedarktower';
import {
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeTowerCommandMessage,
  makeRelayPausedMessage,
} from 'ultimatedarktowerrelay-shared';
import type { WebSocketConstructor } from 'ultimatedarktowerrelay-client';
import { TOWER_LIGHT_SEQUENCES } from '@/lib/udtData';
import { BridgeTowerSource } from './BridgeTowerSource';
import { ManualTowerSource } from './ManualTowerSource';

// ─── Mock WebSocket (mirrors packages/relay-client/src/relayClient.test.ts) ───

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static reset(): void {
    MockWebSocket.instances = [];
  }

  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, ((ev: unknown) => void)[]> = {};

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = ''): void {
    this.readyState = 3;
    this.emit('close', { code, reason });
  }

  addEventListener(type: string, cb: (ev: unknown) => void): void {
    (this.listeners[type] ??= []).push(cb);
  }

  private emit(type: string, ev?: unknown): void {
    for (const cb of this.listeners[type] ?? []) cb(ev);
  }

  open(): void {
    this.readyState = 1;
    this.emit('open');
  }

  /**
   * A socket that fails before opening. `RelayClient` ignores a pre-open close
   * and acts only on 'error', which is also the order Chrome reports when its
   * Local Network Access prompt aborts the request: error, then close 1006.
   */
  failBeforeOpen(): void {
    this.emit('error', {});
    this.close(1006, '');
  }

  message(obj: unknown): void {
    this.emit('message', { data: JSON.stringify(obj) });
  }

  get sentTypes(): string[] {
    return this.sent.map((s) => (JSON.parse(s) as { type: string }).type);
  }
}

const MockCtor = MockWebSocket as unknown as WebSocketConstructor;

/** Pack a TowerState into the 20-byte command the relay broadcasts (1 header byte + 19 state). */
function commandFor(state: TowerState): number[] {
  const data = new Uint8Array(STATE_DATA_LENGTH);
  rtdt_pack_state(data, STATE_DATA_LENGTH, state);
  return [0, ...data];
}

async function connectedBridge(): Promise<{ bridge: BridgeTowerSource; socket: MockWebSocket }> {
  MockWebSocket.reset();
  const bridge = new BridgeTowerSource(new ManualTowerSource(), { webSocketImpl: MockCtor });
  const p = bridge.connect('ws://test');
  const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  socket.open();
  await p;
  return { bridge, socket };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('BridgeTowerSource — disconnected', () => {
  it('behaves exactly like the manual source', () => {
    const bridge = new BridgeTowerSource(new ManualTowerSource(), { webSocketImpl: MockCtor });
    expect(bridge.status.state).toBe('disconnected');

    bridge.dropSkull();
    bridge.dropSkull();
    expect(bridge.getSkullDropCount()).toBe(2);

    bridge.rotateDrum(1, 3);
    expect(bridge.getState().drum[1].position).toBe(3);

    bridge.breakSeal({ level: 'top', side: 'north' });
    expect(bridge.getBrokenSeals()).toHaveLength(1);
  });
});

describe('BridgeTowerSource — connected', () => {
  it('adopts app-driven tower state and notifies subscribers', async () => {
    const { bridge, socket } = await connectedBridge();
    expect(bridge.status.state).toBe('connected');

    const seen: number[] = [];
    bridge.subscribe((s) => seen.push(s.drum[2].position));

    const state = createDefaultTowerState();
    state.drum[2].position = 3;
    socket.message(makeTowerCommandMessage(commandFor(state)));

    expect(bridge.getState().drum[2].position).toBe(3);
    expect(seen).toEqual([0, 3]); // initial emit + the remote update
  });

  it('sends a client action on drop skull and counts it locally', async () => {
    const { bridge, socket } = await connectedBridge();
    bridge.dropSkull();

    expect(socket.sentTypes).toEqual(['client:hello', 'client:action']);
    expect(bridge.getSkullDropCount()).toBe(1);
  });

  it("does not let the app's beam count clobber the local skull count", async () => {
    const { bridge, socket } = await connectedBridge();
    bridge.dropSkull();
    bridge.dropSkull();
    expect(bridge.getSkullDropCount()).toBe(2);

    // The app writes its own beam count in every command (bytes 15-16).
    const state = createDefaultTowerState();
    state.beam.count = 97;
    socket.message(makeTowerCommandMessage(commandFor(state)));

    expect(bridge.getSkullDropCount()).toBe(2);
  });

  it('carries broken seals across a remote state update', async () => {
    const { bridge, socket } = await connectedBridge();
    bridge.breakSeal({ level: 'bottom', side: 'west' });

    socket.message(makeTowerCommandMessage(commandFor(createDefaultTowerState())));

    expect(bridge.getBrokenSeals()).toEqual([{ level: 'bottom', side: 'west' }]);
  });

  it('auto-breaks the seal the app reveals, once', async () => {
    const { bridge, socket } = await connectedBridge();

    const reveal = createDefaultTowerState();
    reveal.led_sequence = TOWER_LIGHT_SEQUENCES.sealReveal;
    reveal.layer[0].light[1].effect = 1; // top ring, east
    socket.message(makeTowerCommandMessage(commandFor(reveal)));
    socket.message(makeTowerCommandMessage(commandFor(reveal)));

    expect(bridge.getBrokenSeals()).toEqual([{ level: 'top', side: 'east' }]);
  });

  it('ignores local drum rotation — the app owns the drums', async () => {
    const { bridge, socket } = await connectedBridge();

    const state = createDefaultTowerState();
    state.drum[0].position = 2;
    socket.message(makeTowerCommandMessage(commandFor(state)));

    bridge.rotateDrum(0, 1);
    expect(bridge.getState().drum[0].position).toBe(2);
  });

  it('reports a paused relay', async () => {
    const { bridge, socket } = await connectedBridge();
    socket.message(makeRelayPausedMessage('Companion app disconnected'));

    expect(bridge.status).toEqual({ state: 'paused', detail: 'Companion app disconnected' });
  });

  it('surfaces a protocol-version mismatch as terminal, not a plain disconnect', async () => {
    const { bridge, socket } = await connectedBridge();
    socket.close(CLOSE_CODE_PROTOCOL_VERSION_MISMATCH, 'server 9.9.9, client 0.2.0');

    expect(bridge.status.state).toBe('version-mismatch');
  });

  it('falls back to the manual source after disconnect', async () => {
    const { bridge } = await connectedBridge();
    bridge.dropSkull();
    bridge.disconnect();

    expect(bridge.status.state).toBe('disconnected');
    bridge.dropSkull();
    expect(bridge.getSkullDropCount()).toBe(1); // inner source's own count
  });

  it('emits status changes to subscribers, without repeating one', async () => {
    MockWebSocket.reset();
    const bridge = new BridgeTowerSource(new ManualTowerSource(), { webSocketImpl: MockCtor });
    const seen: string[] = [];
    bridge.onStatus((s) => seen.push(s.state));

    const p = bridge.connect('ws://test');
    MockWebSocket.instances[MockWebSocket.instances.length - 1].open();
    await p;
    bridge.disconnect();

    // Leading 'disconnected' is onStatus's immediate fire. Closing the socket
    // reports a disconnect once, not twice (the close event and disconnect()).
    expect(seen).toEqual(['disconnected', 'connecting', 'connected', 'disconnected']);
  });
});

// ─── Local Network Access retry ──────────────────────────────────────────────
//
// Chrome gates a public-origin page reaching loopback behind a permission, and
// aborts the very request that raises the prompt. Verified against the deployed
// build: first attempt dies instantly with close 1006, and every attempt after
// the player clicks Allow connects. Without the retry the panel goes red at the
// exact moment they granted permission.

/** Wait until `n` sockets exist, so we can drive the retry's socket. */
async function waitForSocket(n: number): Promise<MockWebSocket> {
  for (let i = 0; i < 50 && MockWebSocket.instances.length < n; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe('BridgeTowerSource — Local Network Access retry', () => {
  it('retries once after the permission is granted, and connects', async () => {
    MockWebSocket.reset();
    const bridge = new BridgeTowerSource(new ManualTowerSource(), {
      webSocketImpl: MockCtor,
      awaitLocalNetworkGrant: async () => true,
    });

    const p = bridge.connect('ws://test');
    (await waitForSocket(1)).failBeforeOpen(); // the prompt aborts attempt #1

    const retrySocket = await waitForSocket(2);
    expect(MockWebSocket.instances).toHaveLength(2);
    retrySocket.open();
    await p;

    expect(bridge.status.state).toBe('connected');
  });

  it('does not retry when the permission is refused', async () => {
    MockWebSocket.reset();
    const bridge = new BridgeTowerSource(new ManualTowerSource(), {
      webSocketImpl: MockCtor,
      awaitLocalNetworkGrant: async () => false,
    });

    const p = bridge.connect('ws://test');
    (await waitForSocket(1)).failBeforeOpen();
    await p;

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(bridge.status.state).toBe('error');
  });

  it('abandons the retry if the player disconnects while the prompt is up', async () => {
    MockWebSocket.reset();
    let grant!: (granted: boolean) => void;
    const bridge = new BridgeTowerSource(new ManualTowerSource(), {
      webSocketImpl: MockCtor,
      awaitLocalNetworkGrant: () =>
        new Promise<boolean>((resolve) => {
          grant = resolve;
        }),
    });

    const p = bridge.connect('ws://test');
    (await waitForSocket(1)).failBeforeOpen();
    // Let the failure propagate so the source is actually parked on the prompt.
    for (let i = 0; i < 50 && !grant; i++) await new Promise((r) => setTimeout(r, 0));

    bridge.disconnect(); // player gives up while the dialog is still on screen
    grant(true); // ...and only then clicks Allow
    await p;

    expect(MockWebSocket.instances).toHaveLength(1); // no resurrection
    expect(bridge.status.state).toBe('disconnected');
  });
});
