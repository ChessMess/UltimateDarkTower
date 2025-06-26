"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.DOMOutput = exports.ConsoleOutput = void 0;
class ConsoleOutput {
    write(level, message, timestamp) {
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
exports.ConsoleOutput = ConsoleOutput;
class DOMOutput {
    constructor(containerId, maxLines = 100) {
        this.container = null;
        this.maxLines = 100;
        this.container = document.getElementById(containerId);
        this.maxLines = maxLines;
    }
    write(level, message, timestamp) {
        if (!this.container)
            return;
        const timeStr = timestamp.toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.className = `log-line log-${level}`;
        logLine.textContent = `[${timeStr}] ${message}`;
        this.container.appendChild(logLine);
        // Remove oldest lines if we exceed maxLines
        while (this.container.children.length > this.maxLines) {
            this.container.removeChild(this.container.firstChild);
        }
        // Auto-scroll to bottom
        this.container.scrollTop = this.container.scrollHeight;
    }
}
exports.DOMOutput = DOMOutput;
class Logger {
    constructor() {
        this.outputs = [];
        this.minLevel = 'all';
        // Default to console output
        this.outputs.push(new ConsoleOutput());
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    addOutput(output) {
        this.outputs.push(output);
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    shouldLog(level) {
        if (this.minLevel === 'all')
            return true;
        if (level === 'all')
            return true;
        const levels = ['debug', 'info', 'warn', 'error'];
        const minIndex = levels.indexOf(this.minLevel);
        const currentIndex = levels.indexOf(level);
        return currentIndex >= minIndex;
    }
    log(level, message, context) {
        if (!this.shouldLog(level))
            return;
        const contextPrefix = context ? `${context} ` : '';
        const finalMessage = `${contextPrefix}${message}`;
        const timestamp = new Date();
        this.outputs.forEach(output => {
            try {
                output.write(level, finalMessage, timestamp);
            }
            catch (error) {
                console.error('Logger output error:', error);
            }
        });
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
}
exports.Logger = Logger;
Logger.instance = null;
// Export singleton instance for easy use
exports.logger = Logger.getInstance();
//# sourceMappingURL=Logger.js.map