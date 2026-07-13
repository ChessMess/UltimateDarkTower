import { Logger } from './udtLogger';
import type { UdtDiagnosticsRecorder } from './udtDiagnostics';

// Minimum gap (ms) enforced between a command's response and the next
// command's dispatch. Inside the tower's documented ~200-500ms rate limit
// (ARCHITECTURE.md); also matches the retry backoff unit used elsewhere
// (udtTowerCommands.ts).
const MIN_COMMAND_INTERVAL_MS = 250;

/**
 * Internal interface for queued commands
 * @private
 */
interface QueuedCommand {
  id: string;
  command: Uint8Array;
  timestamp: number;
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  description?: string;
}

/**
 * Internal command queue for managing sequential tower command processing
 * @private
 */
export class CommandQueue {
  private queue: QueuedCommand[] = [];
  private currentCommand: QueuedCommand | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private isProcessing: boolean = false;
  private readonly timeoutMs: number = 30000; // 30 seconds
  private recorder: UdtDiagnosticsRecorder | null = null;

  constructor(
    private logger: Logger,
    private sendCommandFn: (command: Uint8Array) => Promise<void>,
    recorder?: UdtDiagnosticsRecorder,
    private minCommandIntervalMs: number = MIN_COMMAND_INTERVAL_MS,
  ) {
    this.recorder = recorder ?? null;
  }

  setRecorder(recorder: UdtDiagnosticsRecorder | null): void {
    this.recorder = recorder;
  }

  /**
   * Enqueue a command for processing
   */
  async enqueue(command: Uint8Array, description?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const queuedCommand: QueuedCommand = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        command,
        timestamp: Date.now(),
        resolve,
        reject,
        description,
      };

      this.queue.push(queuedCommand);
      this.logger.debug(
        `Command queued: ${description || 'unnamed'} (queue size: ${this.queue.length})`,
        '[UDT]',
      );
      this.recorder?.recordEvent('cmd_enqueued', {
        id: queuedCommand.id,
        description,
        queueDepth: this.queue.length,
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  /**
   * Process the next command in the queue
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.currentCommand = this.queue.shift()!;

    const { id, command, description, reject } = this.currentCommand;

    this.logger.debug(`Processing command: ${description || id}`, '[UDT]');

    try {
      // Set timeout for command completion
      this.timeoutHandle = setTimeout(() => {
        this.onTimeout();
      }, this.timeoutMs);

      // Send the command using the existing sendTowerCommand logic
      await this.sendCommandFn(command);

      // Command was sent successfully, now we wait for a response
      // The response will be handled by onResponse() method
    } catch (error) {
      // Command failed to send, reject and move to next
      this.clearTimeout();
      this.recorder?.recordEvent('cmd_failed', {
        id,
        description,
        error: (error as Error)?.message ?? String(error),
      });
      this.currentCommand = null;
      this.isProcessing = false;

      reject(error as Error);

      // Continue processing next command
      this.processNext();
    }
  }

  /**
   * Called when a tower response is received
   */
  onResponse(): void {
    if (this.currentCommand) {
      this.clearTimeout();

      const { resolve, description, id } = this.currentCommand;
      this.logger.debug(`Command completed: ${description || id}`, '[UDT]');

      this.currentCommand = null;
      this.isProcessing = false;

      resolve();

      // Defer to a real timer tick so the next GATT write never fires from
      // within the synchronous continuation of the BLE notification that
      // resolved this command — issuing a write there races the browser's
      // GATT transaction state ("GATT operation already in progress"). Also
      // enforces the ~200-500ms inter-command spacing documented in
      // ARCHITECTURE.md. A configured interval of 0 (test-only) opts out of
      // the deferral entirely, since even setTimeout(fn, 0) is a real
      // macrotask that isn't ordered consistently against other pending work.
      if (this.minCommandIntervalMs > 0) {
        setTimeout(() => this.processNext(), this.minCommandIntervalMs);
      } else {
        this.processNext();
      }
    }
  }

  /**
   * Handle command timeout
   */
  private onTimeout(): void {
    if (this.currentCommand) {
      const { description, id, timestamp } = this.currentCommand;
      this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, '[UDT]');
      this.recorder?.recordEvent('cmd_timeout', {
        id,
        description,
        ageMs: Date.now() - timestamp,
        queueDepth: this.queue.length,
      });

      const reject = this.currentCommand.reject;

      this.currentCommand = null;
      this.isProcessing = false;

      reject(new Error(`Command timeout after ${this.timeoutMs}ms: ${description || id}`));

      // Process next command in queue
      this.processNext();
    }
  }

  /**
   * Clear the current timeout
   */
  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  /**
   * Clear all pending commands
   */
  clear(): void {
    this.clearTimeout();

    // Reject all pending commands
    this.queue.forEach((cmd) => {
      cmd.reject(new Error('Command queue cleared'));
    });

    this.queue = [];
    if (this.currentCommand) {
      this.currentCommand.reject(new Error('Command queue cleared'));
    }
    this.currentCommand = null;
    this.isProcessing = false;

    this.logger.debug('Command queue cleared', '[UDT]');
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentCommand: this.currentCommand
        ? {
            id: this.currentCommand.id,
            description: this.currentCommand.description,
            timestamp: this.currentCommand.timestamp,
          }
        : null,
    };
  }
}
