/**
 * ultimatedarktowerrelay-client
 *
 * Framework-agnostic consumer SDK for UltimateDarkTowerRelay. Connect to a relay
 * host over WebSocket, receive decoded tower state, and (as a participant) report
 * player actions. Works in the browser (global `WebSocket`) or Node (inject the
 * `ws` package via `webSocketImpl`).
 */

export { RelayClient } from './relayClient';
export type {
  RelayClientOptions,
  RelayClientEvent,
  RelayClientEventHandler,
  WebSocketLike,
  WebSocketConstructor,
} from './relayClient';
