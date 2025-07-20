import UltimateDarkTower, {
  type TowerSide,
  type TowerLevels,
  type DoorwayLight,
  type LedgeLight,
  type BaseLight,
  type BaseLightLevel,
  type Lights,
  type SealIdentifier,
  type Glyphs,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
  LIGHT_EFFECTS,
  GLYPHS
} from '../../src';
import { logger, DOMOutput, ConsoleOutput } from '../../src/udtLogger';
import { rtdt_pack_state, rtdt_unpack_state, type TowerState } from '../../src/udtTowerState';
import { createDefaultTowerState } from '../../src/udtHelpers';

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
(window as any).GLYPHS = GLYPHS;

// Expose functions from udtTowerState.ts globally
(window as any).rtdt_pack_state = rtdt_pack_state;
(window as any).rtdt_unpack_state = rtdt_unpack_state;
(window as any).createDefaultTowerState = createDefaultTowerState;

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
  if (selectedValue === 'none') {
    Tower.batteryNotifyEnabled = false;
  } else {
    Tower.batteryNotifyEnabled = true;
    Tower.batteryNotifyOnValueChangeOnly = selectedValue === 'changes';
  }

  // Initialize battery trend display
  updateBatteryTrend();

  // Initialize calibration status display
  updateCalibrationStatus();
}
Tower.onTowerConnect = onTowerConnected;

const onTowerDisconnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Disconnected";
    el.style.background = 'rgb(255 1 1 / 30%)';
  }
  logger.warn("Tower disconnected", '[TC]');

  // Update calibration status for disconnected state
  updateCalibrationStatus();
}
Tower.onTowerDisconnect = onTowerDisconnected;

async function calibrate() {
  if (!Tower.isConnected) {
    return;
  }
  await Tower.calibrate();
  const el = document.getElementById("calibrating-message");
  if (el) {
    el.classList.remove("hidden");
  }
}

const onCalibrationComplete = () => {
  const el = document.getElementById("calibrating-message");
  if (el) {
    el.classList.add("hidden");
  }

  // Auto-refresh glyph positions after calibration
  logger.info("Calibration complete", '[TC]');

  // Update calibration status display
  updateCalibrationStatus();

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

const updateCalibrationStatus = () => {
  const statusElement = document.getElementById("calibration-status");
  const iconElement = document.getElementById("calibration-icon");

  if (!statusElement || !iconElement) return;

  if (!Tower.isConnected) {
    statusElement.innerText = "Unknown";
    statusElement.style.color = "#9ca3af"; // gray
    iconElement.innerHTML = '<span style="color: #9ca3af; font-size: 16px;">?</span>';
    return;
  }

  if (Tower.isCalibrated) {
    statusElement.innerText = "Calibrated";
    statusElement.style.color = "#10b981"; // green
    iconElement.innerHTML = '<span style="color: #10b981; font-size: 16px;">✓</span>';
  } else {
    statusElement.innerText = "Not Calibrated";
    statusElement.style.color = "#ef4444"; // red
    iconElement.innerHTML = '<span style="color: #ef4444; font-size: 16px;">✗</span>';
  }
}

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

// Tab switching functionality
const switchTab = (tabName: string) => {
  // Hide all tab contents
  const allTabContents = document.querySelectorAll('.tower-tab-content');
  allTabContents.forEach(content => {
    content.classList.remove('tower-tab-content-active');
  });

  // Remove active class from all tab buttons
  const allTabButtons = document.querySelectorAll('.tower-tab-button');
  allTabButtons.forEach(button => {
    button.classList.remove('tower-tab-active');
  });

  // Show selected tab content
  const selectedContent = document.getElementById(`${tabName}-content`);
  if (selectedContent) {
    selectedContent.classList.add('tower-tab-content-active');
  }

  // Add active class to selected tab button
  const selectedButton = document.getElementById(`${tabName}-tab`);
  if (selectedButton) {
    selectedButton.classList.add('tower-tab-active');
  }
}

// Glyph management functionality with light tracking
const moveGlyph = async () => {
  const glyphSelect = document.getElementById('glyph-select') as HTMLSelectElement;
  const sideSelect = document.getElementById('side-select') as HTMLSelectElement;

  const selectedGlyph = glyphSelect.value;
  const targetSide = sideSelect.value;

  logger.debug(`UI Selection: glyph=${selectedGlyph}, targetSide=${targetSide}`, '[Glyphs]');

  if (!selectedGlyph || !targetSide) {
    logger.warn('Please select a glyph and target side', '[Glyphs]');
    return;
  }

  try {
    // Get current glyph position directly (more reliable than getAllGlyphPositions)
    const currentGlyphPosition = Tower.getGlyphPosition(selectedGlyph as Glyphs);

    if (!currentGlyphPosition) {
      logger.error(`Unable to find current position for ${selectedGlyph} glyph, please perform a calibration first.`, '[Glyphs]');
      return;
    }

    // Get the fixed level for this glyph (glyphs can't change levels)
    const glyphLevel = GLYPHS[selectedGlyph as keyof typeof GLYPHS].level;

    // Calculate rotation needed to move glyph to target position
    const sides = ['north', 'east', 'south', 'west'];
    const currentSideIndex = sides.indexOf(currentGlyphPosition);
    const targetSideIndex = sides.indexOf(targetSide);

    if (currentSideIndex === -1 || targetSideIndex === -1) {
      logger.error('Invalid current or target side', '[Glyphs]');
      return;
    }

    // Calculate clockwise rotation steps needed
    let rotationSteps = (targetSideIndex - currentSideIndex + 4) % 4;

    if (rotationSteps === 0) {
      logger.info(`${selectedGlyph} glyph is already at ${targetSide} position`, '[Glyphs]');
      return;
    }

    // Calculate what drum position will put the selected glyph at the target side
    let targetDrumPosition;
    if (glyphLevel === 'top' || glyphLevel === 'middle' || glyphLevel === 'bottom') {
      // Calculate the drum position needed to put this specific glyph at the target side
      const currentDrumPosition = Tower.getCurrentDrumPosition(glyphLevel);
      const sides = ['north', 'east', 'south', 'west'];

      const currentDrumIndex = sides.indexOf(currentDrumPosition);
      const currentGlyphIndex = sides.indexOf(currentGlyphPosition);
      const targetGlyphIndex = sides.indexOf(targetSide);

      // Debug logging to understand the calculation
      logger.debug(`Move calculation: glyph=${selectedGlyph}, currentGlyphPos=${currentGlyphPosition}, targetSide=${targetSide}, currentDrumPos=${currentDrumPosition}`, '[Glyphs]');

      // Calculate how many steps the glyph needs to move
      let glyphSteps = (targetGlyphIndex - currentGlyphIndex + 4) % 4;

      // Calculate the new drum position
      const newDrumIndex = (currentDrumIndex + glyphSteps) % 4;
      targetDrumPosition = sides[newDrumIndex];

      logger.debug(`Move calculation result: glyphSteps=${glyphSteps}, newDrumIndex=${newDrumIndex}, targetDrumPosition=${targetDrumPosition}`, '[Glyphs]');
    }

    // Set positions for all three drums
    const topPosition = glyphLevel === 'top' ? targetDrumPosition : Tower.getCurrentDrumPosition('top');
    const middlePosition = glyphLevel === 'middle' ? targetDrumPosition : Tower.getCurrentDrumPosition('middle');
    const bottomPosition = glyphLevel === 'bottom' ? targetDrumPosition : Tower.getCurrentDrumPosition('bottom');

    logger.info(`Moving ${selectedGlyph} glyph from ${currentGlyphPosition} to ${targetSide} by rotating ${glyphLevel} level (${rotationSteps} steps clockwise)`, '[Glyphs]');

    // Execute the rotation with all three drum positions
    await Tower.Rotate(topPosition as TowerSide, middlePosition as TowerSide, bottomPosition as TowerSide);

    // The Tower.Rotate() command turns off all lights, so we need to restore them
    // Wait a moment for rotation to complete, then restore all lights and refresh UI
    setTimeout(async () => {
      try {
        // Refresh glyph positions (this will also restore visual light states based on glyph tracking)
        refreshGlyphPositions();

        // Restore all lights on the physical tower based on current glyph positions
        const allDoorwayLights = getCurrentDoorwayLights();
        if (allDoorwayLights.length > 0) {
          logger.info(`About to restore ${allDoorwayLights.length} lights: ${JSON.stringify(allDoorwayLights)}`, '[Glyphs]');
          await Tower.Lights({ doorway: allDoorwayLights });
          logger.info(`Successfully restored ${allDoorwayLights.length} lights after glyph movement`, '[Glyphs]');
        } else {
          logger.warn('No lights to restore after glyph movement', '[Glyphs]');
        }
      } catch (error) {
        logger.error('Error restoring lights after glyph move: ' + error, '[Glyphs]');
      }
    }, 1000);

    logger.info(`Successfully moved ${selectedGlyph} glyph to ${targetSide} position`, '[Glyphs]');

  } catch (error) {
    console.error('Error moving glyph:', error);
    logger.error('Error moving glyph: ' + error, '[Glyphs]');
  }
}


const refreshGlyphPositions = () => {
  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[TC]');
    return;
  }

  try {
    // Get current glyph positions from tower
    const positions = Tower.getAllGlyphPositions();

    // Clear all existing glyph displays
    const allGlyphCells = document.querySelectorAll('.glyph-cell');
    allGlyphCells.forEach(cell => {
      cell.innerHTML = '';
      cell.classList.remove('glyph-lit');
    });

    // Update display with current positions
    Object.entries(positions).forEach(([glyphName, side]) => {
      if (side) {
        // Get the level from the GLYPHS constant since getAllGlyphPositions only returns the side
        const glyphLevel = GLYPHS[glyphName as keyof typeof GLYPHS].level;
        const cellId = `glyph-${glyphLevel}-${side}`;
        const cell = document.getElementById(cellId);
        if (cell) {
          // Add glyph icon
          const img = document.createElement('img');
          img.src = `../assets/glyph_${glyphName}.svg`;
          img.alt = glyphName;
          cell.appendChild(img);
        }
      }
    });

    // Restore visual light states based on glyph light tracking
    // Add glyph-lit class to any glyph that has a light
    for (const glyphName of glyphLightStates) {
      const currentPosition = Tower.getGlyphPosition(glyphName as any);
      if (currentPosition) {
        const level = GLYPHS[glyphName as keyof typeof GLYPHS].level;
        const cellId = `glyph-${level}-${currentPosition}`;
        const cell = document.getElementById(cellId);
        if (cell && cell.querySelector('img')) { // Only if cell has a glyph (img element)
          cell.classList.add('glyph-lit');
        }
      }
    }

    logger.info("Glyph positions refreshed", '[TC]');
  } catch (error) {
    logger.error(`Failed to refresh glyph positions: ${error}`, '[TC]');
  }
}

// Log filtering functionality
const filterLogs = () => {
  if (!sharedDOMOutput) {
    logger.warn("DOM output not initialized", '[TC]');
    return;
  }

  const filterSelect = document.getElementById('logFilter') as HTMLSelectElement;
  const selectedLevel = filterSelect?.value || 'all';

  // Use refreshFilter method instead of setFilter
  sharedDOMOutput.refreshFilter();
  logger.info(`Log filter set to: ${selectedLevel}`, '[TC]');
}

const clearLogs = () => {
  if (!sharedDOMOutput) {
    logger.warn("DOM output not initialized", '[TC]');
    return;
  }

  sharedDOMOutput.clearAll();
  logger.info("Logs cleared", '[TC]');
}

// Battery filter functionality
const updateBatteryFilter = () => {
  const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]') as NodeListOf<HTMLInputElement>;
  const selectedValue = Array.from(batteryFilterRadios).find(radio => radio.checked)?.value;

  if (selectedValue) {
    if (selectedValue === 'none') {
      Tower.batteryNotifyEnabled = false;
    } else {
      Tower.batteryNotifyEnabled = true;
      Tower.batteryNotifyOnValueChangeOnly = selectedValue === 'changes';
    }
    logger.info(`Battery filter set to: ${selectedValue}`, '[TC]');
  }
}

// State management functionality
const saveState = () => {
  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[TC]');
    return;
  }

  try {
    const state = Tower.getCurrentTowerState();
    if (!state) {
      logger.warn("No current tower state available", '[TC]');
      return;
    }

    // Create a buffer for the packed state
    const buffer = new Uint8Array(256); // Adjust size as needed
    const success = rtdt_pack_state(buffer, buffer.length, state);

    if (!success) {
      logger.error("Failed to pack tower state", '[TC]');
      return;
    }

    // Convert buffer to array for JSON serialization
    const packedState = Array.from(buffer);

    // Save to localStorage
    localStorage.setItem('towerState', JSON.stringify(packedState));

    // Update UI display
    const stateDisplay = document.getElementById('currentState') as HTMLTextAreaElement;
    if (stateDisplay) {
      stateDisplay.value = JSON.stringify(packedState, null, 2);
    }

    logger.info("Tower state saved", '[TC]');
  } catch (error) {
    logger.error(`Failed to save state: ${error}`, '[TC]');
  }
}

const loadState = async () => {
  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[TC]');
    return;
  }

  try {
    const savedState = localStorage.getItem('towerState');
    if (!savedState) {
      logger.warn("No saved state found", '[TC]');
      return;
    }

    const packedState = JSON.parse(savedState) as number[];
    const buffer = new Uint8Array(packedState);
    const state = rtdt_unpack_state(buffer);

    if (!state) {
      logger.error("Failed to unpack tower state", '[TC]');
      return;
    }

    // Send the state to the tower
    await Tower.sendTowerState(state);
    logger.info("Tower state loaded", '[TC]');

    // Refresh displays
    if (typeof refreshGlyphPositions === 'function') {
      refreshGlyphPositions();
    }
  } catch (error) {
    logger.error(`Failed to load state: ${error}`, '[TC]');
  }
}

const resetState = async () => {
  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[TC]');
    return;
  }

  try {
    // Create a default/empty tower state using the utility function
    const defaultState = createDefaultTowerState();

    // Send the default state to the tower
    await Tower.sendTowerState(defaultState);

    // Clear saved state
    localStorage.removeItem('towerState');

    // Clear UI display
    const stateDisplay = document.getElementById('currentState') as HTMLTextAreaElement;
    if (stateDisplay) {
      stateDisplay.value = '';
    }

    // Reset visual elements
    resetSealGrid();

    // Refresh displays
    if (typeof refreshGlyphPositions === 'function') {
      refreshGlyphPositions();
    }

    logger.info("Tower state reset", '[TC]');
  } catch (error) {
    logger.error(`Failed to reset state: ${error}`, '[TC]');
  }
}

// Initialize dropdowns and UI elements
const initializeUI = () => {
  // Populate sound dropdown
  const soundSelect = document.getElementById('sounds') as HTMLSelectElement;
  if (soundSelect) {
    Object.entries(TOWER_AUDIO_LIBRARY).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = value.value.toString();
      option.textContent = value.name;
      soundSelect.appendChild(option);
    });
  }

  // Populate light styles dropdown (Apply to all lights - should have basic 6 options)
  const lightStyleSelect = document.getElementById('lightStyles') as HTMLSelectElement;
  if (lightStyleSelect) {
    Object.entries(LIGHT_EFFECTS).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key; // Use the key (name) for display instead of numeric value
      lightStyleSelect.appendChild(option);
    });
  }

  // Populate light overrides dropdown (should have advanced sequences)
  const lightOverrideSelect = document.getElementById('lightOverrideDropDown') as HTMLSelectElement;
  if (lightOverrideSelect) {
    Object.entries(TOWER_LIGHT_SEQUENCES).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      lightOverrideSelect.appendChild(option);
    });
  }

  // Set up event listeners for battery filter radio buttons
  const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]') as NodeListOf<HTMLInputElement>;
  batteryFilterRadios.forEach(radio => {
    radio.addEventListener('change', updateBatteryFilter);
  });

  // Initialize calibration status display
  updateCalibrationStatus();
}

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

// LED Testing Functions
const sendLEDTestCommand = async () => {
  try {
    // Get the selected effect and loop setting
    const effectSelect = document.getElementById('led-effect-select') as HTMLSelectElement;
    const loopCheckbox = document.getElementById('led-loop-checkbox') as HTMLInputElement;
    const selectedEffect = parseInt(effectSelect.value);
    const loopEnabled = loopCheckbox.checked;

    // Get all checked LED checkboxes
    const checkedLEDs = document.querySelectorAll('.led-checkbox:checked') as NodeListOf<HTMLInputElement>;

    if (checkedLEDs.length === 0) {
      logger.warn('No LEDs selected for testing', '[LED Testing]');
      return;
    }

    if (!Tower || !Tower.getCurrentTowerState || !Tower.sendTowerState) {
      logger.error('Tower not connected or tower state methods not available', '[LED Testing]');
      return;
    }

    // Get current tower state or create a default state
    let currentState = Tower.getCurrentTowerState();
    if (!currentState) {
      // Create default state if none available
      currentState = createDefaultTowerState();
    }

    // Apply all LED changes to the tower state
    checkedLEDs.forEach(checkbox => {
      const layer = parseInt(checkbox.dataset.layer!);
      const position = parseInt(checkbox.dataset.position!);
      const isValidLightPosition = layer >= 0 && layer < 6 && position >= 0 && position < 4;

      if (isValidLightPosition) {
        currentState.layer[layer].light[position].effect = selectedEffect;
        currentState.layer[layer].light[position].loop = loopEnabled;
        logger.debug(`LED configured: layer=${layer}, position=${position}, effect=${selectedEffect}, loop=${loopEnabled}`, '[LED Testing]');
      }
    });

    // Send the complete updated tower state in a single command
    await Tower.sendTowerState(currentState);
    logger.info(`LED test command sent: ${checkedLEDs.length} LEDs updated, effect=${selectedEffect}, loop=${loopEnabled}`, '[LED Testing]');

  } catch (error) {
    console.error('Error sending LED test command:', error);
    logger.error('Error sending LED test command: ' + error, '[LED Testing]');
  }
};

const clearAllLEDs = async () => {
  try {
    if (!Tower || !Tower.getCurrentTowerState || !Tower.sendTowerState) {
      logger.error('Tower not connected or tower state methods not available', '[LED Testing]');
      return;
    }

    // Get current tower state or create a default state
    let currentState = Tower.getCurrentTowerState();
    if (!currentState) {
      // Create default state if none available
      currentState = createDefaultTowerState();
    }

    // Turn off all LEDs in the tower state
    for (let layer = 0; layer < 6; layer++) {
      for (let position = 0; position < 4; position++) {
        currentState.layer[layer].light[position].effect = 0; // Effect 0 = off
        currentState.layer[layer].light[position].loop = false;
      }
    }

    // Send the complete updated tower state in a single command
    await Tower.sendTowerState(currentState);
    logger.info('All LEDs cleared with single tower state command', '[LED Testing]');

    // Clear all checkboxes
    document.querySelectorAll('.led-checkbox').forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });

  } catch (error) {
    console.error('Error clearing LEDs:', error);
    logger.error('Error clearing LEDs: ' + error, '[LED Testing]');
  }
};

// Log control functions
const updateLogLevel = () => {
  if ((window as any).logger) {
    const checkboxes = document.querySelectorAll('input[id^="logLevel-"]') as NodeListOf<HTMLInputElement>;
    const selectedLevels = Array.from(checkboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);

    if (selectedLevels.length > 0) {
      (window as any).logger.setEnabledLevels(selectedLevels);
    } else {
      // Default to 'all' if nothing is selected
      (window as any).logger.setEnabledLevels(['all']);
    }
  }

  // Refresh DOM output filtering (includes text filter)
  if (sharedDOMOutput) {
    sharedDOMOutput.refreshFilter();
  }
}

const clearLog = () => {
  // Clear shared DOM output
  if (sharedDOMOutput) {
    sharedDOMOutput.clearAll();
  }

  // Fallback to direct container clearing
  const container = document.getElementById("log-container");
  if (container) {
    container.innerHTML = '';
  }

  // Clear the text filter input
  const textFilter = document.getElementById("logTextFilter") as HTMLInputElement;
  if (textFilter) {
    textFilter.value = '';
  }
}

const copyDisplayedLogs = (event: Event) => {
  const logContainer = document.getElementById("log-container");
  if (!logContainer) return;

  // Get all currently displayed log entries
  const logLines = logContainer.querySelectorAll('.log-line');
  if (logLines.length === 0) {
    alert('No log entries to copy');
    return;
  }

  // Extract text content from each log line
  const logText = Array.from(logLines)
    .map(line => line.textContent || '')
    .join('\n');

  // Copy to clipboard
  navigator.clipboard.writeText(logText).then(() => {
    // Optional: Show temporary success feedback
    const button = (event.target as HTMLElement).closest('button');
    if (button) {
      const originalIcon = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check"></i>';
      button.style.backgroundColor = '#10b981';

      setTimeout(() => {
        button.innerHTML = originalIcon;
        button.style.backgroundColor = '';
      }, 1000);
    }
  }).catch(err => {
    console.error('Failed to copy logs: ', err);
    alert('Failed to copy logs to clipboard');
  });
}

const downloadDisplayedLogs = (event: Event) => {
  const logContainer = document.getElementById("log-container");
  if (!logContainer) return;

  // Get all currently displayed log entries
  const logLines = logContainer.querySelectorAll('.log-line');
  if (logLines.length === 0) {
    alert('No log entries to download');
    return;
  }

  // Extract text content from each log line
  const logText = Array.from(logLines)
    .map(line => line.textContent || '')
    .join('\n');

  // Create header with current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  const header = `UltimateDarkTower Log Output - ${dateStr} ${timeStr}\n${'-'.repeat(60)}\n`;

  // Combine header with log content
  const fileContent = header + logText;

  // Create a blob with the log content
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);

  // Create a temporary anchor element for download
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TowerLog.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  // Show temporary success feedback
  const button = (event.target as HTMLElement).closest('button');
  if (button) {
    const originalIcon = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i>';
    button.style.backgroundColor = '#10b981';

    setTimeout(() => {
      button.innerHTML = originalIcon;
      button.style.backgroundColor = '';
    }, 1000);
  }
}

// Enhanced glyph management functions
const getGlyphsFacingDirection = (direction: TowerSide) => {
  try {
    return Tower.getGlyphsFacingDirection(direction);
  } catch (error) {
    console.error('Error getting glyphs facing direction:', error);
    logger.error('Error getting glyphs facing direction: ' + error, '[Glyphs]');
    return [];
  }
};

// Light state tracking - keeps track of which glyphs have lights
const glyphLightStates = new Set(); // Set of glyph names that have lights on

// Helper function to get current doorway lights based on glyph positions and states
const getCurrentDoorwayLights = (): Array<DoorwayLight> => {
  const doorwayLights: Array<DoorwayLight> = [];
  logger.debug(`Getting current doorway lights for ${glyphLightStates.size} lit glyphs`, '[Glyphs]');

  for (const glyphName of glyphLightStates) {
    const currentPosition = Tower.getGlyphPosition(glyphName as any);
    logger.debug(`Glyph ${glyphName} current position: ${currentPosition}`, '[Glyphs]');

    if (currentPosition) {
      const level = GLYPHS[glyphName as keyof typeof GLYPHS].level;
      const lightCommand: DoorwayLight = {
        position: currentPosition,
        level: level as TowerLevels,
        style: 'on'
      };
      doorwayLights.push(lightCommand);
      logger.debug(`Added light command: ${JSON.stringify(lightCommand)}`, '[Glyphs]');
    } else {
      logger.warn(`Could not get position for glyph ${glyphName}`, '[Glyphs]');
    }
  }

  logger.debug(`Total doorway lights to restore: ${doorwayLights.length}`, '[Glyphs]');
  return doorwayLights;
};

// Enhanced toggle glyph light function with full functionality
const toggleGlyphLight = async (element: HTMLElement) => {
  const level = element.getAttribute('data-level');
  const side = element.getAttribute('data-side');
  const position = `${level}-${side}`;

  // Find which glyph is at this position (if any)
  const glyphAtPosition = findGlyphAtPosition(level!, side!);

  // Only proceed with lighting effects if there's a glyph at this position
  if (!glyphAtPosition) {
    // No glyph at this position, just update the side dropdown
    const sideSelect = document.getElementById('side-select') as HTMLSelectElement;
    if (sideSelect) {
      sideSelect.value = side!;
    }
    return; // Exit early, no lighting effects
  }

  // Toggle the light state (only if glyph is present)
  const isLit = element.classList.toggle('glyph-lit');

  // Auto-select dropdowns based on clicked glyph
  const glyphSelect = document.getElementById('glyph-select') as HTMLSelectElement;
  if (glyphSelect) {
    glyphSelect.value = glyphAtPosition;
  }

  // Auto-select the glyph's current position in the side dropdown
  const glyphCurrentSide = Tower.getGlyphPosition(glyphAtPosition as Glyphs);
  if (glyphCurrentSide) {
    const sideSelect = document.getElementById('side-select') as HTMLSelectElement;
    if (sideSelect) {
      sideSelect.value = glyphCurrentSide;
    }
  }

  // Send command to tower to toggle the light
  try {
    const lightEffect = isLit ? 'on' : 'off';

    logger.info(`Toggling light ${lightEffect} for glyph ${glyphAtPosition}`, '[Glyphs]');

    // Update the glyph light tracking
    if (isLit) {
      glyphLightStates.add(glyphAtPosition);
    } else {
      glyphLightStates.delete(glyphAtPosition);
    }

    // Get all current doorway lights based on glyph positions
    const allDoorwayLights = getCurrentDoorwayLights();

    await Tower.Lights({ doorway: allDoorwayLights });
    logger.info(`Successfully updated tower lights. Active lights: ${allDoorwayLights.length}`, '[Glyphs]');

  } catch (error) {
    console.error('Error toggling glyph light:', error);
    logger.error('Error toggling glyph light: ' + error, '[Glyphs]');

    // Revert the visual state and glyph tracking if tower command failed
    element.classList.toggle('glyph-lit');
    if (isLit) {
      glyphLightStates.delete(glyphAtPosition);
    } else {
      glyphLightStates.add(glyphAtPosition);
    }
  }
};

// Helper function to find which glyph is at a given position
const findGlyphAtPosition = (level: string, side: string) => {
  const allPositions = Tower.getAllGlyphPositions();

  for (const [glyph, currentSide] of Object.entries(allPositions)) {
    if (GLYPHS[glyph as keyof typeof GLYPHS].level === level && currentSide === side) {
      return glyph;
    }
  }

  return null;
};

// Helper function to get glyph level
const getGlyphLevel = (glyph: string) => {
  return GLYPHS[glyph as keyof typeof GLYPHS]?.level || 'middle';
};


// Enhanced moveGlyph function with full functionality
const enhancedMoveGlyph = async () => {
  const glyphSelect = document.getElementById('glyph-select') as HTMLSelectElement;
  const sideSelect = document.getElementById('side-select') as HTMLSelectElement;

  const selectedGlyph = glyphSelect.value;
  const targetSide = sideSelect.value;

  logger.debug(`UI Selection: glyph=${selectedGlyph}, targetSide=${targetSide}`, '[Glyphs]');

  if (!selectedGlyph || !targetSide) {
    logger.warn('Please select a glyph and target side', '[Glyphs]');
    return;
  }

  try {
    // Get current glyph position directly (more reliable than getAllGlyphPositions)
    const currentGlyphPosition = Tower.getGlyphPosition(selectedGlyph as Glyphs);

    if (!currentGlyphPosition) {
      logger.error(`Unable to find current position for ${selectedGlyph} glyph, please perform a calibration first.`, '[Glyphs]');
      return;
    }

    // Get the fixed level for this glyph (glyphs can't change levels)
    const glyphLevel = GLYPHS[selectedGlyph as keyof typeof GLYPHS].level;

    // Calculate rotation needed to move glyph to target position
    const sides = ['north', 'east', 'south', 'west'];
    const currentSideIndex = sides.indexOf(currentGlyphPosition);
    const targetSideIndex = sides.indexOf(targetSide);

    if (currentSideIndex === -1 || targetSideIndex === -1) {
      logger.error('Invalid current or target side', '[Glyphs]');
      return;
    }

    // Calculate clockwise rotation steps needed
    let rotationSteps = (targetSideIndex - currentSideIndex + 4) % 4;

    if (rotationSteps === 0) {
      logger.info(`${selectedGlyph} glyph is already at ${targetSide} position`, '[Glyphs]');
      return;
    }

    // Calculate what drum position will put the selected glyph at the target side
    let targetDrumPosition;
    if (glyphLevel === 'top' || glyphLevel === 'middle' || glyphLevel === 'bottom') {
      // Calculate the drum position needed to put this specific glyph at the target side
      const currentDrumPosition = Tower.getCurrentDrumPosition(glyphLevel);
      const sides = ['north', 'east', 'south', 'west'];

      const currentDrumIndex = sides.indexOf(currentDrumPosition);
      const currentGlyphIndex = sides.indexOf(currentGlyphPosition);
      const targetGlyphIndex = sides.indexOf(targetSide);

      // Debug logging to understand the calculation
      logger.debug(`Move calculation: glyph=${selectedGlyph}, currentGlyphPos=${currentGlyphPosition}, targetSide=${targetSide}, currentDrumPos=${currentDrumPosition}`, '[Glyphs]');

      // Calculate how many steps the glyph needs to move
      let glyphSteps = (targetGlyphIndex - currentGlyphIndex + 4) % 4;

      // Calculate the new drum position
      const newDrumIndex = (currentDrumIndex + glyphSteps) % 4;
      targetDrumPosition = sides[newDrumIndex];

      logger.debug(`Move calculation result: glyphSteps=${glyphSteps}, newDrumIndex=${newDrumIndex}, targetDrumPosition=${targetDrumPosition}`, '[Glyphs]');
    }

    // Set positions for all three drums
    const topPosition = glyphLevel === 'top' ? targetDrumPosition : Tower.getCurrentDrumPosition('top');
    const middlePosition = glyphLevel === 'middle' ? targetDrumPosition : Tower.getCurrentDrumPosition('middle');
    const bottomPosition = glyphLevel === 'bottom' ? targetDrumPosition : Tower.getCurrentDrumPosition('bottom');

    logger.info(`Moving ${selectedGlyph} glyph from ${currentGlyphPosition} to ${targetSide} by rotating ${glyphLevel} level (${rotationSteps} steps clockwise)`, '[Glyphs]');

    // Execute the rotation with all three drum positions
    await Tower.Rotate(topPosition as TowerSide, middlePosition as TowerSide, bottomPosition as TowerSide);

    // The Tower.Rotate() command turns off all lights, so we need to restore them
    // Wait a moment for rotation to complete, then restore all lights and refresh UI
    setTimeout(async () => {
      try {
        // Refresh glyph positions (this will also restore visual light states based on glyph tracking)
        refreshGlyphPositions();

        // Restore all lights on the physical tower based on current glyph positions
        const allDoorwayLights = getCurrentDoorwayLights();
        if (allDoorwayLights.length > 0) {
          logger.info(`About to restore ${allDoorwayLights.length} lights: ${JSON.stringify(allDoorwayLights)}`, '[Glyphs]');
          await Tower.Lights({ doorway: allDoorwayLights });
          logger.info(`Successfully restored ${allDoorwayLights.length} lights after glyph movement`, '[Glyphs]');
        } else {
          logger.warn('No lights to restore after glyph movement', '[Glyphs]');
        }
      } catch (error) {
        logger.error('Error restoring lights after glyph move: ' + error, '[Glyphs]');
      }
    }, 1000);


    logger.info(`Successfully moved ${selectedGlyph} glyph to ${targetSide} position`, '[Glyphs]');

  } catch (error) {
    console.error('Error moving glyph:', error);
    logger.error('Error moving glyph: ' + error, '[Glyphs]');
  }
};

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
(window as any).switchTab = switchTab;
(window as any).moveGlyph = moveGlyph;
(window as any).toggleGlyphLight = toggleGlyphLight;
(window as any).refreshGlyphPositions = refreshGlyphPositions;
(window as any).filterLogs = filterLogs;
(window as any).clearLogs = clearLogs;
(window as any).saveState = saveState;
(window as any).loadState = loadState;
(window as any).resetState = resetState;
(window as any).updateLogLevel = updateLogLevel;
(window as any).clearLog = clearLog;
(window as any).copyDisplayedLogs = copyDisplayedLogs;
(window as any).downloadDisplayedLogs = downloadDisplayedLogs;
(window as any).getGlyphsFacingDirection = getGlyphsFacingDirection;
(window as any).sendLEDTestCommand = sendLEDTestCommand;
(window as any).clearAllLEDs = clearAllLEDs;
(window as any).findGlyphAtPosition = findGlyphAtPosition;
(window as any).getGlyphLevel = getGlyphLevel;
(window as any).glyphLightStates = glyphLightStates;
(window as any).getCurrentDoorwayLights = getCurrentDoorwayLights;
(window as any).updateBatteryFilter = updateBatteryFilter;