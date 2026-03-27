"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TowerEmulatorAdapter_1 = require("../examples/controller/TowerEmulatorAdapter");
describe('TowerEmulatorAdapter', () => {
    afterEach(() => {
        jest.useRealTimers();
    });
    test('emits an initial tower state response after connect', async () => {
        jest.useFakeTimers();
        const adapter = new TowerEmulatorAdapter_1.TowerEmulatorAdapter();
        const responses = [];
        adapter.onCharacteristicValueChanged((data) => {
            responses.push(data);
        });
        await adapter.connect('ReturnToDarkTower', []);
        jest.runOnlyPendingTimers();
        expect(responses).toHaveLength(2);
        expect(responses[0]).toBeInstanceOf(Uint8Array);
        expect(responses[0]).toHaveLength(20);
        expect(responses[0][0]).toBe(0x00);
        expect(responses[1]).toHaveLength(5);
        expect(responses[1][0]).toBe(0x07);
        await adapter.cleanup();
    });
});
//# sourceMappingURL=TowerEmulatorAdapter.test.js.map