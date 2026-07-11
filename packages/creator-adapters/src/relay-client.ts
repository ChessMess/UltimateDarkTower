// Player↔Relay WebSocket source client — build guide §7, Appendix B.
// Two modes:
//   'stub'  — in-process simulation of the Relay, no WS required.
//             Emulator target is auto-calibrated; all tower:commands are ack'd immediately.
//   'ws'    — connects to a real Relay server via WebSocket, full protocol.
// Both modes expose the same event callbacks, so the game loop is mode-agnostic.
//
// Protocol: player-relay-protocol-v0_1_2.md §3–§7.
// PROTOCOL_VERSION '0.1' is the *source* protocol version (§3.2); do not confuse with
// ultimatedarktowerrelay-shared's PROTOCOL_VERSION which is the consumer/host protocol.

export type RelayConnState = 'disconnected' | 'connecting' | 'connected' | 'resyncing';

export type RelayTargetState =
  | 'idle' | 'connecting' | 'connected' | 'calibrating' | 'ready' | 'dropped' | 'error';

export interface RelayStatus {
  relaying: boolean;
  targetKind: 'tower' | 'emulator' | null;
  targetState: RelayTargetState;
  calibrated: boolean;
}

// Relay wire-message shapes (inbound)
type RelayInbound =
  | { type: 'relay:status'; relaying: boolean; targetKind: 'tower' | 'emulator' | null; targetState: string; calibrated: boolean }
  | { type: 'tower:observed'; observed: 'skullCounter'; value: number }
  | { type: 'tower:seals'; seals: string[] }
  | { type: 'relay:sync'; lastCommand: number[] | null }
  | { type: 'relay:ack' }
  | { type: 'relay:paused' }
  | { type: 'relay:resumed' };

export interface RelayClientCallbacks {
  onStatus: (status: RelayStatus) => void;
  onObserved: (observed: 'skullCounter', value: number) => void;
  onSync: (lastCommand: number[] | null) => void;
  onAck: () => void;
  /** Inbound seal mirror — the relay echoes the latest broken-seal set back to the source. */
  onSeals: (seals: string[]) => void;
  onConnStateChange: (state: RelayConnState) => void;
}

const PROTOCOL_VERSION = '0.1';

export class RelayClient {
  private ws: WebSocket | null = null;
  private mode: 'ws' | 'stub' = 'stub';
  private connState: RelayConnState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private lastCommand: number[] = [];
  private lastSeals: string[] = [];
  private seq = 0;
  private url = '';
  private destroyed = false;
  private stubTarget: 'tower' | 'emulator' = 'emulator';

  constructor(private readonly cbs: RelayClientCallbacks) {}

  connect(url: string): void {
    this.url = url;
    this.destroyed = false;
    this.mode = url === 'stub' ? 'stub' : 'ws';
    if (this.mode === 'stub') {
      this.runStubHandshake();
    } else {
      this.openWs();
    }
  }

  disconnect(): void {
    this.destroyed = true;
    this.clearReconnectTimer();
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.setConnState('disconnected');
  }

  // Simulate a mid-game WS drop followed by auto-reconnect (gate test helper).
  simulateDisconnect(): void {
    if (this.mode === 'stub') {
      this.setConnState('disconnected');
      setTimeout(() => { if (!this.destroyed) this.runStubResync(); }, 600);
    } else if (this.ws) {
      this.ws.close();
    }
  }

  requestTarget(target: 'tower' | 'emulator'): void {
    this.stubTarget = target;
    if (this.mode === 'stub') {
      setTimeout(() => {
        if (!this.destroyed) {
          this.cbs.onStatus({
            relaying: true,
            targetKind: target,
            targetState: 'ready',
            calibrated: true,
          });
        }
      }, 80);
    } else {
      this.send({ type: 'target:request', target });
    }
  }

  sendCommand(data: number[], seq?: number): void {
    this.lastCommand = data;
    this.seq = seq ?? this.seq + 1;
    if (this.mode === 'stub') {
      setTimeout(() => { if (!this.destroyed) this.cbs.onAck(); }, 15);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'tower:command', data, seq: this.seq });
    }
  }

  // Send the full broken-seal set as a sidecar (Appendix B, Protocol R12).
  // Emulator renders visually via applySeals; physical tower ignores the sidecar.
  sendSeals(brokenSeals: string[]): void {
    this.lastSeals = brokenSeals;
    if (this.mode === 'stub') {
      // stub: no-op (emulator seal state is driven by display().applySeals directly)
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'tower:seals', seals: brokenSeals });
    }
  }

  // ---- private ----

  private setConnState(s: RelayConnState): void {
    this.connState = s;
    this.cbs.onConnStateChange(s);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private runStubHandshake(): void {
    this.setConnState('connecting');
    setTimeout(() => {
      if (this.destroyed) return;
      this.setConnState('connected');
      this.cbs.onStatus({ relaying: false, targetKind: null, targetState: 'idle', calibrated: false });
    }, 120);
  }

  private runStubResync(): void {
    this.setConnState('resyncing');
    setTimeout(() => {
      if (this.destroyed) return;
      // Protocol §7: relay asks player to re-send last command
      this.cbs.onSync(this.lastCommand.length > 0 ? this.lastCommand : null);
      // Re-emit last seals so the display stays in sync after resync
      if (this.lastSeals.length > 0) this.cbs.onSeals(this.lastSeals);
      // Then restore target state
      setTimeout(() => {
        if (!this.destroyed) {
          this.setConnState('connected');
          this.cbs.onStatus({
            relaying: true,
            targetKind: this.stubTarget,
            targetState: 'ready',
            calibrated: true,
          });
        }
      }, 80);
    }, 350);
  }

  private openWs(): void {
    this.setConnState('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.setConnState('connected');
      this.send({
        type: 'source:hello',
        role: 'player',
        protocolVersion: PROTOCOL_VERSION,
      });
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(evt.data) as RelayInbound;
        this.handleInbound(msg);
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = (evt) => {
      this.ws = null;
      if (evt.code === 4000) {
        // Protocol version incompatibility — do not reconnect
        this.setConnState('disconnected');
        return;
      }
      if (!this.destroyed) this.scheduleReconnect();
    };

    ws.onerror = () => { ws.close(); };
  }

  private handleInbound(msg: RelayInbound): void {
    switch (msg.type) {
      case 'relay:status':
        this.cbs.onStatus({
          relaying: msg.relaying,
          targetKind: msg.targetKind,
          targetState: msg.targetState as RelayTargetState,
          calibrated: msg.calibrated,
        });
        break;
      case 'tower:observed':
        this.cbs.onObserved(msg.observed, msg.value);
        break;
      case 'tower:seals':
        this.lastSeals = msg.seals;
        this.cbs.onSeals(msg.seals);
        break;
      case 'relay:sync':
        this.setConnState('resyncing');
        this.cbs.onSync(msg.lastCommand);
        break;
      case 'relay:ack':
        if (this.connState === 'resyncing') this.setConnState('connected');
        this.cbs.onAck();
        break;
    }
  }

  private scheduleReconnect(): void {
    this.setConnState('disconnected');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.destroyed) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
        this.openWs();
      }
    }, this.reconnectDelay);
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

export function createRelayClient(cbs: RelayClientCallbacks): RelayClient {
  return new RelayClient(cbs);
}
