/**
 * UltimateDarkTower - Main entry point
 * Export the main class and constants for public use
 */

export { default as UltimateDarkTower } from './UltimateDarkTower';
export * from './udtConstants';
export { logger, Logger, ConsoleOutput, DOMOutput, type LogLevel, type LogOutput } from './udtLogger';

// For convenience, also export as default
import UltimateDarkTower from './UltimateDarkTower';
export default UltimateDarkTower;
