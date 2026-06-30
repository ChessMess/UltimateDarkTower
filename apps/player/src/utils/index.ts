export function fmtStatus(s: string): string {
  const map: Record<string, string> = {
    running: 'Running',
    awaitingInput: 'Awaiting input',
    won: 'Won',
    lost: 'Lost',
    ended: 'Ended',
  };
  return map[s] ?? s;
}

export function fmtConnState(s: string): string {
  const map: Record<string, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting…',
    connected: 'Connected',
    resyncing: 'Resyncing…',
  };
  return map[s] ?? s;
}

export function connColor(s: string): string {
  if (s === 'connected') return '#059669';
  if (s === 'disconnected') return '#DC2626';
  return '#F59E0B';
}
