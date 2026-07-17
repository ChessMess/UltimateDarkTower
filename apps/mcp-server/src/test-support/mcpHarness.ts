/**
 * mcpHarness.ts — drives the real MCP server in-process for tool-boundary tests.
 *
 * Tools are registered against an McpServer, so testing a tool's declared input
 * schema means going through the server: the schema is inline in registerTool and is
 * not exported, and it is the SDK — not our code — that enforces it. Asserting
 * against the schema object directly would test a copy, not the contract a client
 * actually hits.
 *
 * InMemoryTransport.createLinkedPair() is the SDK's supported in-process path. It is
 * absent from the package's named exports but resolves through the exports map's
 * "./*" wildcard.
 *
 * Excluded from the build in tsconfig.json — this package publishes to npm and test
 * scaffolding must not ship in dist/.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { vi } from 'vitest';

import type { TowerController } from '../tower-controller.js';

/**
 * A stand-in for the TowerController singleton. Its real constructor is private and
 * it builds its own UltimateDarkTower from an env var, so there is no injection
 * seam; tools only ever call methods on it, so a stub is enough to observe what a
 * tool forwards to the tower — and, more importantly, what it doesn't.
 */
export function createFakeTower() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    calibrate: vi.fn().mockResolvedValue(undefined),
    sendTowerState: vi.fn().mockResolvedValue(undefined),
    getCurrentTowerState: vi.fn().mockReturnValue(null),
    rotateWithState: vi.fn().mockResolvedValue(undefined),
    rotateDrumStateful: vi.fn().mockResolvedValue(undefined),
    randomRotateLevels: vi.fn().mockResolvedValue(undefined),
    lightOverrides: vi.fn().mockResolvedValue(undefined),
    setLights: vi.fn().mockResolvedValue(undefined),
    playSoundStateful: vi.fn().mockResolvedValue(undefined),
    isConnected: true,
    isCalibrated: true,
  };
}

export type FakeTower = ReturnType<typeof createFakeTower>;

type RegisterFn = (server: McpServer, tower: TowerController) => void;

export interface Harness {
  client: Client;
  tower: FakeTower;
  /** Calls a tool and reports whether the SDK/handler rejected it. */
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ isError: boolean; text: string }>;
  close: () => Promise<void>;
}

/**
 * Registers the given tool modules against an in-process server and returns a
 * connected client.
 */
export async function createHarness(
  register: RegisterFn | RegisterFn[],
  tower: FakeTower = createFakeTower(),
): Promise<Harness> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const registrars = Array.isArray(register) ? register : [register];
  for (const fn of registrars) fn(server, tower as unknown as TowerController);

  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    tower,
    // A schema rejection surfaces as a thrown JSON-RPC error, while a handler failure
    // comes back as isError — normalise both so tests can assert "was it rejected"
    // without caring which layer caught it.
    async callTool(name, args) {
      try {
        const result = (await client.callTool({ name, arguments: args })) as {
          isError?: boolean;
          content?: Array<{ type: string; text?: string }>;
        };
        const text = (result.content ?? [])
          .map((c) => c.text ?? '')
          .join('\n')
          .trim();
        return { isError: result.isError === true, text };
      } catch (err) {
        return { isError: true, text: err instanceof Error ? err.message : String(err) };
      }
    },
    async close() {
      await client.close();
      await server.close();
    },
  };
}
