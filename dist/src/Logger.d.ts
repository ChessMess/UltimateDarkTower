export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';
export interface LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}
export declare class ConsoleOutput implements LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}
export declare class DOMOutput implements LogOutput {
    private container;
    private maxLines;
    constructor(containerId: string, maxLines?: number);
    write(level: LogLevel, message: string, timestamp: Date): void;
}
export declare class Logger {
    private outputs;
    private minLevel;
    private static instance;
    constructor();
    static getInstance(): Logger;
    addOutput(output: LogOutput): void;
    setMinLevel(level: LogLevel): void;
    private shouldLog;
    private log;
    debug(message: string, context?: string): void;
    info(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, context?: string): void;
}
export declare const logger: Logger;
