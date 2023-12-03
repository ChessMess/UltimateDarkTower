const TheTower = new UltimateDarkTower();
async function connectToTower() {
    await DarkTower.connect();
}
const playSound = () => {
    const select = document.getElementById("sounds");
    DarkTower.playSound(Number(select.value));
};
const overrides = () => {
    const select = document.getElementById("lightOverrideDropDown");
    DarkTower.lightOverrides(Number(select.value));
};
const rotate = () => {
    const top = document.getElementById("top");
    const middle = document.getElementById("middle");
    const bottom = document.getElementById("bottom");
    const sound = document.getElementById("sounds");
    DarkTower.Rotate(top.value, middle.value, bottom.value, Number(sound.value));
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
    DarkTower.Lights(allLights);
};
const getDoorwayLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked';
    const checked = document.querySelectorAll(qs);
    let doorwayCmds = [];
    Array.from(checked).forEach(cb => {
        const { lightSide, lightStyle, lightLevel } = getDataAttributes(cb);
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
