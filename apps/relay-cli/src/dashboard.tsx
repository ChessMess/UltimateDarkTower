/**
 * Live status board for the relay CLI. Ink is ESM-only, which is why this
 * package ships `"type": "module"` (see tsconfig.json).
 *
 * `index.ts` owns one mutable `RelayStatus` object and mutates it from the
 * event handlers it already has; this component doesn't subscribe to
 * anything, it just re-renders on a tick and reads the object directly. Ink
 * diffs its output, so an unchanged tick writes nothing to the terminal.
 */
import { useEffect, useState } from 'react';
import { Box, Text, render, useInput, type Instance } from 'ink';
import type { TowerEmulatorState, ConnectedClient, LogLevel } from 'ultimatedarktowerrelay-shared';
import type { TowerState } from 'ultimatedarktower';
import { drumSide, formatUptime, formatRelativeTime, getLanAddress } from './format.js';

export interface ActivityEntry {
  ts: number;
  kind: LogLevel;
  text: string;
}

export interface RelayStatus {
  version: string;
  sourceMode: string;
  port: number;
  startedAt: number;
  utddUrl: string;
  loggingEnabled: boolean;
  towerEmulatorState: TowerEmulatorState;
  companionConnected: boolean;
  /** Raw BLE adapter state (e.g. 'poweredOn'); null when the source has no BLE adapter (real mode). */
  bleAdapterState: string | null;
  towerState: TowerState;
  commandCount: number;
  lastCommandAt: Date | null;
  /** Skull-drop count from the NotificationSynthesizer; null when there is no synth (real mode). */
  skullDropCount: number | null;
  clients: ConnectedClient[];
  /** Ring buffer, oldest first. index.ts is responsible for capping its length. */
  activity: ActivityEntry[];
}

export interface DashboardActions {
  quit: () => void;
  resend: () => void;
  toggleLogging: () => void;
}

const MAX_CLIENT_ROWS = 5;

function stateColor(state: TowerEmulatorState): string {
  if (state === 'connected') return 'green';
  if (state === 'error') return 'red';
  return 'yellow';
}

function clientColor(state: ConnectedClient['state']): string {
  if (state === 'ready') return 'green';
  if (state === 'connecting') return 'yellow';
  return 'gray';
}

function kindColor(kind: LogLevel): string {
  if (kind === 'error') return 'red';
  if (kind === 'warn') return 'yellow';
  if (kind === 'cmd') return 'blue';
  return 'gray';
}

function Dashboard({ status, actions }: { status: RelayStatus; actions: DashboardActions }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) actions.quit();
    else if (input === 'r') actions.resend();
    else if (input === 'l') actions.toggleLogging();
  });

  const rows = process.stdout.rows || 24;
  const activityMax = Math.max(3, rows - 20);
  const uptime = formatUptime(now - status.startedAt);
  const lanAddress = getLanAddress();
  const [top, middle, bottom] = status.towerState.drum;
  const visibleClients = status.clients.slice(0, MAX_CLIENT_ROWS);
  const extraClients = status.clients.length - visibleClients.length;
  const visibleActivity = status.activity.slice(-activityMax);

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text>
        <Text color={stateColor(status.towerEmulatorState)}>●</Text>{' '}
        <Text bold>
          Ultimate Dark Tower Relay — v{status.version} · {status.sourceMode} · up {uptime}
        </Text>
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          RELAY
        </Text>
        <Text> ws://localhost:{status.port}</Text>
        {lanAddress && (
          <Text>
            {' '}
            ws://{lanAddress}:{status.port} (LAN)
          </Text>
        )}
        <Text> Open {status.utddUrl}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          TOWER
        </Text>
        <Text>
          {' '}
          <Text color={stateColor(status.towerEmulatorState)}>●</Text>{' '}
          <Text color={stateColor(status.towerEmulatorState)}>{status.towerEmulatorState}</Text>
          {'    '}
          app:{' '}
          <Text color={status.companionConnected ? 'green' : 'gray'}>
            {status.companionConnected ? 'connected' : 'disconnected'}
          </Text>
          {status.bleAdapterState !== null ? `    BLE: ${status.bleAdapterState}` : ''}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          STATE
        </Text>
        <Text>
          {' '}
          top {drumSide(top.position)} mid {drumSide(middle.position)} bot{' '}
          {drumSide(bottom.position)}
          {'   '}
          cal {[top, middle, bottom].map((d) => (d.calibrated ? '✓' : '·')).join('')}
        </Text>
        <Text>
          {' '}
          led seq {status.towerState.led_sequence} · audio #{status.towerState.audio.sample} vol{' '}
          {status.towerState.audio.volume} · beam {status.towerState.beam.count}
          {status.towerState.beam.fault ? ' FAULT' : ''}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          CLIENTS (
          <Text color={status.clients.length > 0 ? 'green' : 'gray'}>
            {status.clients.length}
          </Text>
          )
        </Text>
        {visibleClients.length === 0 && <Text dimColor> none connected</Text>}
        {visibleClients.map((c) => (
          <Text key={c.id}>
            {' '}
            <Text color={clientColor(c.state)}>●</Text> {(c.label ?? c.id.slice(0, 8)).padEnd(14)}{' '}
            {c.state.padEnd(11)}
            {c.towerConnected ? ' tower✓' : ''}
            {c.observer ? ' observer' : ''} {formatRelativeTime(new Date(c.connectedAt), now)}
          </Text>
        ))}
        {extraClients > 0 && <Text dimColor> +{extraClients} more</Text>}
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text bold color="cyan">
            COUNTERS
          </Text>{' '}
          commands <Text color="cyan">{status.commandCount}</Text> skulls{' '}
          <Text color={status.skullDropCount ? 'yellow' : 'gray'}>
            {status.skullDropCount ?? '—'}
          </Text>{' '}
          last {formatRelativeTime(status.lastCommandAt, now)}
        </Text>
      </Box>

      <Box
        marginTop={1}
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        <Text bold dimColor>
          activity
        </Text>
        {visibleActivity.length === 0 && <Text dimColor> (nothing yet)</Text>}
        {visibleActivity.map((entry, i) => (
          <Text key={`${entry.ts}-${i}`}>
            <Text dimColor>{new Date(entry.ts).toLocaleTimeString()}</Text>{' '}
            <Text color={kindColor(entry.kind)}>{entry.kind.padEnd(5)}</Text> {entry.text}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          <Text bold color="cyan">
            q
          </Text>{' '}
          quit{'   '}
          <Text bold color="cyan">
            r
          </Text>{' '}
          resend{'   '}
          <Text bold color="cyan">
            l
          </Text>{' '}
          logging (
          <Text color={status.loggingEnabled ? 'green' : 'gray'}>
            {status.loggingEnabled ? 'on' : 'off'}
          </Text>
          )
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Mount the dashboard. Returns a teardown that unmounts ink and restores the
 * terminal (cursor, raw mode). `actions.quit` is wrapped so a keypress inside
 * the component unmounts ink *before* running the caller's shutdown — ink
 * hides the cursor and holds stdin in raw mode, and process.exit() without
 * unmounting first leaks both into the user's shell.
 */
export function startDashboard(status: RelayStatus, actions: DashboardActions): () => void {
  const wrappedActions: DashboardActions = {
    ...actions,
    // References `instance` before its declaration below — fine, since this
    // closure only runs on a later keypress, by which time render() has
    // already returned and assigned it.
    quit: () => {
      instance.unmount();
      actions.quit();
    },
  };
  const instance: Instance = render(<Dashboard status={status} actions={wrappedActions} />, {
    exitOnCtrlC: false,
    // relay-core writes unstructured console.log from ~30 call sites; ink's
    // default console patching would print those above the live frame and
    // make a full-screen board crawl down the terminal. index.ts instead
    // redirects console output into the activity ring before mounting.
    patchConsole: false,
  });
  return () => instance.unmount();
}
