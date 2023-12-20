const Tower = new UltimateDarkTower();
// skull drop callback
const updateSkullDropCount = (count) => {
    const el = document.getElementById("skull-count");
    el.innerText = count;
};
Tower.onSkullDrop = updateSkullDropCount;
async function connectToTower() {
    await Tower.connect();
}
async function calibrate() {
    const el = document.getElementById("calibrating-message");
    el.classList.remove("hide");
    await Tower.calibrate();
}
const onCalibrationComplete = () => {
    const el = document.getElementById("calibrating-message");
    el.classList.add("hide");
};
Tower.onCalibrationComplete = onCalibrationComplete;
async function resetSkullCount() {
    Tower.resetTowerSkullCount();
    updateSkullDropCount(0);
}
const playSound = () => {
    const select = document.getElementById("sounds");
    Tower.playSound(Number(select.value));
};
const overrides = () => {
    const select = document.getElementById("lightOverrideDropDown");
    Tower.lightOverrides(Number(select.value));
};
const rotate = () => {
    const top = document.getElementById("top");
    const middle = document.getElementById("middle");
    const bottom = document.getElementById("bottom");
    const sound = document.getElementById("sounds");
    Tower.Rotate(top.value, middle.value, bottom.value, Number(sound.value));
};
const singleLight = (el) => {
    let style = null;
    if (el.checked) {
        const ls = document.getElementById("lightStyles");
        style = ls.options[ls.selectedIndex].innerHTML;
    }
    else {
        style = "off";
    }
    el.setAttribute('data-light-style', style);
    lights();
};
const lights = () => {
    const doorwayLights = getDoorwayLights();
    const ledgeLights = getLedgeLights();
    const baseLights = getBaseLights();
    const allLights = { doorway: doorwayLights, ledge: ledgeLights, base: baseLights };
    Tower.Lights(allLights);
};
const getDoorwayLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked';
    const checked = document.querySelectorAll(qs);
    const ls = document.getElementById("lightStyles");
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
};
const getLedgeLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="ledge"]:checked';
    const checked = document.querySelectorAll(qs);
    let ledgeCmds = [];
    Array.from(checked).forEach(cb => {
        const { lightSide, lightStyle } = getDataAttributes(cb);
        ledgeCmds.push({ position: lightSide, style: lightStyle });
    });
    return ledgeCmds;
};
const getBaseLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="base"]:checked';
    const checked = document.querySelectorAll(qs);
    let baseCmds = [];
    Array.from(checked).forEach(cb => {
        const { lightSide, lightStyle, lightBaseLocation } = getDataAttributes(cb);
        baseCmds.push({ position: { side: lightSide, level: lightBaseLocation }, style: lightStyle });
    });
    return baseCmds;
};
const getDataAttributes = (el) => {
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
};
//# sourceMappingURL=TowerController.js.map