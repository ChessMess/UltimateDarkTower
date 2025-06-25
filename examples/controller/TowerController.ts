import UltimateDarkTower, {
  type TowerSide,
  type TowerLevels,
  type DoorwayLight,
  type LedgeLight,
  type BaseLight,
  type BaseLightLevel,
  type Lights,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
  LIGHT_EFFECTS
} from '../../src';

const Tower = new UltimateDarkTower();

// Expose constants globally for the inline script
(window as any).TOWER_AUDIO_LIBRARY = TOWER_AUDIO_LIBRARY;
(window as any).TOWER_LIGHT_SEQUENCES = TOWER_LIGHT_SEQUENCES;
(window as any).LIGHT_EFFECTS = LIGHT_EFFECTS;
// Expose Tower instance globally
(window as any).Tower = Tower;

// skull drop callback
const updateSkullDropCount = (count: number) => {
  const el = document.getElementById("skull-count");
  if (el) {
    el.innerText = count.toString();
  }
}
Tower.onSkullDrop = updateSkullDropCount;

async function connectToTower() {
  await Tower.connect();
}

const onTowerConnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Connected"
    el.style.background = 'rgb(2 255 14 / 30%)';
  }
}
Tower.onTowerConnect = onTowerConnected;

const onTowerDisconnected = () => {
  const el = document.getElementById("tower-connection-state");
  if (el) {
    el.innerText = "Tower Disconnected";
    el.style.background = 'rgb(255 1 1 / 30%)';
  }
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
}
Tower.onCalibrationComplete = onCalibrationComplete;

const onBatteryLevelNotify = (millivolts: number) => {
  const el = document.getElementById("battery");
  if (el) {
    el.innerText = Tower.millVoltsToPercentage(millivolts).toString();
  }
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

const breakSeal = async () => {
  const select = document.getElementById("sealSelect") as HTMLSelectElement;
  const sealValue = select.value;
  
  if (!sealValue) {
    console.log("No seal selected");
    return;
  }
  
  // Map seal names to numbers (1-12 based on the UltimateDarkTower breakSeal method)
  const sealMap: { [key: string]: number } = {
    "North Top": 1,
    "East Top": 2, 
    "South Top": 3,
    "West Top": 4,
    "North Middle": 5,
    "East Middle": 6,
    "South Middle": 7, 
    "West Middle": 8,
    "North Bottom": 9,
    "East Bottom": 10,
    "South Bottom": 11,
    "West Bottom": 12
  };
  
  const sealNumber = sealMap[sealValue];
  if (sealNumber) {
    await Tower.breakSeal(sealNumber);
  }
}

const clearAllLights = async () => {
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
  console.log("All lights cleared");
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