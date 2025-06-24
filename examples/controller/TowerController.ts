
import UltimateDarkTower, { type TowerSide, type DoorwayLight, type LedgeLight, type BaseLight } from '../../src';

const Tower = new UltimateDarkTower();

// skull drop callback
const updateSkullDropCount = (count) => {
  const el = document.getElementById("skull-count");
  el.innerText = count;
}
Tower.onSkullDrop = updateSkullDropCount;

async function connectToTower() {
  await Tower.connect();
}

const onTowerConnected = () => {
  const el = document.getElementById("tower-connection-state");
  el.innerText = "Tower Connected"
  el.style.background = 'rgb(2 255 14 / 30%)';
}
Tower.onTowerConnect = onTowerConnected;

const onTowerDisconnected = () => {
  const el = document.getElementById("tower-connection-state");
  el.innerText = "Tower Disconnected";
  el.style.background = 'rgb(255 1 1 / 30%)';
}
Tower.onTowerDisconnect = onTowerDisconnected;

async function calibrate() {
  if (!Tower.isConnected) {
    return;
  }
  await Tower.calibrate();
  const el = document.getElementById("calibrating-message");
  el.classList.remove("hide");
}

const onCalibrationComplete = () => {
  const el = document.getElementById("calibrating-message");
  el.classList.add("hide");
}
Tower.onCalibrationComplete = onCalibrationComplete;

const onBatteryLevelNotify = (millivolts: number) => {
  const el = document.getElementById("battery");
  el.innerText = Tower.millVoltsToPercentage(millivolts);
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

const singleLight = (el) => {
  let style = null;
  if (el.checked) {
    const ls = document.getElementById("lightStyles") as HTMLSelectElement;
    style = ls.options[ls.selectedIndex].innerHTML
  } else {
    style = "off";
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

const getDoorwayLights = () => {
  const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked'
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  const ls = document.getElementById("lightStyles") as HTMLSelectElement;
  const selectedLightStyle = ls.options[ls.selectedIndex].textContent;
  let doorwayCmds = [];
  Array.from(checked).forEach(cb => {
    let { lightSide, lightStyle, lightLevel } = getDataAttributes(cb);
    if (lightStyle !== selectedLightStyle) {
      lightStyle = selectedLightStyle;
      cb.setAttribute('data-light-style', lightStyle);
    }
    doorwayCmds.push({ position: lightSide, level: lightLevel, style: lightStyle });
  });
  return doorwayCmds;
}

const getLedgeLights = () => {
  const qs = 'input[type="checkbox"][data-light-type="ledge"]:checked';
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  let ledgeCmds = [];
  Array.from(checked).forEach(cb => {
    const { lightSide, lightStyle } = getDataAttributes(cb);
    ledgeCmds.push({ position: lightSide, style: lightStyle });
  });
  return ledgeCmds;
}

const getBaseLights = () => {
  const qs = 'input[type="checkbox"][data-light-type="base"]:checked';
  const checked = document.querySelectorAll(qs) as NodeListOf<HTMLInputElement>;
  let baseCmds = [];
  Array.from(checked).forEach(cb => {
    const { lightSide, lightStyle, lightBaseLocation } = getDataAttributes(cb);
    baseCmds.push({ position: { side: lightSide, level: lightBaseLocation }, style: lightStyle });
  });

  return baseCmds;
}

const getDataAttributes = (el: HTMLDataElement) => {
  const lightType = el.getAttribute('data-light-type');
  const lightSide = el.getAttribute('data-light-location');
  const lightLevel = el.getAttribute('data-light-level');
  const lightBaseLocation = el.getAttribute('data-light-base-location');
  const lightStyle = el.getAttribute('data-light-style');

  return ({
    lightSide: lightSide, lightLevel: lightLevel,
    lightBaseLocation: lightBaseLocation,
    lightStyle: lightStyle, lightType: lightType,
  });
}