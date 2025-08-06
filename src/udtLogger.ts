import type { TowerState } from './udtTowerState';

export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';

export interface LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}

export class ConsoleOutput implements LogOutput {
    write(level: LogLevel, message: string): void {
        switch (level) {
            case 'debug':
                console.debug(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
}

export class BufferOutput implements LogOutput {
    private buffer: LogEntry[] = [];
    private maxEntries: number = 1000;
    private clearCount: number = 100;

    constructor(maxEntries: number = 1000, clearCount: number = 100) {
        this.maxEntries = maxEntries;
        this.clearCount = clearCount;
    }

    write(level: LogLevel, message: string, timestamp: Date): void {
        this.buffer.push({ level, message, timestamp });

        // When buffer exceeds max capacity, remove first clearCount entries
        if (this.buffer.length > this.maxEntries) {
            this.buffer.splice(0, this.clearCount);
        }
    }

    getBuffer(): LogEntry[] {
        return [...this.buffer];
    }

    getBufferSize(): number {
        return this.buffer.length;
    }

    clearBuffer(): void {
        this.buffer = [];
    }

    getEntriesByLevel(level: LogLevel): LogEntry[] {
        return this.buffer.filter(entry => entry.level === level);
    }

    getEntriesSince(timestamp: Date): LogEntry[] {
        return this.buffer.filter(entry => entry.timestamp >= timestamp);
    }
}

export class DOMOutput implements LogOutput {
    private container: HTMLElement | null = null;
    private maxLines: number = 100;
    private allEntries: Array<{ level: LogLevel; message: string; timestamp: Date }> = [];

    constructor(containerId: string, maxLines: number = 100) {
        this.container = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
        this.maxLines = maxLines;
    }

    write(level: LogLevel, message: string, timestamp: Date): void {
        if (!this.container) return;

        // Store the entry data (not DOM elements) for filtering
        this.allEntries.push({ level, message, timestamp });

        // Remove oldest entries if we exceed maxLines
        while (this.allEntries.length > this.maxLines) {
            this.allEntries.shift();
        }

        // Refresh the display with current filtering
        this.refreshDisplay();
    }

    private refreshDisplay(): void {
        if (!this.container) return;

        // Clear current display
        this.container.innerHTML = '';

        // Get currently enabled levels from checkboxes
        const enabledLevels = this.getEnabledLevelsFromCheckboxes();

        // Get text filter value
        const textFilter = this.getTextFilter();

        // Add entries that match the current filter
        this.allEntries.forEach(entry => {
            // Only show entries if their level checkbox is checked
            if (enabledLevels.has(entry.level)) {
                // Apply text filter if one is set
                if (textFilter && !entry.message.toLowerCase().includes(textFilter.toLowerCase())) {
                    return; // Skip this entry if it doesn't match text filter
                }

                // Create fresh DOM element for this entry
                const timeStr = entry.timestamp.toLocaleTimeString();
                const logLine = document.createElement('div');
                logLine.className = `log-line log-${entry.level}`;
                logLine.textContent = `[${timeStr}] ${entry.message}`;

                this.container!.appendChild(logLine);
            }
        });

        // Auto-scroll to bottom
        this.container.scrollTop = this.container.scrollHeight;

        // Update buffer size display
        this.updateBufferSizeDisplay();
    }

    private getEnabledLevelsFromCheckboxes(): Set<LogLevel> {
        const enabledLevels = new Set<LogLevel>();

        if (typeof document === 'undefined') {
            return enabledLevels;
        }

        // Check for checkboxes with pattern logLevel-{level}
        const checkboxes = ['debug', 'info', 'warn', 'error'];
        checkboxes.forEach(level => {
            const checkbox = document.getElementById(`logLevel-${level}`) as HTMLInputElement;
            if (checkbox && checkbox.checked) {
                enabledLevels.add(level as LogLevel);
            }
        });

        return enabledLevels;
    }

    private getTextFilter(): string {
        if (typeof document === 'undefined') {
            return '';
        }

        const textFilterInput = document.getElementById('logTextFilter') as HTMLInputElement;
        return textFilterInput?.value?.trim() || '';
    }

    private updateBufferSizeDisplay(): void {
        if (typeof document === 'undefined') {
            return;
        }

        const bufferSizeElement = document.getElementById('logBufferSize');
        if (!bufferSizeElement) {
            return;
        }

        // Count currently displayed entries
        const displayedCount = this.container?.children?.length || 0;

        // Total entries in buffer
        const totalCount = this.allEntries.length;

        // Update display
        bufferSizeElement.textContent = `${displayedCount} / ${totalCount}`;
    }

    // Public method to refresh display when filter checkboxes change
    public refreshFilter(): void {
        this.refreshDisplay();
    }

    // Public method to clear all entries
    public clearAll(): void {
        this.allEntries = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
        // Update buffer size display to show 0/0
        this.updateBufferSizeDisplay();
    }

    // Debug methods to help diagnose filtering issues
    public getEntryCount(): number {
        return this.allEntries.length;
    }

    public getEnabledLevels(): string[] {
        return Array.from(this.getEnabledLevelsFromCheckboxes());
    }

    public debugEntries(): void {
        console.log('DOMOutput Debug:');
        console.log('- Container exists:', !!this.container);
        console.log('- Entry count:', this.allEntries.length);
        console.log('- Enabled levels:', this.getEnabledLevels());
        console.log('- Entries:', this.allEntries);
    }
}

export class Logger {
    private outputs: LogOutput[] = [];
    private enabledLevels: Set<LogLevel> = new Set(['all']);
    private static instance: Logger | null = null;

    constructor() {
        // Default to console output
        this.outputs.push(new ConsoleOutput());
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    addOutput(output: LogOutput): void {
        this.outputs.push(output);
    }

    setMinLevel(level: LogLevel): void {
        this.enabledLevels = new Set([level]);
    }

    setEnabledLevels(levels: LogLevel[]): void {
        this.enabledLevels = new Set(levels);
    }

    enableLevel(level: LogLevel): void {
        this.enabledLevels.add(level);
    }

    disableLevel(level: LogLevel): void {
        this.enabledLevels.delete(level);
    }

    getEnabledLevels(): LogLevel[] {
        return Array.from(this.enabledLevels);
    }

    private shouldLog(level: LogLevel): boolean {
        if (this.enabledLevels.has('all')) return true;
        if (level === 'all') return true;

        // If 'all' is not enabled, check if this specific level is enabled
        if (this.enabledLevels.has(level)) return true;

        // Legacy support: if only one level is enabled and it's not 'all',
        // treat it as a minimum level threshold
        if (this.enabledLevels.size === 1) {
            const singleLevel = Array.from(this.enabledLevels)[0];
            if (singleLevel !== 'all') {
                const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
                const minIndex = levels.indexOf(singleLevel);
                const currentIndex = levels.indexOf(level);
                return currentIndex >= minIndex;
            }
        }

        return false;
    }

    private log(level: LogLevel, message: string, context?: string): void {
        if (!this.shouldLog(level)) return;

        const contextPrefix = context ? `${context} ` : '';
        const finalMessage = `${contextPrefix}${message}`;
        const timestamp = new Date();
        this.outputs.forEach(output => {
            try {
                output.write(level, finalMessage, timestamp);
            } catch (error) {
                console.error('Logger output error:', error);
            }
        });
    }

    debug(message: string, context?: string): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: string): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: string): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: string): void {
        this.log('error', message, context);
    }

    /**
     * Logs tower state changes with detailed information about what changed.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @param source - Source identifier for the update (e.g., "sendTowerState", "tower response")
     * @param enableDetailedLogging - Whether to include detailed change descriptions
     */
    logTowerStateChange(oldState: TowerState, newState: TowerState, source: string, enableDetailedLogging: boolean = false): void {
        this.info(`Tower state updated from ${source}`, '[UDT]');

        if (enableDetailedLogging) {
            const changes = this.computeStateChanges(oldState, newState);
            if (changes.length > 0) {
                this.info(`State changes: ${changes.join(', ')}`, '[UDT]');
            } else {
                this.info('No changes detected in state update', '[UDT]');
            }
        }
    }

    /**
     * Computes the differences between two tower states for logging purposes.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @returns Array of human-readable change descriptions
     */
    private computeStateChanges(oldState: TowerState, newState: TowerState): string[] {
        const changes: string[] = [];

        // Check drum changes
        for (let i = 0; i < 3; i++) {
            const drumNames = ['top', 'middle', 'bottom'];
            const oldDrum = oldState.drum[i];
            const newDrum = newState.drum[i];

            if (oldDrum.position !== newDrum.position) {
                const positions = ['north', 'east', 'south', 'west'];
                changes.push(`${drumNames[i]} drum: ${positions[oldDrum.position]} → ${positions[newDrum.position]}`);
            }
            if (oldDrum.calibrated !== newDrum.calibrated) {
                changes.push(`${drumNames[i]} drum calibrated: ${oldDrum.calibrated} → ${newDrum.calibrated}`);
            }
            if (oldDrum.jammed !== newDrum.jammed) {
                changes.push(`${drumNames[i]} drum jammed: ${oldDrum.jammed} → ${newDrum.jammed}`);
            }
            if (oldDrum.playSound !== newDrum.playSound) {
                changes.push(`${drumNames[i]} drum playSound: ${oldDrum.playSound} → ${newDrum.playSound}`);
            }
        }

        // Check LED layer changes
        const layerNames = ['top ring', 'middle ring', 'bottom ring', 'ledge', 'base1', 'base2'];
        for (let layerIndex = 0; layerIndex < 6; layerIndex++) {
            for (let lightIndex = 0; lightIndex < 4; lightIndex++) {
                const oldLight = oldState.layer[layerIndex].light[lightIndex];
                const newLight = newState.layer[layerIndex].light[lightIndex];

                const lightChanges: string[] = [];
                if (oldLight.effect !== newLight.effect) {
                    lightChanges.push(`effect ${oldLight.effect} → ${newLight.effect}`);
                }
                if (oldLight.loop !== newLight.loop) {
                    lightChanges.push(`loop ${oldLight.loop} → ${newLight.loop}`);
                }

                if (lightChanges.length > 0) {
                    changes.push(`${layerNames[layerIndex]} light ${lightIndex}: ${lightChanges.join(', ')}`);
                }
            }
        }

        // Check audio changes
        if (oldState.audio.sample !== newState.audio.sample) {
            changes.push(`audio sample: ${oldState.audio.sample} → ${newState.audio.sample}`);
        }
        if (oldState.audio.loop !== newState.audio.loop) {
            changes.push(`audio loop: ${oldState.audio.loop} → ${newState.audio.loop}`);
        }
        if (oldState.audio.volume !== newState.audio.volume) {
            changes.push(`audio volume: ${oldState.audio.volume} → ${newState.audio.volume}`);
        }

        // Check beam changes
        if (oldState.beam.count !== newState.beam.count) {
            changes.push(`beam count: ${oldState.beam.count} → ${newState.beam.count}`);
        }
        if (oldState.beam.fault !== newState.beam.fault) {
            changes.push(`beam fault: ${oldState.beam.fault} → ${newState.beam.fault}`);
        }

        // Check LED sequence changes
        if (oldState.led_sequence !== newState.led_sequence) {
            changes.push(`LED sequence: ${oldState.led_sequence} → ${newState.led_sequence}`);
        }

        return changes;
    }
}

// Export singleton instance for easy use
export const logger = Logger.getInstance();