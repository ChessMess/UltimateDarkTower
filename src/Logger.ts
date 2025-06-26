export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';

export interface LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void;
}

export class ConsoleOutput implements LogOutput {
    write(level: LogLevel, message: string, timestamp: Date): void {
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

export class DOMOutput implements LogOutput {
    private container: HTMLElement | null = null;
    private maxLines: number = 100;

    constructor(containerId: string, maxLines: number = 100) {
        this.container = document.getElementById(containerId);
        this.maxLines = maxLines;
    }

    write(level: LogLevel, message: string, timestamp: Date): void {
        if (!this.container) return;

        const timeStr = timestamp.toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.className = `log-line log-${level}`;
        logLine.textContent = `[${timeStr}] ${message}`;

        this.container.appendChild(logLine);

        // Remove oldest lines if we exceed maxLines
        while (this.container.children.length > this.maxLines) {
            this.container.removeChild(this.container.firstChild!);
        }

        // Auto-scroll to bottom
        this.container.scrollTop = this.container.scrollHeight;
    }
}

export class Logger {
    private outputs: LogOutput[] = [];
    private minLevel: LogLevel = 'all';
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
        this.minLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        if (this.minLevel === 'all') return true;
        if (level === 'all') return true;
        
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const minIndex = levels.indexOf(this.minLevel);
        const currentIndex = levels.indexOf(level);
        return currentIndex >= minIndex;
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