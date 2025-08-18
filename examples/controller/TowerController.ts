import UltimateDarkTower, {
  type TowerSide,
  type TowerCorner,
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
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  GLYPHS,
  VOLUME_DESCRIPTIONS,
  VOLUME_ICONS
} from '../../src';
import { logger, DOMOutput, ConsoleOutput } from '../../src/udtLogger';
import { rtdt_pack_state, rtdt_unpack_state, type TowerState } from '../../src/udtTowerState';
import { createDefaultTowerState } from '../../src/udtHelpers';

const Tower = new UltimateDarkTower();

// Global reference to shared DOM output for filtering
let sharedDOMOutput: DOMOutput;

// Chart-related global variables
interface DifferentialReading {
  timestamp: number;
  voltage: number;
  rawData: Uint8Array;
}

let differentialChart: any = null;
let differentialReadings: DifferentialReading[] = [];
let isCollectingData: boolean = false;
let chartTimeWindow: number = 30; // seconds
let lastChartUpdate: number = 0;
const CHART_UPDATE_THROTTLE = 200; // ms
const MAX_DATA_POINTS = 1000;

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

  // Initialize drum dropdown positions
  updateDrumDropdowns();

  // Initialize status packet display

  // Initialize volume display
  initializeVolumeDisplay();

  // Initialize chart if Charts tab is active
  initializeChart();

  // Update chart status
  updateChartStatus('Tower connected - ready to collect data');

  // Set up differential readings handler
  setupDifferentialReadingsHandler();

  setTimeout(() => {
    try {
      if (typeof refreshStatusPacket === 'function') {
        refreshStatusPacket();
      }
    } catch (error) {
      logger.debug("Error initializing status packet: " + error, '[TC]');
    }
  }, 500);
}
Tower.onTowerConnect = onTowerConnected;

const onTowerDisconnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Disconnected";
    el.style.background = 'rgb(255 1 1 / 30%)';
  }
  logger.warn("Tower disconnected", '[TC]');

  // Update chart status and stop data collection
  isCollectingData = false;
  updateChartDataCollectionButton();
  updateChartStatus('Tower disconnected - connect to tower to collect data');

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

  // Note: calibration status will be updated via onTowerStateUpdate callback
  // when the tower state changes, no need for setTimeout here

  // Wait a bit for calibration to fully complete, then refresh glyph positions and drum dropdowns
  setTimeout(() => {
    try {
      if (typeof (window as any).refreshGlyphPositions === 'function') {
        (window as any).refreshGlyphPositions();
        logger.info("Glyph positions refreshed after calibration", '[TC]');
      } else {
        logger.warn("refreshGlyphPositions function not available", '[TC]');
      }

      // Update drum dropdowns after calibration completes
      updateDrumDropdowns();
    } catch (error) {
      logger.error("Error refreshing glyph positions after calibration: " + error, '[TC]');
    }
  }, 1500);
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

const onTowerStateUpdate = (newState: TowerState, oldState: TowerState, source: string) => {
  logger.debug(`Tower state updated from ${source}`, '[TC]');

  // Check if calibration status changed and update the UI accordingly
  const calibrationChanged =
    newState.drum[0].calibrated !== oldState.drum[0].calibrated ||
    newState.drum[1].calibrated !== oldState.drum[1].calibrated ||
    newState.drum[2].calibrated !== oldState.drum[2].calibrated;

  if (calibrationChanged) {
    logger.info("Calibration status changed, updating display", '[TC]');
    updateCalibrationStatus();
  }

  // Check if drum positions changed and update the dropdowns accordingly
  const drumPositionsChanged =
    newState.drum[0].position !== oldState.drum[0].position ||
    newState.drum[1].position !== oldState.drum[1].position ||
    newState.drum[2].position !== oldState.drum[2].position;

  if (drumPositionsChanged) {
    logger.info("Drum positions changed, updating dropdowns", '[TC]');
    updateDrumDropdowns();
  }

  // Check if volume changed and update the display (but don't override our local volume tracking)
  if (newState.audio.volume !== oldState.audio.volume) {
    logger.info(`Volume changed from ${oldState.audio.volume} to ${newState.audio.volume}`, '[TC]');
    // Don't let tower responses override our local volume tracking during user-initiated changes
    // Only sync if there's no recent user interaction or a very large difference
    logger.debug(`Tower volume: ${newState.audio.volume}, Local volume: ${localVolume}`, '[TC]');
  }

  // Auto-refresh status packet when tower state changes
  try {
    if (typeof refreshStatusPacket === 'function') {
      refreshStatusPacket();
    }
  } catch (error) {
    logger.debug("Error auto-refreshing status packet: " + error, '[TC]');
  }
};
Tower.onTowerStateUpdate = onTowerStateUpdate;

// Tower response handler for differential readings
const handleTowerResponse = (response: Uint8Array) => {
  if (!isCollectingData || response.length === 0) return;
  
  // Check if this is a differential reading (command value 6)
  const commandValue = response[0];
  if (commandValue === 6) { // TC.DIFFERENTIAL_READINGS value
    const timestamp = Date.now();
    
    // Parse voltage from response (assuming it's in bytes 1-2 as 16-bit value)
    let voltage = 0;
    if (response.length >= 3) {
      voltage = (response[1] << 8) | response[2]; // Convert to 16-bit value
    }
    
    const reading: DifferentialReading = {
      timestamp,
      voltage,
      rawData: new Uint8Array(response)
    };
    
    addDifferentialReading(reading);
    logger.debug(`Differential reading: ${voltage} at ${new Date(timestamp).toLocaleTimeString()}`, '[Charts]');
  }
};

// Add differential reading to storage
const addDifferentialReading = (reading: DifferentialReading) => {
  differentialReadings.push(reading);
  
  // Remove old readings outside time window
  const cutoffTime = Date.now() - (chartTimeWindow * 1000);
  differentialReadings = differentialReadings.filter(r => r.timestamp > cutoffTime);
  
  // Limit total data points
  if (differentialReadings.length > MAX_DATA_POINTS) {
    differentialReadings = differentialReadings.slice(-MAX_DATA_POINTS);
  }
  
  // Update chart (throttled)
  const now = Date.now();
  if (now - lastChartUpdate > CHART_UPDATE_THROTTLE) {
    updateChart();
    updateChartStatistics();
    lastChartUpdate = now;
  }
};

// Set up custom tower response handler for differential readings
// This will be called after tower connection is established
const setupDifferentialReadingsHandler = () => {
  if ((Tower as any).bleConnection && (Tower as any).bleConnection.callbacks) {
    const originalCallback = (Tower as any).bleConnection.callbacks.onTowerResponse;
    (Tower as any).bleConnection.callbacks.onTowerResponse = (response: Uint8Array) => {
      // Call the original callback first
      if (originalCallback) {
        originalCallback(response);
      }
      
      // Handle differential readings
      handleTowerResponse(response);
    };
  }
};

const updateCalibrationStatus = () => {
  const topIcon = document.getElementById("calibration-top");
  const middleIcon = document.getElementById("calibration-middle");
  const bottomIcon = document.getElementById("calibration-bottom");

  if (!topIcon || !middleIcon || !bottomIcon) {
    logger.warn("Calibration icon elements not found", '[TC]');
    return;
  }

  if (!Tower.isConnected) {
    // Unknown state - gray question circles
    topIcon.className = "fas fa-question-circle text-gray-400 text-lg";
    topIcon.title = "Top drum status unknown";
    middleIcon.className = "fas fa-question-circle text-gray-400 text-lg";
    middleIcon.title = "Middle drum status unknown";
    bottomIcon.className = "fas fa-question-circle text-gray-400 text-lg";
    bottomIcon.title = "Bottom drum status unknown";
    return;
  }

  const towerState = Tower.getCurrentTowerState();

  // Update top drum calibration icon
  if (towerState.drum[0].calibrated) {
    topIcon.className = "fas fa-check-circle text-green-400 text-lg";
    topIcon.title = "Top drum calibrated";
  } else {
    topIcon.className = "fas fa-times-circle text-red-400 text-lg";
    topIcon.title = "Top drum not calibrated";
  }

  // Update middle drum calibration icon
  if (towerState.drum[1].calibrated) {
    middleIcon.className = "fas fa-check-circle text-green-400 text-lg";
    middleIcon.title = "Middle drum calibrated";
  } else {
    middleIcon.className = "fas fa-times-circle text-red-400 text-lg";
    middleIcon.title = "Middle drum not calibrated";
  }

  // Update bottom drum calibration icon
  if (towerState.drum[2].calibrated) {
    bottomIcon.className = "fas fa-check-circle text-green-400 text-lg";
    bottomIcon.title = "Bottom drum calibrated";
  } else {
    bottomIcon.className = "fas fa-times-circle text-red-400 text-lg";
    bottomIcon.title = "Bottom drum not calibrated";
  }
}

const updateDrumDropdowns = () => {
  const topSelect = document.getElementById("top") as HTMLSelectElement;
  const middleSelect = document.getElementById("middle") as HTMLSelectElement;
  const bottomSelect = document.getElementById("bottom") as HTMLSelectElement;

  if (!topSelect || !middleSelect || !bottomSelect) {
    logger.warn("Drum dropdown elements not found", '[TC]');
    return;
  }

  if (!Tower.isConnected) {
    logger.debug("Tower not connected, cannot update drum positions", '[TC]');
    return;
  }

  try {
    // Get current tower state for detailed debugging
    const towerState = Tower.getCurrentTowerState();

    // Get current drum positions from Tower method (now fixed to use tower state directly)
    const topPosition = Tower.getCurrentDrumPosition('top');
    const middlePosition = Tower.getCurrentDrumPosition('middle');
    const bottomPosition = Tower.getCurrentDrumPosition('bottom');

    // Convert raw position values for comparison logging
    const sides = ['north', 'east', 'south', 'west'];
    const topPositionFromRaw = sides[towerState.drum[0].position] || 'north';
    const middlePositionFromRaw = sides[towerState.drum[1].position] || 'north';
    const bottomPositionFromRaw = sides[towerState.drum[2].position] || 'north';

    // Verify that the method and raw state match (they should now)
    if (topPosition !== topPositionFromRaw || middlePosition !== middlePositionFromRaw || bottomPosition !== bottomPositionFromRaw) {
      logger.warn(`Position mismatch detected! Method vs Raw - Top: ${topPosition}!=${topPositionFromRaw}, Middle: ${middlePosition}!=${middlePositionFromRaw}, Bottom: ${bottomPosition}!=${bottomPositionFromRaw}`, '[TC]');
    }

    // Update dropdown selections to match current drum positions
    topSelect.value = topPosition;
    middleSelect.value = middlePosition;
    bottomSelect.value = bottomPosition;
  } catch (error) {
    logger.error(`Failed to update drum dropdowns: ${error}`, '[TC]');
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
  const soundValue = Number(select.value);

  if (soundValue === 0) {
    logger.info('No sound selected', '[Audio]');
    return;
  }

  // Use the current local volume for playing the sound
  logger.info(`Playing sound ${soundValue} at volume ${localVolume}`, '[Audio]');
  Tower.playSoundStateful(soundValue, false, localVolume);
}

const overrides = () => {
  const select = document.getElementById("lightOverrideDropDown") as HTMLInputElement;
  Tower.lightOverrides(Number(select.value));
}

const rotate = () => {
  const top = document.getElementById("top") as HTMLInputElement;
  const middle = document.getElementById("middle") as HTMLInputElement;
  const bottom = document.getElementById("bottom") as HTMLInputElement;
  Tower.rotateWithState(
    top.value as TowerSide,
    middle.value as TowerSide,
    bottom.value as TowerSide
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
    await Tower.breakSeal(sealIdentifier, localVolume);
    logger.info(`Broke seal at ${sealIdentifier.level}-${sealIdentifier.side}`, '[TC]');

    // Update the visual seal grid
    updateSealGrid(sealIdentifier, true);

    // Start cooldown and disable button
    startBreakSealCooldown();
  }
}

const clearAllLightCheckboxes = async () => {
  // Unselect all light checkboxes
  const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]') as NodeListOf<HTMLInputElement>;
  allLightCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    checkbox.setAttribute('data-light-style', 'off');
  });

  // Get current tower state and turn off all lights
  const currentState = Tower.getCurrentTowerState();

  // Turn off all lights in all layers
  for (let layerIndex = 0; layerIndex < currentState.layer.length; layerIndex++) {
    for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
      currentState.layer[layerIndex].light[lightIndex].effect = LIGHT_EFFECTS.off;
      currentState.layer[layerIndex].light[lightIndex].loop = false;
    }
  }

  // Send updated state to tower
  try {
    await Tower.sendTowerState(currentState);
  } catch (error) {
    console.error('Error sending tower state for all lights off:', error);
  }
}

const allLightsOn = async () => {
  // Get the currently selected light style from the dropdown
  const lightStyleSelect = document.getElementById("lightStyles") as HTMLSelectElement;
  const selectedLightStyle = lightStyleSelect?.options[lightStyleSelect.selectedIndex]?.textContent || "on";
  const effect = LIGHT_EFFECTS[selectedLightStyle as keyof typeof LIGHT_EFFECTS] || LIGHT_EFFECTS.on;

  // Check all light checkboxes and set their style
  const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]') as NodeListOf<HTMLInputElement>;
  allLightCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
    checkbox.setAttribute('data-light-style', selectedLightStyle);
  });

  // Get current tower state and turn on all lights with selected effect
  const currentState = Tower.getCurrentTowerState();

  // Apply effect to all doorway, ledge, and base lights
  // Doorway: layers TOP_RING, MIDDLE_RING, BOTTOM_RING (indices 0,1,2)
  for (let layerIndex = 0; layerIndex <= 2; layerIndex++) {
    for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
      currentState.layer[layerIndex].light[lightIndex].effect = effect;
      currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0;
    }
  }
  // Ledge: layer LEDGE (index 3)
  for (let lightIndex = 0; lightIndex < currentState.layer[3].light.length; lightIndex++) {
    currentState.layer[3].light[lightIndex].effect = effect;
    currentState.layer[3].light[lightIndex].loop = effect !== 0;
  }
  // Base: layers BASE1 and BASE2 (indices 4,5)
  for (let layerIndex = 4; layerIndex <= 5; layerIndex++) {
    for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
      currentState.layer[layerIndex].light[lightIndex].effect = effect;
      currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0;
    }
  }

  // Send updated state to tower
  try {
    await Tower.sendTowerState(currentState);
  } catch (error) {
    console.error('Error sending tower state for all lights on:', error);
  }
}

const allLightsOff = async () => {
  // Uncheck all light checkboxes and send tower state
  await clearAllLightCheckboxes();
}

const clearAllLights = async () => {
  // Clear checkboxes first, before sending tower command
  await clearAllLightCheckboxes();

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

const singleLight = async (el: HTMLInputElement) => {
  // Get the light style based on checkbox state
  let style: string = "off";
  if (el.checked) {
    const ls = document.getElementById("lightStyles") as HTMLSelectElement;
    if (ls && ls.selectedIndex >= 0) {
      style = ls.options[ls.selectedIndex].innerHTML;
    }
  }
  el.setAttribute('data-light-style', style);

  // Get light effect value
  const effect = LIGHT_EFFECTS[style as keyof typeof LIGHT_EFFECTS] || LIGHT_EFFECTS.off;
  console.log('[cek] style =', style, 'effect =', effect);

  // Get current tower state
  const currentState = Tower.getCurrentTowerState();

  // Get light attributes
  const lightType = el.getAttribute('data-light-type');
  const lightLocation = el.getAttribute('data-light-location') as TowerSide;
  const lightLevel = el.getAttribute('data-light-level') as TowerLevels;
  const lightBaseLocation = el.getAttribute('data-light-base-location');

  // Calculate layer and light indices
  let layerIndex: number;
  let lightIndex: number;

  if (lightType === 'doorway') {
    // Doorway lights: map level to layer and side to light index
    layerIndex = getTowerLayerForLevel(lightLevel);
    lightIndex = getLightIndexForSide(lightLocation);
  } else if (lightType === 'ledge') {
    // Ledge lights
    layerIndex = TOWER_LAYERS.LEDGE;
    lightIndex = getLedgeLightIndexForSide(lightLocation);
  } else if (lightType === 'base') {
    // Base lights: map base location to layer
    layerIndex = lightBaseLocation === 'b' ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1;
    lightIndex = getBaseLightIndexForSide(lightLocation);
  } else {
    console.error('Unknown light type:', lightType);
    return;
  }

  // Update the specific light in tower state
  currentState.layer[layerIndex].light[lightIndex].effect = effect;
  currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0; // loop if not off

  // Send updated state to tower
  try {
    await Tower.sendTowerState(currentState);
  } catch (error) {
    console.error('Error sending tower state:', error);
  }
}

// Helper functions for light mapping (same logic as in udtTowerCommands.ts)
const getTowerLayerForLevel = (level: TowerLevels): number => {
  switch (level) {
    case 'top': return TOWER_LAYERS.TOP_RING;
    case 'middle': return TOWER_LAYERS.MIDDLE_RING;
    case 'bottom': return TOWER_LAYERS.BOTTOM_RING;
    default: return TOWER_LAYERS.TOP_RING;
  }
};

const getLightIndexForSide = (side: TowerSide): number => {
  switch (side) {
    case 'north': return RING_LIGHT_POSITIONS.NORTH;
    case 'east': return RING_LIGHT_POSITIONS.EAST;
    case 'south': return RING_LIGHT_POSITIONS.SOUTH;
    case 'west': return RING_LIGHT_POSITIONS.WEST;
    default: return RING_LIGHT_POSITIONS.NORTH;
  }
};


const getLedgeLightIndexForSide = (side: string): number => {
  // Map ordinal directions directly to ledge light positions
  switch (side) {
    case 'northeast': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
    case 'southeast': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
    case 'southwest': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
    case 'northwest': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
    default: return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
  }
};

const getBaseLightIndexForSide = (side: TowerSide): number => {
  // Map cardinal directions to ordinal positions for base lights
  switch (side) {
    case 'north': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;  // Closest to north
    case 'east': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;   // Closest to east
    case 'south': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;  // Closest to south
    case 'west': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;   // Closest to west
    default: return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
  }
};

const lights = () => {
  // Get the currently selected light style from the dropdown
  const lightStyleSelect = document.getElementById("lightStyles") as HTMLSelectElement;
  const selectedLightStyle = lightStyleSelect?.options[lightStyleSelect.selectedIndex]?.textContent || "off";

  // Apply the selected style to all checked lights and turn off unchecked lights
  const allLEDLights = document.querySelectorAll('input[type="checkbox"][data-light-type]') as NodeListOf<HTMLInputElement>;
  allLEDLights.forEach(checkbox => {
    if (checkbox.checked) {
      checkbox.setAttribute('data-light-style', selectedLightStyle);
    } else {
      checkbox.setAttribute('data-light-style', 'off');
    }
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
      ledgeCmds.push({ position: lightSide as TowerCorner, style: lightStyle });
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
  // Turn off all lights when switching tabs
  allLightsOff();

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

  // Initialize chart when Charts tab is selected
  if (tabName === 'charts') {
    setTimeout(() => {
      initializeChart();
      updateChartDataCollectionButton();
      updateChartStatistics();
      if (Tower.isConnected) {
        updateChartStatus('Tower connected - ready to collect data');
      } else {
        updateChartStatus('Connect to tower to start collecting differential readings');
      }
    }, 100); // Small delay to ensure DOM is ready
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
    await Tower.rotateWithState(topPosition as TowerSide, middlePosition as TowerSide, bottomPosition as TowerSide);

    // Restore lights after rotation
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
    logger.info(`Battery logging set to: ${selectedValue}`, '[TC]');
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
    // Set default selection to 'on' if available
    const onIndex = Array.from(lightStyleSelect.options).findIndex(opt => opt.value === 'on');
    if (onIndex >= 0) {
      lightStyleSelect.selectedIndex = onIndex;
    }
  }

  // Populate light overrides dropdown (should have advanced sequences)
  const lightOverrideSelect = document.getElementById('lightOverrideDropDown') as HTMLSelectElement;
  if (lightOverrideSelect) {
    Object.entries(TOWER_LIGHT_SEQUENCES).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = value.toString(); // Use the numeric value, not the key
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

// Tower Status Packet functions
const STATE_BUFFER_SIZE = 19;
const DISPLAY_BUFFER_SIZE = 20;
const EMPTY_STATUS_PACKET = new Array(DISPLAY_BUFFER_SIZE).fill(0);

const refreshStatusPacket = () => {
  if (!Tower.isConnected) {
    logger.warn("Tower is not connected", '[Status Packet]');
    updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
    return;
  }

  try {
    const state = Tower.getCurrentTowerState();
    if (!state) {
      logger.warn("No current tower state available", '[Status Packet]');
      updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
      return;
    }

    // Create a buffer for the packed state (19 bytes + 1 command byte = 20 bytes)
    const buffer = new Uint8Array(DISPLAY_BUFFER_SIZE);
    const stateBuffer = new Uint8Array(STATE_BUFFER_SIZE);

    // convert tower state to packet
    const success = rtdt_pack_state(stateBuffer, STATE_BUFFER_SIZE, state);

    if (!success) {
      logger.error("Failed to pack tower state", '[Status Packet]');
      updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
      return;
    }

    // Command byte (0x00) + 19 bytes of state data
    buffer[0] = 0; // Command type for tower state
    for (let i = 0; i < STATE_BUFFER_SIZE; i++) {
      buffer[i + 1] = stateBuffer[i];
    }

    // Convert to array for display
    const packedState = Array.from(buffer);
    updateStatusPacketDisplay(packedState);

  } catch (error) {
    logger.error(`Failed to refresh status packet: ${error}`, '[TC]');
    updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
  }
}

const updateStatusPacketDisplay = (packetData: number[]) => {
  const display = document.getElementById('status-packet-display');
  if (!display) return;

  // Descriptions for each byte position
  const byteDescriptions = [
    'Battery Level',
    'Calibration Status',
    'Drum Positions (Top)',
    'Drum Positions (Middle)',
    'Drum Positions (Bottom)',
    'Light States (Doorways)',
    'Light States (Ledges)',
    'Light States (Base)',
    'Glyph Positions',
    'Seal States',
    'Sound Effects',
    'Player Count',
    'Game State',
    'Error Flags',
    'Communication Status',
    'Reserved',
    'Extended Flags',
    'Skull Drop Count',
    'Reserved',
    'Checksum'
  ];

  // Clear existing content
  display.innerHTML = '';

  // Add each byte as a styled span
  packetData.forEach((byte, index) => {
    const span = document.createElement('span');
    span.className = 'status-byte';

    // Add non-zero class for non-zero values
    if (byte !== 0) {
      span.className += ' non-zero';
    }

    span.textContent = byte.toString(16).padStart(2, '0').toUpperCase();
    const description = index < byteDescriptions.length ? byteDescriptions[index] : 'Unknown';
    span.title = `Byte ${index}: ${byte}D - ${description}`;
    display.appendChild(span);
  });
}

// Enhanced glyph management functions
const getGlyphsFacingDirection = (direction: TowerSide) => {
  try {
    return Tower.getGlyphsFacingDirection(direction);
  } catch (error) {
    console.error('Error getting glyphs facing direction:', error);
    logger.error('Error getting glyphs facing direction: ' + error, '[TC]');
    return [];
  }
};

// Light state tracking - keeps track of which glyphs have lights
const glyphLightStates = new Set(); // Set of glyph names that have lights on

// Helper function to get current doorway lights based on glyph positions and states
const getCurrentDoorwayLights = (): Array<DoorwayLight> => {
  const doorwayLights: Array<DoorwayLight> = [];

  for (const glyphName of glyphLightStates) {
    const currentPosition = Tower.getGlyphPosition(glyphName as any);

    if (currentPosition) {
      const level = GLYPHS[glyphName as keyof typeof GLYPHS].level;
      const lightCommand: DoorwayLight = {
        position: currentPosition,
        level: level as TowerLevels,
        style: 'on'
      };
      doorwayLights.push(lightCommand);
    } else {
      logger.warn(`Could not get position for glyph ${glyphName}`, '[TC]');
    }
  }

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

    // Update the glyph light tracking
    if (isLit) {
      glyphLightStates.add(glyphAtPosition);
    } else {
      glyphLightStates.delete(glyphAtPosition);
    }

    // Create a doorway light command for this specific glyph
    const glyphLevel = GLYPHS[glyphAtPosition as keyof typeof GLYPHS].level;
    const specificLightCommand: DoorwayLight = {
      position: side as TowerSide,
      level: glyphLevel as TowerLevels,
      style: lightEffect
    };

    // If turning on, send all current lights including this one
    // If turning off, send just this light with 'off' style to explicitly turn it off
    if (isLit) {
      // Get all current doorway lights and send them together
      const allDoorwayLights = getCurrentDoorwayLights();
      await Tower.Lights({ doorway: allDoorwayLights });
    } else {
      // Send explicit off command for this specific light
      await Tower.Lights({ doorway: [specificLightCommand] });
    }

  } catch (error) {
    logger.error('Error toggling glyph light: ' + error, '[TC]');

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

  if (!selectedGlyph || !targetSide) {
    logger.warn('Please select a glyph and target side', '[TC]');
    return;
  }

  try {
    // Get current glyph position directly (more reliable than getAllGlyphPositions)
    const currentGlyphPosition = Tower.getGlyphPosition(selectedGlyph as Glyphs);

    if (!currentGlyphPosition) {
      logger.error(`Unable to find current position for ${selectedGlyph} glyph, please perform a calibration first.`, '[TC]');
      return;
    }

    // Get the fixed level for this glyph (glyphs can't change levels)
    const glyphLevel = GLYPHS[selectedGlyph as keyof typeof GLYPHS].level;

    // Calculate rotation needed to move glyph to target position
    const sides = ['north', 'east', 'south', 'west'];
    const currentSideIndex = sides.indexOf(currentGlyphPosition);
    const targetSideIndex = sides.indexOf(targetSide);

    if (currentSideIndex === -1 || targetSideIndex === -1) {
      logger.error('Invalid current or target side', '[TC]');
      return;
    }

    // Calculate clockwise rotation steps needed
    let rotationSteps = (targetSideIndex - currentSideIndex + 4) % 4;

    if (rotationSteps === 0) {
      logger.info(`${selectedGlyph} glyph is already at ${targetSide} position`, '[TC]');
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

      // Calculate how many steps the glyph needs to move
      let glyphSteps = (targetGlyphIndex - currentGlyphIndex + 4) % 4;

      // Calculate the new drum position
      const newDrumIndex = (currentDrumIndex + glyphSteps) % 4;
      targetDrumPosition = sides[newDrumIndex];

    }

    // Set positions for all three drums
    const topPosition = glyphLevel === 'top' ? targetDrumPosition : Tower.getCurrentDrumPosition('top');
    const middlePosition = glyphLevel === 'middle' ? targetDrumPosition : Tower.getCurrentDrumPosition('middle');
    const bottomPosition = glyphLevel === 'bottom' ? targetDrumPosition : Tower.getCurrentDrumPosition('bottom');

    logger.info(`Moving ${selectedGlyph} glyph from ${currentGlyphPosition} to ${targetSide} by rotating ${glyphLevel} level (${rotationSteps} steps clockwise)`, '[TC]');

    // Execute the rotation with all three drum positions
    await Tower.rotateWithState(topPosition as TowerSide, middlePosition as TowerSide, bottomPosition as TowerSide);

    // Restore lights after rotation
    // Wait a moment for rotation to complete, then restore all lights and refresh UI
    setTimeout(async () => {
      try {
        // Refresh glyph positions (this will also restore visual light states based on glyph tracking)
        refreshGlyphPositions();

        // Restore all lights on the physical tower based on current glyph positions
        const allDoorwayLights = getCurrentDoorwayLights();
        if (allDoorwayLights.length > 0) {
          await Tower.Lights({ doorway: allDoorwayLights });
        }
      } catch (error) {
        logger.error('Error restoring lights after glyph move: ' + error, '[TC]');
      }
    }, 1000);

    logger.info(`Moved ${selectedGlyph} glyph to ${targetSide} position`, '[TC]');

  } catch (error) {
    logger.error('Error moving glyph: ' + error, '[TC]');
  }
};

// Local volume tracking to avoid conflicts with tower state
let localVolume = 0;

// Volume control functions
const volumeUp = async () => {
  try {
    const newVolume = Math.min(localVolume + 1, 3); // Clamp to max 3

    if (newVolume === localVolume) {
      return;
    }

    logger.info(`Setting volume from ${localVolume} to ${newVolume}`, '[TC]');

    // Update local volume first
    localVolume = newVolume;

    // Get current state and update only the volume
    const currentState = Tower.getCurrentTowerState();
    const newState = { ...currentState };
    newState.audio = { ...currentState.audio, volume: newVolume };

    logger.debug(`Sending tower state with volume: ${newState.audio.volume}`, '[TC]');

    // Send the updated state to the tower
    await Tower.sendTowerState(newState);

    // Play CardFlipPaper03 sound with new volume for feedback
    await Tower.playSoundStateful(0x21, false, newVolume);

    // Update the display
    updateVolumeDisplay(newVolume);

  } catch (error) {
    logger.error(`Error increasing volume: ${error}`, '[TC]');
  }
};

const volumeDown = async () => {
  try {
    const newVolume = Math.max(localVolume - 1, 0); // Clamp to min 0

    if (newVolume === localVolume) {
      return;
    }

    // Update local volume first
    localVolume = newVolume;

    // Get current state and update only the volume
    const currentState = Tower.getCurrentTowerState();
    const newState = { ...currentState };
    newState.audio = { ...currentState.audio, volume: newVolume };

    // Send the updated state to the tower
    await Tower.sendTowerState(newState);

    // Play CardFlipPaper03 sound with new volume for feedback (except when going to Mute)
    if (newVolume < 3) {
      await Tower.playSoundStateful(0x21, false, newVolume);
    }

    // Update the display
    updateVolumeDisplay(newVolume);

  } catch (error) {
    logger.error(`Error decreasing volume: ${error}`, '[TC]');
  }
};

const updateVolumeDisplay = (volume: number) => {
  const volumeLevelElement = document.getElementById('volumeLevel');
  const volumeIconElement = document.getElementById('volumeIcon');

  if (volumeLevelElement) {
    const description = VOLUME_DESCRIPTIONS[volume as keyof typeof VOLUME_DESCRIPTIONS] || 'Unknown';
    volumeLevelElement.textContent = description;
  }

  if (volumeIconElement) {
    const icon = VOLUME_ICONS[volume as keyof typeof VOLUME_ICONS] || '🔊';
    volumeIconElement.textContent = icon;
  }
};

// Initialize volume display when tower connects
const initializeVolumeDisplay = () => {
  try {
    const currentState = Tower.getCurrentTowerState();
    localVolume = currentState.audio.volume;
    updateVolumeDisplay(localVolume);
  } catch (error) {
    localVolume = 0;
  }
};

// Chart.js initialization and management functions
const initializeChart = () => {
  if (differentialChart) return; // Already initialized
  
  const ctx = document.getElementById('differential-chart') as HTMLCanvasElement;
  if (!ctx) return;
  
  differentialChart = new (window as any).Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Differential Voltage',
        data: [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second',
            displayFormats: {
              second: 'mm:ss'
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Voltage'
          },
          beginAtZero: false
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'nearest',
          intersect: false,
          callbacks: {
            title: function(context: any) {
              const date = new Date(context[0].parsed.x);
              const minutes = date.getMinutes().toString().padStart(2, '0');
              const seconds = date.getSeconds().toString().padStart(2, '0');
              return `${minutes}:${seconds}`;
            },
            label: function(context: any) {
              return `Voltage: ${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
};

const updateChart = () => {
  if (!differentialChart) return;
  
  // Prepare data for Chart.js (filter by time window)
  const cutoffTime = Date.now() - (chartTimeWindow * 1000);
  const filteredReadings = differentialReadings.filter(r => r.timestamp > cutoffTime);
  
  const chartData = filteredReadings.map(reading => ({
    x: reading.timestamp,
    y: reading.voltage
  }));
  
  differentialChart.data.datasets[0].data = chartData;
  differentialChart.update('none'); // No animation for real-time updates
};

const updateChartStatistics = () => {
  const statsPoints = document.getElementById('chart-stats-points');
  const statsLatest = document.getElementById('chart-stats-latest');
  const statsMin = document.getElementById('chart-stats-min');
  const statsMax = document.getElementById('chart-stats-max');
  
  if (!statsPoints || !statsLatest || !statsMin || !statsMax) return;
  
  // Filter by current time window
  const cutoffTime = Date.now() - (chartTimeWindow * 1000);
  const filteredReadings = differentialReadings.filter(r => r.timestamp > cutoffTime);
  
  statsPoints.textContent = filteredReadings.length.toString();
  
  if (filteredReadings.length > 0) {
    const latest = filteredReadings[filteredReadings.length - 1];
    const voltages = filteredReadings.map(r => r.voltage);
    const minVoltage = Math.min(...voltages);
    const maxVoltage = Math.max(...voltages);
    
    statsLatest.textContent = latest.voltage.toFixed(2);
    statsMin.textContent = minVoltage.toFixed(2);
    statsMax.textContent = maxVoltage.toFixed(2);
  } else {
    statsLatest.textContent = '--';
    statsMin.textContent = '--';
    statsMax.textContent = '--';
  }
};

const updateChartStatus = (message: string) => {
  const statusElement = document.getElementById('chart-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
};

const updateChartDataCollectionButton = () => {
  const button = document.getElementById('chart-start-stop');
  if (!button) return;
  
  if (isCollectingData) {
    button.innerHTML = '<i class="fas fa-stop mr-1"></i>Stop';
    button.classList.remove('tower-button');
    button.classList.add('tower-button');
    button.style.backgroundColor = '#dc2626';
  } else {
    button.innerHTML = '<i class="fas fa-play mr-1"></i>Start';
    button.classList.remove('tower-button');
    button.classList.add('tower-button');
    button.style.backgroundColor = '';
  }
};

// Chart control functions
const toggleDataCollection = () => {
  if (!Tower.isConnected) {
    updateChartStatus('Tower not connected');
    return;
  }
  
  isCollectingData = !isCollectingData;
  updateChartDataCollectionButton();
  
  if (isCollectingData) {
    // Enable differential readings logging in the tower
    (Tower as any).bleConnection.loggingConfig.DIFFERENTIAL_READINGS = true;
    updateChartStatus('Logging differential readings...');
    logger.info('Started differential readings data collection', '[Charts]');
  } else {
    // Disable differential readings logging to save bandwidth
    (Tower as any).bleConnection.loggingConfig.DIFFERENTIAL_READINGS = false;
    updateChartStatus('Stopped logging differential readings');
    logger.info('Stopped differential readings data collection', '[Charts]');
  }
};

const updateTimeWindow = () => {
  const select = document.getElementById('chart-time-window') as HTMLSelectElement;
  if (!select) return;
  
  chartTimeWindow = parseInt(select.value);
  
  // Update chart to show new time window
  if (differentialChart) {
    updateChart();
    updateChartStatistics();
  }
  
  logger.info(`Chart time window updated to ${chartTimeWindow} seconds`, '[Charts]');
};

const clearChartData = () => {
  differentialReadings = [];
  
  if (differentialChart) {
    differentialChart.data.datasets[0].data = [];
    differentialChart.update();
  }
  
  updateChartStatistics();
  updateChartStatus(Tower.isConnected ? 'Data cleared - ready to collect' : 'Data cleared - connect to tower');
  logger.info('Chart data cleared', '[Charts]');
};

const exportChartData = () => {
  if (differentialReadings.length === 0) {
    alert('No data to export');
    return;
  }
  
  // Create CSV content
  const headers = ['Timestamp', 'Time', 'Voltage', 'Raw Data'];
  const csvRows = [headers.join(',')];
  
  differentialReadings.forEach(reading => {
    const timeString = new Date(reading.timestamp).toISOString();
    const rawDataHex = Array.from(reading.rawData).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const row = [
      reading.timestamp,
      timeString,
      reading.voltage,
      `"${rawDataHex}"`
    ];
    csvRows.push(row.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `differential-readings-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  logger.info(`Exported ${differentialReadings.length} differential readings`, '[Charts]');
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
(window as any).findGlyphAtPosition = findGlyphAtPosition;
(window as any).getGlyphLevel = getGlyphLevel;
(window as any).glyphLightStates = glyphLightStates;
(window as any).getCurrentDoorwayLights = getCurrentDoorwayLights;
(window as any).updateBatteryFilter = updateBatteryFilter;
(window as any).updateDrumDropdowns = updateDrumDropdowns;
(window as any).refreshStatusPacket = refreshStatusPacket;
(window as any).volumeUp = volumeUp;
(window as any).volumeDown = volumeDown;
(window as any).updateVolumeDisplay = updateVolumeDisplay;
(window as any).initializeVolumeDisplay = initializeVolumeDisplay;
(window as any).toggleDataCollection = toggleDataCollection;
(window as any).updateTimeWindow = updateTimeWindow;
(window as any).clearChartData = clearChartData;
(window as any).exportChartData = exportChartData;
(window as any).initializeChart = initializeChart;