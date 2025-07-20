"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.DOMOutput = exports.BufferOutput = exports.ConsoleOutput = void 0;
class ConsoleOutput {
    write(level, message) {
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
class BufferOutput {
    constructor(maxEntries = 1000, clearCount = 100) {
        this.buffer = [];
        this.maxEntries = 1000;
        this.clearCount = 100;
        this.maxEntries = maxEntries;
        this.clearCount = clearCount;
    }
    write(level, message, timestamp) {
        this.buffer.push({ level, message, timestamp });
        // When buffer exceeds max capacity, remove first clearCount entries
        if (this.buffer.length > this.maxEntries) {
            this.buffer.splice(0, this.clearCount);
        }
    }
    getBuffer() {
        return [...this.buffer];
    }
    getBufferSize() {
        return this.buffer.length;
    }
    clearBuffer() {
        this.buffer = [];
    }
    getEntriesByLevel(level) {
        return this.buffer.filter(entry => entry.level === level);
    }
    getEntriesSince(timestamp) {
        return this.buffer.filter(entry => entry.timestamp >= timestamp);
    }
}
exports.BufferOutput = BufferOutput;
class DOMOutput {
    constructor(containerId, maxLines = 100) {
        this.container = null;
        this.maxLines = 100;
        this.allEntries = [];
        this.container = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
        this.maxLines = maxLines;
    }
    write(level, message, timestamp) {
        if (!this.container)
            return;
        // Store the entry data (not DOM elements) for filtering
        this.allEntries.push({ level, message, timestamp });
        // Remove oldest entries if we exceed maxLines
        while (this.allEntries.length > this.maxLines) {
            this.allEntries.shift();
        }
        // Refresh the display with current filtering
        this.refreshDisplay();
    }
    refreshDisplay() {
        if (!this.container)
            return;
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
                this.container.appendChild(logLine);
            }
        });
        // Auto-scroll to bottom
        this.container.scrollTop = this.container.scrollHeight;
        // Update buffer size display
        this.updateBufferSizeDisplay();
    }
    getEnabledLevelsFromCheckboxes() {
        const enabledLevels = new Set();
        if (typeof document === 'undefined') {
            return enabledLevels;
        }
        // Check for checkboxes with pattern logLevel-{level}
        const checkboxes = ['debug', 'info', 'warn', 'error'];
        checkboxes.forEach(level => {
            const checkbox = document.getElementById(`logLevel-${level}`);
            if (checkbox && checkbox.checked) {
                enabledLevels.add(level);
            }
        });
        return enabledLevels;
    }
    getTextFilter() {
        var _a;
        if (typeof document === 'undefined') {
            return '';
        }
        const textFilterInput = document.getElementById('logTextFilter');
        return ((_a = textFilterInput === null || textFilterInput === void 0 ? void 0 : textFilterInput.value) === null || _a === void 0 ? void 0 : _a.trim()) || '';
    }
    updateBufferSizeDisplay() {
        var _a, _b;
        if (typeof document === 'undefined') {
            return;
        }
        const bufferSizeElement = document.getElementById('logBufferSize');
        if (!bufferSizeElement) {
            return;
        }
        // Count currently displayed entries
        const displayedCount = ((_b = (_a = this.container) === null || _a === void 0 ? void 0 : _a.children) === null || _b === void 0 ? void 0 : _b.length) || 0;
        // Total entries in buffer
        const totalCount = this.allEntries.length;
        // Update display
        bufferSizeElement.textContent = `${displayedCount} / ${totalCount}`;
    }
    // Public method to refresh display when filter checkboxes change
    refreshFilter() {
        this.refreshDisplay();
    }
    // Public method to clear all entries
    clearAll() {
        this.allEntries = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    // Debug methods to help diagnose filtering issues
    getEntryCount() {
        return this.allEntries.length;
    }
    getEnabledLevels() {
        return Array.from(this.getEnabledLevelsFromCheckboxes());
    }
    debugEntries() {
        console.log('DOMOutput Debug:');
        console.log('- Container exists:', !!this.container);
        console.log('- Entry count:', this.allEntries.length);
        console.log('- Enabled levels:', this.getEnabledLevels());
        console.log('- Entries:', this.allEntries);
    }
}
exports.DOMOutput = DOMOutput;
class Logger {
    constructor() {
        this.outputs = [];
        this.enabledLevels = new Set(['all']);
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
        this.enabledLevels = new Set([level]);
    }
    setEnabledLevels(levels) {
        this.enabledLevels = new Set(levels);
    }
    enableLevel(level) {
        this.enabledLevels.add(level);
    }
    disableLevel(level) {
        this.enabledLevels.delete(level);
    }
    getEnabledLevels() {
        return Array.from(this.enabledLevels);
    }
    shouldLog(level) {
        if (this.enabledLevels.has('all'))
            return true;
        if (level === 'all')
            return true;
        // If 'all' is not enabled, check if this specific level is enabled
        if (this.enabledLevels.has(level))
            return true;
        // Legacy support: if only one level is enabled and it's not 'all',
        // treat it as a minimum level threshold
        if (this.enabledLevels.size === 1) {
            const singleLevel = Array.from(this.enabledLevels)[0];
            if (singleLevel !== 'all') {
                const levels = ['debug', 'info', 'warn', 'error'];
                const minIndex = levels.indexOf(singleLevel);
                const currentIndex = levels.indexOf(level);
                return currentIndex >= minIndex;
            }
        }
        return false;
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
    /**
     * Logs tower state changes with detailed information about what changed.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @param source - Source identifier for the update (e.g., "sendTowerState", "tower response")
     * @param enableDetailedLogging - Whether to include detailed change descriptions
     */
    logTowerStateChange(oldState, newState, source, enableDetailedLogging = false) {
        this.info(`Tower state updated from ${source}`, '[TowerState]');
        if (enableDetailedLogging) {
            const changes = this.computeStateChanges(oldState, newState);
            if (changes.length > 0) {
                this.debug(`State changes: ${changes.join(', ')}`, '[TowerState]');
            }
            else {
                this.debug('No changes detected in state update', '[TowerState]');
            }
        }
    }
    /**
     * Computes the differences between two tower states for logging purposes.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @returns Array of human-readable change descriptions
     */
    computeStateChanges(oldState, newState) {
        const changes = [];
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
                if (oldLight.effect !== newLight.effect) {
                    changes.push(`${layerNames[layerIndex]} light ${lightIndex}: effect ${oldLight.effect} → ${newLight.effect}`);
                }
                if (oldLight.loop !== newLight.loop) {
                    changes.push(`${layerNames[layerIndex]} light ${lightIndex}: loop ${oldLight.loop} → ${newLight.loop}`);
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
exports.Logger = Logger;
Logger.instance = null;
// Export singleton instance for easy use
exports.logger = Logger.getInstance();
//# sourceMappingURL=udtLogger.js.map