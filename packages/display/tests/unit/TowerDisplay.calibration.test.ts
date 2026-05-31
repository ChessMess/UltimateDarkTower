/** @jest-environment jsdom */
import { TowerDisplay } from '../../src/TowerDisplay';
import { createDefaultTowerState, TOWER_COMMANDS } from 'ultimatedarktower';
import type { TowerState } from 'ultimatedarktower';

describe('TowerDisplay calibration command', () => {
  it('runs the calibration command to a fully-calibrated state and fires onCalibrationComplete once', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onCalibrationComplete = jest.fn();
    const display = new TowerDisplay({ container, renderers: 'readout', onCalibrationComplete });

    display.applyState({ ...createDefaultTowerState(), command: TOWER_COMMANDS.calibration });

    expect(onCalibrationComplete).toHaveBeenCalledTimes(1);
    const finalState = onCalibrationComplete.mock.calls[0][0] as TowerState;
    expect(finalState.drum.every((d) => d.calibrated)).toBe(true);
    expect(finalState.drum.every((d) => d.position === 0)).toBe(true);

    display.dispose();
  });

  it('does not fire onCalibrationComplete for a normal (non-command) state', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onCalibrationComplete = jest.fn();
    const display = new TowerDisplay({ container, renderers: 'readout', onCalibrationComplete });

    display.applyState(createDefaultTowerState());

    expect(onCalibrationComplete).not.toHaveBeenCalled();
    display.dispose();
  });
});
