import { Logger, BufferOutput, DOMOutput } from '../src/Logger';

describe('BufferOutput', () => {
    let bufferOutput: BufferOutput;

    beforeEach(() => {
        bufferOutput = new BufferOutput(10, 3); // Small buffer for testing
    });

    test('should store log entries in buffer', () => {
        const timestamp = new Date();
        bufferOutput.write('info', 'Test message', timestamp);
        
        const buffer = bufferOutput.getBuffer();
        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toEqual({
            level: 'info',
            message: 'Test message',
            timestamp: timestamp
        });
    });

    test('should clear first entries when buffer exceeds max capacity', () => {
        // Fill buffer to capacity (10 entries)
        for (let i = 0; i < 10; i++) {
            bufferOutput.write('info', `Message ${i}`, new Date());
        }
        
        expect(bufferOutput.getBufferSize()).toBe(10);
        
        // Add one more entry to trigger clearing (now 11 entries, exceeds 10)
        bufferOutput.write('info', 'Message 10', new Date());
        
        // Should have cleared first 3 entries, leaving 8
        expect(bufferOutput.getBufferSize()).toBe(8);
        
        const buffer = bufferOutput.getBuffer();
        expect(buffer[0].message).toBe('Message 3'); // First entry should now be Message 3
        expect(buffer[7].message).toBe('Message 10'); // Last entry should be Message 10
    });

    test('should filter entries by level', () => {
        bufferOutput.write('info', 'Info message', new Date());
        bufferOutput.write('error', 'Error message', new Date());
        bufferOutput.write('warn', 'Warning message', new Date());
        bufferOutput.write('error', 'Another error', new Date());
        
        const errorEntries = bufferOutput.getEntriesByLevel('error');
        expect(errorEntries).toHaveLength(2);
        expect(errorEntries[0].message).toBe('Error message');
        expect(errorEntries[1].message).toBe('Another error');
    });

    test('should filter entries by timestamp', () => {
        const baseTime = new Date();
        const olderTime = new Date(baseTime.getTime() - 1000);
        const newerTime = new Date(baseTime.getTime() + 1000);
        
        bufferOutput.write('info', 'Old message', olderTime);
        bufferOutput.write('info', 'Base message', baseTime);
        bufferOutput.write('info', 'New message', newerTime);
        
        const recentEntries = bufferOutput.getEntriesSince(baseTime);
        expect(recentEntries).toHaveLength(2);
        expect(recentEntries[0].message).toBe('Base message');
        expect(recentEntries[1].message).toBe('New message');
    });

    test('should clear buffer completely', () => {
        bufferOutput.write('info', 'Test message', new Date());
        expect(bufferOutput.getBufferSize()).toBe(1);
        
        bufferOutput.clearBuffer();
        expect(bufferOutput.getBufferSize()).toBe(0);
    });
});

describe('Logger with BufferOutput', () => {
    let logger: Logger;
    let bufferOutput: BufferOutput;

    beforeEach(() => {
        // Create a custom logger without console output to avoid test noise
        class TestLogger extends Logger {
            constructor() {
                super();
                // Clear the default console output
                (this as any).outputs = [];
            }
        }
        logger = new TestLogger();
        bufferOutput = new BufferOutput();
        logger.addOutput(bufferOutput);
    });

    test('should log messages to buffer output', () => {
        logger.info('Test info message');
        logger.error('Test error message');
        
        const buffer = bufferOutput.getBuffer();
        expect(buffer).toHaveLength(2);
        expect(buffer[0].level).toBe('info');
        expect(buffer[0].message).toBe('Test info message');
        expect(buffer[1].level).toBe('error');
        expect(buffer[1].message).toBe('Test error message');
    });

    test('should handle circular buffer with default settings', () => {
        const defaultBuffer = new BufferOutput(); // 1000 max, 100 clear
        
        // Add 1000 entries directly to buffer (no logger to avoid console output)
        for (let i = 0; i < 1000; i++) {
            defaultBuffer.write('info', `Message ${i}`, new Date());
        }
        
        expect(defaultBuffer.getBufferSize()).toBe(1000);
        
        // Add one more to trigger clearing (now 1001 entries, exceeds 1000)
        defaultBuffer.write('info', 'Message 1000', new Date());
        
        // Should have cleared first 100, leaving 901
        expect(defaultBuffer.getBufferSize()).toBe(901);
        
        const buffer = defaultBuffer.getBuffer();
        expect(buffer[0].message).toBe('Message 100'); // First entry should now be Message 100
        expect(buffer[900].message).toBe('Message 1000'); // Last entry should be Message 1000
    });
});

describe('DOMOutput basic functionality', () => {
    test('should create DOMOutput instance without DOM', () => {
        // Test that DOMOutput can be instantiated (constructor won't fail if element doesn't exist)
        const domOutput = new DOMOutput('non-existent-container');
        expect(domOutput).toBeInstanceOf(DOMOutput);
        
        // Test that calling methods on instance with no container doesn't throw
        expect(() => {
            domOutput.write('info', 'Test message', new Date());
            domOutput.refreshFilter();
            domOutput.clearAll();
        }).not.toThrow();
    });

    test('should not store entries when no container exists', () => {
        const domOutput = new DOMOutput('non-existent-container');
        
        // Add entries (should not be stored since no container)
        domOutput.write('debug', 'Debug message', new Date());
        domOutput.write('info', 'Info message', new Date());
        
        // Access private allEntries property for testing
        const allEntries = (domOutput as any).allEntries;
        expect(allEntries).toHaveLength(0);
    });

    test('should store entry data when container exists', () => {
        // Mock document.getElementById to return a dummy element
        const mockContainer = { innerHTML: '', appendChild: jest.fn(), scrollTop: 0, scrollHeight: 100 };
        const originalGetElementById = global.document?.getElementById;
        
        // Mock document if it doesn't exist
        if (typeof document === 'undefined') {
            (global as any).document = {
                getElementById: jest.fn().mockReturnValue(mockContainer),
                createElement: jest.fn().mockReturnValue({ className: '', textContent: '' })
            };
        } else {
            document.getElementById = jest.fn().mockReturnValue(mockContainer as any);
        }

        const domOutput = new DOMOutput('test-container');
        
        // Add entries
        domOutput.write('debug', 'Debug message', new Date());
        domOutput.write('info', 'Info message', new Date());
        
        // Access private allEntries property for testing
        const allEntries = (domOutput as any).allEntries;
        expect(allEntries).toHaveLength(2);
        expect(allEntries[0].level).toBe('debug');
        expect(allEntries[0].message).toBe('Debug message');
        expect(allEntries[1].level).toBe('info');
        expect(allEntries[1].message).toBe('Info message');

        // Restore original function
        if (originalGetElementById) {
            document.getElementById = originalGetElementById;
        }
    });

    test('should respect maxLines limit', () => {
        const mockContainer = { innerHTML: '', appendChild: jest.fn(), scrollTop: 0, scrollHeight: 100 };
        const originalGetElementById = global.document?.getElementById;
        
        if (typeof document === 'undefined') {
            (global as any).document = {
                getElementById: jest.fn().mockReturnValue(mockContainer),
                createElement: jest.fn().mockReturnValue({ className: '', textContent: '' })
            };
        } else {
            document.getElementById = jest.fn().mockReturnValue(mockContainer as any);
        }

        // Create DOMOutput with small maxLines for testing
        const domOutput = new DOMOutput('test-container', 3);
        
        // Add 5 entries (exceeds maxLines of 3)
        for (let i = 0; i < 5; i++) {
            domOutput.write('info', `Message ${i}`, new Date());
        }
        
        // Should only keep the last 3 entries
        const allEntries = (domOutput as any).allEntries;
        expect(allEntries).toHaveLength(3);
        expect(allEntries[0].message).toBe('Message 2');
        expect(allEntries[1].message).toBe('Message 3');
        expect(allEntries[2].message).toBe('Message 4');

        // Restore original function
        if (originalGetElementById) {
            document.getElementById = originalGetElementById;
        }
    });

    test('should provide debug methods', () => {
        const domOutput = new DOMOutput('non-existent-container');
        
        // Test debug methods don't throw and return expected values
        expect(domOutput.getEntryCount()).toBe(0);
        expect(domOutput.getEnabledLevels()).toEqual([]);
        expect(() => domOutput.debugEntries()).not.toThrow();
    });

    test('should detect enabled levels from checkboxes', () => {
        // Mock checkboxes
        const mockCheckboxes = {
            'logLevel-debug': { checked: true },
            'logLevel-info': { checked: false },
            'logLevel-warn': { checked: true },
            'logLevel-error': { checked: false }
        };

        const originalGetElementById = global.document?.getElementById;
        
        if (typeof document === 'undefined') {
            (global as any).document = {
                getElementById: jest.fn().mockImplementation((id: string) => mockCheckboxes[id as keyof typeof mockCheckboxes] || null),
                createElement: jest.fn().mockReturnValue({ className: '', textContent: '' })
            };
        } else {
            document.getElementById = jest.fn().mockImplementation((id: string) => mockCheckboxes[id as keyof typeof mockCheckboxes] || null);
        }

        const domOutput = new DOMOutput('test-container');
        const enabledLevels = domOutput.getEnabledLevels();
        
        expect(enabledLevels).toContain('debug');
        expect(enabledLevels).toContain('warn');
        expect(enabledLevels).not.toContain('info');
        expect(enabledLevels).not.toContain('error');

        // Restore original function
        if (originalGetElementById) {
            document.getElementById = originalGetElementById;
        }
    });
});