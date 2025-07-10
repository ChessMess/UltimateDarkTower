import UltimateDarkTower, {
  type TowerSide,
  type TowerLevels,
  type DoorwayLight,
  type LedgeLight,
  type BaseLight,
  type BaseLightLevel,
  type Lights,
  type SealIdentifier,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
  LIGHT_EFFECTS
} from '../../src';
import { logger, DOMOutput, ConsoleOutput } from '../../src/Logger';

const Tower = new UltimateDarkTower();

// Global reference to shared DOM output for filtering
let sharedDOMOutput: DOMOutput;

// Setup loggers with DOM output after DOM is ready
const initializeLogger = () => {
  // Create single shared DOM output with 1000 max lines
  sharedDOMOutput = new DOMOutput('log-container', 1000);

  // Configure Tower to use both console and shared DOM output
  Tower.setLoggerOutputs([new ConsoleOutput(), sharedDOMOutput]);

  // Enable detailed logging to see all [UDT] messages
  Tower.logDetail = true;

  // Configure TowerController logger to use the same shared DOM output
  logger.addOutput(sharedDOMOutput);
  logger.info('Logger initialized with DOM output', '[TC]');

  // Expose shared DOM output instance globally after creation
  (window as any).sharedDOMOutput = sharedDOMOutput;
  // Keep old names for backwards compatibility
  (window as any).towerDOMOutput = sharedDOMOutput;
  (window as any).loggerDOMOutput = sharedDOMOutput;
};

// Initialize logger when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLogger);
} else {
  initializeLogger();
}

// Expose constants globally for the inline script
(window as any).TOWER_AUDIO_LIBRARY = TOWER_AUDIO_LIBRARY;
(window as any).TOWER_LIGHT_SEQUENCES = TOWER_LIGHT_SEQUENCES;
(window as any).LIGHT_EFFECTS = LIGHT_EFFECTS;

// Expose Tower instance globally so HTML can access batteryNotifyOnValueChangeOnly
(window as any).Tower = Tower;
// Expose Tower instance and logger globally
(window as any).Tower = Tower;
(window as any).logger = logger;

// skull drop callback
const updateSkullDropCount = (count: number) => {
  const el = document.getElementById("skull-count");
  if (el) {
    el.innerText = count.toString();
  }
}
Tower.onSkullDrop = updateSkullDropCount;

async function connectToTower() {
  logger.info("Attempting to connect to tower...", '[TC]');
  try {
    await Tower.connect();
  } catch (error) {
    logger.error(`Connection failed: ${error}`, '[TC]');
  }
}

const onTowerConnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Connected"
    el.style.background = 'rgb(2 255 14 / 30%)';
  }
  logger.info("Tower connected successfully", '[TC]');

  // Configure battery notification settings
  Tower.batteryNotifyFrequency = 1000;
  // Apply the UI battery filter setting
  const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]') as NodeListOf<HTMLInputElement>;
  const selectedValue = Array.from(batteryFilterRadios).find(radio => radio.checked)?.value;
  Tower.batteryNotifyOnValueChangeOnly = selectedValue === 'changes';

  // Initialize battery trend display
  updateBatteryTrend();
}
Tower.onTowerConnect = onTowerConnected;

const onTowerDisconnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Disconnected";
    el.style.background = 'rgb(255 1 1 / 30%)';
  }
  logger.warn("Tower disconnected", '[TC]');
}
Tower.onTowerDisconnect = onTowerDisconnected;

async function calibrate() {
  if (!Tower.isConnected) {
    return;
  }
  await Tower.calibrate();
  const el = document.getElementById("calibrating-message");
  if (el) {
    el.classList.remove("hide");
  }
}

const onCalibrationComplete = () => {
  const el = document.getElementById("calibrating-message");
  if (el) {
    el.classList.add("hide");
  }

  // Auto-refresh glyph positions after calibration
  logger.info("Calibration complete", '[TC]');

  // Wait a bit longer for calibration to fully complete, then refresh
  setTimeout(() => {
    try {
      if (typeof (window as any).refreshGlyphPositions === 'function') {
        (window as any).refreshGlyphPositions();
        logger.info("Glyph positions refreshed after calibration", '[TC]');
      } else {
        logger.warn("refreshGlyphPositions function not available", '[TC]');
      }
    } catch (error) {
      logger.error("Error refreshing glyph positions after calibration: " + error, '[TC]');
    }
  }, 1000);
}
Tower.onCalibrationComplete = onCalibrationComplete;

const updateBatteryTrend = () => {
  const trendElement = document.getElementById("batteryTrend");
  if (!trendElement) return;

  const currentBatteryPercent = Tower.currentBatteryPercent;
  const previousBatteryPercent = Tower.previousBatteryPercent;

  // Skip trend update if we don't have previous data yet
  if (previousBatteryPercent === 0) {
    trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">→</span>';
    return;
  }

  if (currentBatteryPercent > previousBatteryPercent) {
    // Battery increased - green up arrow
    trendElement.innerHTML = '<span style="color: #10b981; font-size: 16px;">↑</span>';
  } else if (currentBatteryPercent < previousBatteryPercent) {
    // Battery decreased - yellow down arrow
    trendElement.innerHTML = '<span style="color: #fbbf24; font-size: 16px;">↓</span>';
  } else {
    // Battery same - light grey right arrow
    trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">→</span>';
  }
}

const onBatteryLevelNotify = (millivolts: number) => {
  const el = document.getElementById("battery");
  if (el) {
    el.innerText = Tower.milliVoltsToPercentage(millivolts).toString();
  }

  // Update battery trend after battery display is updated
  updateBatteryTrend();
}
Tower.onBatteryLevelNotify = onBatteryLevelNotify;

async function resetSkullCount() {
  if (!Tower.isConnected) {
    return;
  }
  Tower.resetTowerSkullCount();
  updateSkullDropCount(0);
}

const playSound = () => {
  const select = document.getElementById("sounds") as HTMLInputElement;
  Tower.playSound(Number(select.value));
}

const overrides = () => {
  const select = document.getElementById("lightOverrideDropDown") as HTMLInputElement;
  Tower.lightOverrides(Number(select.value));
}

const rotate = () => {
  const top = document.getElementById("top") as HTMLInputElement;
  const middle = document.getElementById("middle") as HTMLInputElement;
  const bottom = document.getElementById("bottom") as HTMLInputElement;
  const sound = document.getElementById("sounds") as HTMLInputElement;
  Tower.Rotate(
    top.value as TowerSide,
    middle.value as TowerSide,
    bottom.value as TowerSide, Number(sound.value)
  );
}

const randomizeLevels = () => {
  const select = document.getElementById("randomLevels") as HTMLSelectElement;
  const levelValue = parseInt(select.value);

  if (levelValue === -1) {
    logger.warn("No level selected for randomization", '[TC]');
    return;
  }

  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[TC]');
    return;
  }

  Tower.randomRotateLevels(levelValue);
}

const breakSeal = async () => {
  const select = document.getElementById("sealSelect") as HTMLSelectElement;
  const sealValue = select.value;

  if (!sealValue) {
    logger.warn("No seal selected", '[TC]');
    return;
  }

  // Check if we're in timeout period
  if (breakSealTimeout !== null) {
    logger.warn("Break seal is in progress. Please wait before breaking another seal.", '[TC]');
    return;
  }

  // Map seal names to SealIdentifier objects
  const sealMap: { [key: string]: SealIdentifier } = {
    "North Top": { side: 'north', level: 'top' },
    "East Top": { side: 'east', level: 'top' },
    "South Top": { side: 'south', level: 'top' },
    "West Top": { side: 'west', level: 'top' },
    "North Middle": { side: 'north', level: 'middle' },
    "East Middle": { side: 'east', level: 'middle' },
    "South Middle": { side: 'south', level: 'middle' },
    "West Middle": { side: 'west', level: 'middle' },
    "North Bottom": { side: 'north', level: 'bottom' },
    "East Bottom": { side: 'east', level: 'bottom' },
    "South Bottom": { side: 'south', level: 'bottom' },
    "West Bottom": { side: 'west', level: 'bottom' }
  };

  const sealIdentifier = sealMap[sealValue];
  if (sealIdentifier) {
    // Clear checkboxes first, before sending tower command
    clearAllLightCheckboxes();

    await Tower.breakSeal(sealIdentifier);
    logger.info(`Broke seal at ${sealIdentifier.level}-${sealIdentifier.side}`, '[TC]');

    // Update the visual seal grid
    updateSealGrid(sealIdentifier, true);

    // Start cooldown and disable button
    startBreakSealCooldown();
  }
}

const clearAllLightCheckboxes = () => {
  // Unselect all light checkboxes
  const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]') as NodeListOf<HTMLInputElement>;
  allLightCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    checkbox.removeAttribute('data-light-style');
  });
}

const allLightsOn = () => {
  // Check all light checkboxes
  const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]') as NodeListOf<HTMLInputElement>;
  allLightCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
  });

  // Send the light command
  lights();
}

const allLightsOff = () => {
  // Uncheck all light checkboxes
  clearAllLightCheckboxes();

  // Send the light command (all lights off)
  lights();
}

const clearAllLights = async () => {
  // Clear checkboxes first, before sending tower command
  clearAllLightCheckboxes();

  // Create lights object with all lights set to off
  const allLightsOff: Lights = {
    doorway: [
      { position: 'north', level: 'top', style: 'off' },
      { position: 'north', level: 'middle', style: 'off' },
      { position: 'north', level: 'bottom', style: 'off' },
      { position: 'east', level: 'top', style: 'off' },
      { position: 'east', level: 'middle', style: 'off' },
      { position: 'east', level: 'bottom', style: 'off' },
      { position: 'south', level: 'top', style: 'off' },
      { position: 'south', level: 'middle', style: 'off' },
      { position: 'south', level: 'bottom', style: 'off' },
      { position: 'west', level: 'top', style: 'off' },
      { position: 'west', level: 'middle', style: 'off' },
      { position: 'west', level: 'bottom', style: 'off' }
    ],
    ledge: [
      { position: 'north', style: 'off' },
      { position: 'east', style: 'off' },
      { position: 'south', style: 'off' },
      { position: 'west', style: 'off' }
    ],
    base: [
      { position: { side: 'north', level: 'top' }, style: 'off' },
      { position: { side: 'north', level: 'bottom' }, style: 'off' },
      { position: { side: 'east', level: 'top' }, style: 'off' },
      { position: { side: 'east', level: 'bottom' }, style: 'off' },
      { position: { side: 'south', level: 'top' }, style: 'off' },
      { position: { side: 'south', level: 'bottom' }, style: 'off' },
      { position: { side: 'west', level: 'top' }, style: 'off' },
      { position: { side: 'west', level: 'bottom' }, style: 'off' }
    ]
  };

  await Tower.Lights(allLightsOff);
  logger.info("All lights cleared", '[TC]');

  // Reset all broken seals and update the visual grid
  Tower.resetBrokenSeals();
  resetSealGrid();

  // Reset the dropdown to default selection
  const sealSelect = document.getElementById("sealSelect") as HTMLSelectElement;
  if (sealSelect) {
    sealSelect.value = "";
  }
}

const singleLight = (el: HTMLInputElement) => {
  let style: string = "off";
  if (el.checked) {
    const ls = document.getElementById("lightStyles") as HTMLSelectElement;
    if (ls && ls.selectedIndex >= 0) {
      style = ls.options[ls.selectedIndex].innerHTML;
    }
  }
  el.setAttribute('data-light-style', style);
  lights();
}

const lights = () => {
  // Get the currently selected light style from the dropdown
  const lightStyleSelect = document.getElementById("lightStyles") as HTMLSelectElement;
  const selectedLightStyle = lightStyleSelect?.options[lightStyleSelect.selectedIndex]?.textContent || "off";

  // Apply the selected style to all checked lights
  const allCheckedLights = document.querySelectorAll('input[type="checkbox"][data-light-type]:checked') as NodeListOf<HTMLInputElement>;
  allCheckedLights.forEach(checkbox => {
    checkbox.setAttribute('data-light-style', selectedLightStyle);
  });

  const doorwayLights: Array<DoorwayLight> = getDoorwayLights();
  const ledgeLights: Array<LedgeLight> = getLedgeLights();
  const baseLights: Array<BaseLight> = getBaseLights();
  const allLights = { doorway: doorwayLights, ledge: ledgeLights, base: baseLights };
  Tower.Lights(allLights);
}

const getDoorwayLights = (): Array<DoorwayLight> => {
  const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked'
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  const ls = document.getElementById("lightStyles") as HTMLSelectElement;
  const selectedLightStyle = ls?.options[ls.selectedIndex]?.textContent || "off";
  let doorwayCmds: Array<DoorwayLight> = [];
  Array.from(checked).forEach(cb => {
    let { lightSide, lightStyle, lightLevel } = getDataAttributes(cb);
    if (lightStyle !== selectedLightStyle) {
      lightStyle = selectedLightStyle;
      cb.setAttribute('data-light-style', lightStyle);
    }
    if (lightSide && lightLevel && lightStyle) {
      doorwayCmds.push({ position: lightSide as TowerSide, level: lightLevel as TowerLevels, style: lightStyle });
    }
  });
  return doorwayCmds;
}

const getLedgeLights = (): Array<LedgeLight> => {
  const qs = 'input[type="checkbox"][data-light-type="ledge"]:checked';
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  let ledgeCmds: Array<LedgeLight> = [];
  Array.from(checked).forEach(cb => {
    const { lightSide, lightStyle } = getDataAttributes(cb);
    if (lightSide && lightStyle) {
      ledgeCmds.push({ position: lightSide as TowerSide, style: lightStyle });
    }
  });
  return ledgeCmds;
}

const getBaseLights = (): Array<BaseLight> => {
  const qs = 'input[type="checkbox"][data-light-type="base"]:checked';
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  let baseCmds: Array<BaseLight> = [];
  Array.from(checked).forEach(cb => {
    const { lightSide, lightStyle, lightBaseLocation } = getDataAttributes(cb);
    if (lightSide && lightStyle && lightBaseLocation) {
      baseCmds.push({
        position: {
          side: lightSide as TowerSide,
          level: lightBaseLocation as BaseLightLevel
        },
        style: lightStyle
      });
    }
  });

  return baseCmds;
}

const getDataAttributes = (el: HTMLElement) => {
  const lightType = el.getAttribute('data-light-type');
  const lightSide = el.getAttribute('data-light-location');
  const lightLevel = el.getAttribute('data-light-level');
  const lightBaseLocation = el.getAttribute('data-light-base-location');
  const lightStyle = el.getAttribute('data-light-style');

  return ({
    lightSide: lightSide,
    lightLevel: lightLevel,
    lightBaseLocation: lightBaseLocation,
    lightStyle: lightStyle,
    lightType: lightType,
  });
}

/**
 * Updates the visual representation of a specific seal in the grid
 * @param seal - The seal to update
 * @param isBroken - Whether the seal is broken or not
 */
const updateSealGrid = (seal: SealIdentifier, isBroken: boolean) => {
  const sealSquare = document.querySelector(`[data-seal-level="${seal.level}"][data-seal-side="${seal.side}"]`) as HTMLElement;
  if (sealSquare) {
    if (isBroken) {
      sealSquare.classList.add('broken');
    } else {
      sealSquare.classList.remove('broken');
    }
  }
}

/**
 * Resets all seals in the visual grid to their default (unbroken) state
 */
const resetSealGrid = () => {
  const allSealSquares = document.querySelectorAll('.seal-square') as NodeListOf<HTMLElement>;
  allSealSquares.forEach(square => {
    square.classList.remove('broken');
  });
}

// Global variable to track break seal timeout
let breakSealTimeout: number | null = null;

/**
 * Starts the break seal cooldown and manages button state
 */
const startBreakSealCooldown = () => {
  const breakSealButton = document.getElementById("breakSealButton") as HTMLButtonElement;

  // Disable the button and update text
  if (breakSealButton) {
    breakSealButton.disabled = true;
    breakSealButton.style.opacity = "0.5";
  }

  // Start 10-second timeout
  logger.info("Break seal cooldown started (10 seconds)", '[TC]');
  breakSealTimeout = window.setTimeout(() => {
    breakSealTimeout = null;

    // Re-enable the button and restore text
    if (breakSealButton) {
      breakSealButton.disabled = false;
      breakSealButton.textContent = "Break Seal";
      breakSealButton.style.opacity = "1";
    }

    logger.info("Break seal cooldown ended", '[TC]');
  }, 10000);
}

/**
 * Handles clicks on seal squares in the grid
 * @param element - The clicked seal square element
 */
const sealSquareClick = (element: HTMLElement) => {
  const level = element.getAttribute('data-seal-level');
  const side = element.getAttribute('data-seal-side');

  if (!level || !side) {
    logger.warn("Invalid seal square data", '[TC]');
    return;
  }

  const sealSelect = document.getElementById("sealSelect") as HTMLSelectElement;
  const isCurrentlyBroken = element.classList.contains('broken');

  if (isCurrentlyBroken) {
    // Seal is already broken - reset it (no timeout needed for resets)
    element.classList.remove('broken');

    // Remove from Tower's broken seals tracking
    const sealKey = `${level}-${side}`;
    (Tower as any).brokenSeals.delete(sealKey);

    // Reset dropdown to default
    if (sealSelect) {
      sealSelect.value = "";
    }

    logger.info(`Reset seal at ${level}-${side}`, '[TC]');
  } else {
    // Seal is not broken - check if we're in timeout period
    if (breakSealTimeout !== null) {
      logger.warn("Break seal is on cooldown. Please wait before breaking another seal.", '[TC]');
      return;
    }

    // Break the seal
    // Capitalize first letter for dropdown value format
    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const dropdownValue = `${capitalizeFirst(side)} ${capitalizeFirst(level)}`;

    // Update the dropdown selection
    if (sealSelect) {
      sealSelect.value = dropdownValue;
    }

    // Trigger the break seal function
    breakSeal();
  }
}

// Expose functions globally for HTML onclick handlers
(window as any).connectToTower = connectToTower;
(window as any).calibrate = calibrate;
(window as any).resetSkullCount = resetSkullCount;
(window as any).playSound = playSound;
(window as any).singleLight = singleLight;
(window as any).lights = lights;
(window as any).overrides = overrides;
(window as any).rotate = rotate;
(window as any).breakSeal = breakSeal;
(window as any).clearAllLights = clearAllLights;
(window as any).clearAllLightCheckboxes = clearAllLightCheckboxes;
(window as any).allLightsOn = allLightsOn;
(window as any).allLightsOff = allLightsOff;
(window as any).randomizeLevels = randomizeLevels;
(window as any).sealSquareClick = sealSquareClick;