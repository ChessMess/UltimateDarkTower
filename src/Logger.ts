export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';

export interface LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}

export class ConsoleOutput implements LogOutput {
    write(level: LogLevel, message: string, _timestamp: Date): void {
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

        // Add entries that match the current filter
        this.allEntries.forEach(entry => {
            // Only show entries if their level checkbox is checked
            if (enabledLevels.has(entry.level)) {
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
}

// Export singleton instance for easy use
export const logger = Logger.getInstance();