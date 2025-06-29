"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandQueue = void 0;
/**
 * Internal command queue for managing sequential tower command processing
 * @private
 */
class CommandQueue {
    constructor(logger, sendCommandFn) {
        this.logger = logger;
        this.sendCommandFn = sendCommandFn;
        this.queue = [];
        this.currentCommand = null;
        this.timeoutHandle = null;
        this.isProcessing = false;
        this.timeoutMs = 30000; // 30 seconds
    }
    /**
     * Enqueue a command for processing
     */
    async enqueue(command, description) {
        return new Promise((resolve, reject) => {
            const queuedCommand = {
                id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                command,
                timestamp: Date.now(),
                resolve,
                reject,
                description
            };
            this.queue.push(queuedCommand);
            this.logger.debug(`Command queued: ${description || 'unnamed'} (queue size: ${this.queue.length})`, '[UDT]');
            // Start processing if not already running
            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }
    /**
     * Process the next command in the queue
     */
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        this.isProcessing = true;
        this.currentCommand = this.queue.shift();
        const { id, command, description, resolve, reject } = this.currentCommand;
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
        }
        catch (error) {
            // Command failed to send, reject and move to next
            this.clearTimeout();
            this.currentCommand = null;
            this.isProcessing = false;
            reject(error);
            // Continue processing next command
            this.processNext();
        }
    }
    /**
     * Called when a tower response is received
     */
    onResponse() {
        if (this.currentCommand) {
            this.clearTimeout();
            const { resolve, description, id } = this.currentCommand;
            this.logger.debug(`Command completed: ${description || id}`, '[UDT]');
            this.currentCommand = null;
            this.isProcessing = false;
            resolve();
            // Process next command in queue
            this.processNext();
        }
    }
    /**
     * Handle command timeout
     */
    onTimeout() {
        if (this.currentCommand) {
            const { description, id } = this.currentCommand;
            this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, '[UDT]');
            // Don't reject the promise - just log and continue
            // This allows the queue to continue processing even if a command times out
            this.currentCommand.resolve();
            this.currentCommand = null;
            this.isProcessing = false;
            // Process next command in queue
            this.processNext();
        }
    }
    /**
     * Clear the current timeout
     */
    clearTimeout() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
    /**
     * Clear all pending commands
     */
    clear() {
        this.clearTimeout();
        // Reject all pending commands
        this.queue.forEach(cmd => {
            cmd.reject(new Error('Command queue cleared'));
        });
        this.queue = [];
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
            currentCommand: this.currentCommand ? {
                id: this.currentCommand.id,
                description: this.currentCommand.description,
                timestamp: this.currentCommand.timestamp
            } : null
        };
    }
}
exports.CommandQueue = CommandQueue;
//# sourceMappingURL=udtCommandQueue.js.map