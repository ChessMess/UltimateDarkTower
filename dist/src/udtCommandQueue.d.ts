import { Logger } from './Logger';
/**
 * Internal command queue for managing sequential tower command processing
 * @private
 */
export declare class CommandQueue {
    private logger;
    private sendCommandFn;
    private queue;
    private currentCommand;
    private timeoutHandle;
    private isProcessing;
    private readonly timeoutMs;
    constructor(logger: Logger, sendCommandFn: (command: Uint8Array) => Promise<void>);
    /**
     * Enqueue a command for processing
     */
    enqueue(command: Uint8Array, description?: string): Promise<void>;
    /**
     * Process the next command in the queue
     */
    private processNext;
    /**
     * Called when a tower response is received
     */
    onResponse(): void;
    /**
     * Handle command timeout
     */
    private onTimeout;
    /**
     * Clear the current timeout
     */
    private clearTimeout;
    /**
     * Clear all pending commands
     */
    clear(): void;
    /**
     * Get queue status for debugging
     */
    getStatus(): {
        queueLength: number;
        isProcessing: boolean;
        currentCommand: {
            id: string;
            description: string;
            timestamp: number;
        };
    };
}
