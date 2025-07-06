export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';
export interface LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}
export declare class ConsoleOutput implements LogOutput {
    write(level: LogLevel, message: string, _timestamp: Date): void;
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
}
export declare class BufferOutput implements LogOutput {
    private buffer;
    private maxEntries;
    private clearCount;
    constructor(maxEntries?: number, clearCount?: number);
    write(level: LogLevel, message: string, timestamp: Date): void;
    getBuffer(): LogEntry[];
    getBufferSize(): number;
    clearBuffer(): void;
    getEntriesByLevel(level: LogLevel): LogEntry[];
    getEntriesSince(timestamp: Date): LogEntry[];
}
export declare class DOMOutput implements LogOutput {
    private container;
    private maxLines;
    private allEntries;
    constructor(containerId: string, maxLines?: number);
    write(level: LogLevel, message: string, timestamp: Date): void;
    private refreshDisplay;
    private getEnabledLevelsFromCheckboxes;
    private getTextFilter;
    private updateBufferSizeDisplay;
    refreshFilter(): void;
    clearAll(): void;
    getEntryCount(): number;
    getEnabledLevels(): string[];
    debugEntries(): void;
}
export declare class Logger {
    private outputs;
    private enabledLevels;
    private static instance;
    constructor();
    static getInstance(): Logger;
    addOutput(output: LogOutput): void;
    setMinLevel(level: LogLevel): void;
    setEnabledLevels(levels: LogLevel[]): void;
    enableLevel(level: LogLevel): void;
    disableLevel(level: LogLevel): void;
    getEnabledLevels(): LogLevel[];
    private shouldLog;
    private log;
    debug(message: string, context?: string): void;
    info(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, context?: string): void;
}
export declare const logger: Logger;
