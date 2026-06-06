"use strict";
/**
 * Multi-slot layout anchors for the Return to Dark Tower board, plus board-image
 * metadata. Each location carries one anchor per occupant slot type that can
 * appear there (a building space adds 'building' + 'skull'); renderers fan
 * multiple tokens around a single slot. Coordinates are normalized [0, 1] against
 * the board image, so they are resolution-independent.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_ANCHORS = exports.BOARD_IMAGE_INFO = void 0;
exports.BOARD_IMAGE_INFO = {
    width: 4096,
    height: 4096,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.5,
    northHeadingDegrees: 135,
};
/** Layout anchors for all 60 board locations, keyed by location name. */
exports.BOARD_ANCHORS = {
    'Broken Lands': {
        hero: { x: 0.80599, y: 0.51238 },
        foe: { x: 0.8355, y: 0.50648 },
        marker: { x: 0.81451, y: 0.53009 },
    },
    Dayside: {
        building: { x: 0.74564, y: 0.7754 },
        skull: { x: 0.75351, y: 0.77147 },
        hero: { x: 0.78708, y: 0.84542 },
        foe: { x: 0.82397, y: 0.81232 },
        marker: { x: 0.79742, y: 0.81818 },
    },
    "Egan's End": {
        building: { x: 0.57088, y: 0.9152 },
        skull: { x: 0.57506, y: 0.92844 },
        hero: { x: 0.65606, y: 0.89196 },
        foe: { x: 0.66675, y: 0.91679 },
        marker: { x: 0.63365, y: 0.91644 },
    },
    Fivepint: {
        marker: { x: 0.84691, y: 0.76433 },
        hero: { x: 0.82, y: 0.75615 },
        foe: { x: 0.83838, y: 0.73603 },
    },
    'Green Bridge': {
        hero: { x: 0.73574, y: 0.71149 },
        foe: { x: 0.77097, y: 0.67222 },
        marker: { x: 0.76259, y: 0.69647 },
    },
    'Lodestone Mountains': {
        hero: { x: 0.90983, y: 0.54979 },
        foe: { x: 0.93133, y: 0.52482 },
        marker: { x: 0.92439, y: 0.57164 },
    },
    'Lower Ice Fangs': {
        hero: { x: 0.644, y: 0.75336 },
        foe: { x: 0.60986, y: 0.76715 },
        marker: { x: 0.65399, y: 0.77853 },
    },
    'Muted Forest': {
        hero: { x: 0.72254, y: 0.57754 },
        foe: { x: 0.71006, y: 0.53557 },
        marker: { x: 0.74474, y: 0.54875 },
    },
    'Peaks of the Djinn': {
        hero: { x: 0.52263, y: 0.73716 },
        foe: { x: 0.53056, y: 0.76095 },
        marker: { x: 0.53401, y: 0.78715 },
    },
    'Pearl of the North': {
        marker: { x: 0.90091, y: 0.66962 },
        hero: { x: 0.89715, y: 0.69647 },
        foe: { x: 0.91852, y: 0.64046 },
    },
    'Radiant Mountains': {
        building: { x: 0.82063, y: 0.64652 },
        skull: { x: 0.82727, y: 0.64883 },
        hero: { x: 0.81081, y: 0.6058 },
        foe: { x: 0.82294, y: 0.57982 },
        marker: { x: 0.85182, y: 0.59425 },
    },
    Rimeweald: {
        hero: { x: 0.58228, y: 0.83094 },
        foe: { x: 0.54746, y: 0.84576 },
        marker: { x: 0.614, y: 0.84852 },
    },
    'The Tundra': {
        hero: { x: 0.71123, y: 0.84955 },
        foe: { x: 0.69675, y: 0.82094 },
        marker: { x: 0.72778, y: 0.87369 },
    },
    'Tower Scar Desert': {
        marker: { x: 0.63365, y: 0.57476 },
        hero: { x: 0.64227, y: 0.53994 },
        foe: { x: 0.58642, y: 0.61028 },
    },
    'Upper Ice Fangs': {
        building: { x: 0.68089, y: 0.66613 },
        skull: { x: 0.68571, y: 0.66096 },
        foe: { x: 0.5478, y: 0.67889 },
        hero: { x: 0.63882, y: 0.7044 },
        marker: { x: 0.59159, y: 0.67578 },
    },
    'Big Sister': {
        hero: { x: 0.29269, y: 0.60241 },
        foe: { x: 0.28651, y: 0.56064 },
        marker: { x: 0.26136, y: 0.54023 },
    },
    'Bleak Wastes': {
        marker: { x: 0.45929, y: 0.67741 },
        hero: { x: 0.44885, y: 0.64751 },
        foe: { x: 0.47163, y: 0.65937 },
    },
    'Copper Grove': {
        hero: { x: 0.34044, y: 0.8742 },
        foe: { x: 0.37074, y: 0.91984 },
        marker: { x: 0.3369, y: 0.90017 },
    },
    'Dragontooth Lake': {
        marker: { x: 0.43784, y: 0.75253 },
        hero: { x: 0.38955, y: 0.70385 },
        foe: { x: 0.38599, y: 0.7367 },
    },
    Duwani: {
        building: { x: 0.21975, y: 0.79014 },
        skull: { x: 0.22094, y: 0.79251 },
        hero: { x: 0.20946, y: 0.83367 },
        foe: { x: 0.18729, y: 0.76599 },
        marker: { x: 0.16988, y: 0.77905 },
    },
    'Forest of Shades': {
        hero: { x: 0.36184, y: 0.57047 },
        foe: { x: 0.35393, y: 0.54355 },
        marker: { x: 0.37965, y: 0.6053 },
    },
    'Greater Tombstones': {
        building: { x: 0.31989, y: 0.66902 },
        skull: { x: 0.32384, y: 0.66467 },
        hero: { x: 0.27041, y: 0.67773 },
        foe: { x: 0.22133, y: 0.66546 },
        marker: { x: 0.25933, y: 0.65675 },
    },
    'Inner Kinghills': {
        building: { x: 0.4061, y: 0.83461 },
        skull: { x: 0.41279, y: 0.83658 },
        hero: { x: 0.45685, y: 0.81494 },
        foe: { x: 0.43364, y: 0.87592 },
        marker: { x: 0.46236, y: 0.84169 },
    },
    'Jewel Hills': {
        marker: { x: 0.26293, y: 0.86082 },
        foe: { x: 0.29301, y: 0.81688 },
        hero: { x: 0.27599, y: 0.84063 },
    },
    'Lake of Songs': {
        hero: { x: 0.1157, y: 0.71675 },
        foe: { x: 0.14498, y: 0.72862 },
        marker: { x: 0.10778, y: 0.68825 },
    },
    'Lesser Tombstones': {
        hero: { x: 0.19169, y: 0.5889 },
        foe: { x: 0.18179, y: 0.6178 },
        marker: { x: 0.1715, y: 0.655 },
    },
    'Outer Kinghills': {
        hero: { x: 0.49606, y: 0.90673 },
        foe: { x: 0.44183, y: 0.91306 },
        marker: { x: 0.46242, y: 0.9289 },
    },
    'The Decaying Wilds': {
        marker: { x: 0.34526, y: 0.79037 },
        hero: { x: 0.31399, y: 0.77414 },
        foe: { x: 0.33339, y: 0.76503 },
    },
    'Three Rivers': {
        building: { x: 0.10461, y: 0.59524 },
        skull: { x: 0.10976, y: 0.59445 },
        hero: { x: 0.10066, y: 0.56159 },
        foe: { x: 0.05672, y: 0.60869 },
        marker: { x: 0.07216, y: 0.56516 },
    },
    "Utar's Barrows": {
        hero: { x: 0.21227, y: 0.72268 },
        foe: { x: 0.27322, y: 0.75554 },
        marker: { x: 0.25502, y: 0.73416 },
    },
    Archmont: {
        marker: { x: 0.28906, y: 0.28849 },
        hero: { x: 0.2475, y: 0.26474 },
        foe: { x: 0.22375, y: 0.24297 },
    },
    "Azkol's Bane": {
        hero: { x: 0.31755, y: 0.2026 },
        foe: { x: 0.35515, y: 0.20339 },
        marker: { x: 0.2851, y: 0.22002 },
    },
    'Bone Hills': {
        marker: { x: 0.26112, y: 0.1386 },
        hero: { x: 0.23354, y: 0.15298 },
        foe: { x: 0.28374, y: 0.10136 },
    },
    'Howling Desert': {
        building: { x: 0.46416, y: 0.25928 },
        skull: { x: 0.46145, y: 0.25218 },
        hero: { x: 0.41951, y: 0.22546 },
        foe: { x: 0.47464, y: 0.2011 },
        marker: { x: 0.44488, y: 0.20009 },
    },
    Irontops: {
        hero: { x: 0.44934, y: 0.35744 },
        foe: { x: 0.46636, y: 0.32986 },
        marker: { x: 0.425, y: 0.33632 },
    },
    'Little Sister': {
        hero: { x: 0.23451, y: 0.34805 },
        foe: { x: 0.21272, y: 0.32604 },
        marker: { x: 0.19827, y: 0.36466 },
    },
    'Middle Sister': {
        hero: { x: 0.16203, y: 0.46453 },
        foe: { x: 0.1493, y: 0.49904 },
        marker: { x: 0.15513, y: 0.43088 },
    },
    'Mountains of the Watchers': {
        hero: { x: 0.49023, y: 0.12066 },
        foe: { x: 0.45633, y: 0.09633 },
        marker: { x: 0.4994, y: 0.18246 },
    },
    'Pine Barrens': {
        hero: { x: 0.06957, y: 0.49147 },
        foe: { x: 0.07316, y: 0.4185 },
        marker: { x: 0.06957, y: 0.45478 },
    },
    'Sands of Madness': {
        building: { x: 0.27133, y: 0.44721 },
        skull: { x: 0.26256, y: 0.44561 },
        hero: { x: 0.28249, y: 0.39777 },
        foe: { x: 0.30083, y: 0.33636 },
        marker: { x: 0.29964, y: 0.37464 },
    },
    'Southern Wastes': {
        marker: { x: 0.16607, y: 0.22512 },
        building: { x: 0.16248, y: 0.29211 },
        skull: { x: 0.1553, y: 0.28931 },
        hero: { x: 0.16686, y: 0.24466 },
        foe: { x: 0.17723, y: 0.19242 },
    },
    'The Cloister': {
        hero: { x: 0.35027, y: 0.30566 },
        foe: { x: 0.39692, y: 0.28014 },
        marker: { x: 0.36862, y: 0.28254 },
    },
    'The Emerald Expanse': {
        building: { x: 0.3746, y: 0.14179 },
        skull: { x: 0.37699, y: 0.14817 },
        hero: { x: 0.34071, y: 0.08955 },
        foe: { x: 0.43121, y: 0.05407 },
        marker: { x: 0.38177, y: 0.08357 },
    },
    'The Throne': {
        marker: { x: 0.35865, y: 0.43166 },
        hero: { x: 0.36782, y: 0.38979 },
        foe: { x: 0.33991, y: 0.46236 },
    },
    "Ulamel's Hollow": {
        foe: { x: 0.10307, y: 0.38022 },
        hero: { x: 0.11981, y: 0.34872 },
        marker: { x: 0.0935, y: 0.34952 },
    },
    Anza: {
        building: { x: 0.69519, y: 0.13269 },
        skull: { x: 0.69876, y: 0.1242 },
        hero: { x: 0.67642, y: 0.16664 },
        foe: { x: 0.72244, y: 0.16888 },
        marker: { x: 0.74656, y: 0.14609 },
    },
    Arkartus: {
        building: { x: 0.81849, y: 0.28504 },
        skull: { x: 0.82832, y: 0.27789 },
        hero: { x: 0.81983, y: 0.23544 },
        foe: { x: 0.87702, y: 0.25376 },
        marker: { x: 0.84753, y: 0.24036 },
    },
    'Ash Hills': {
        hero: { x: 0.68312, y: 0.44364 },
        foe: { x: 0.69161, y: 0.46732 },
        marker: { x: 0.71618, y: 0.45347 },
    },
    Cloudhold: {
        marker: { x: 0.80375, y: 0.41683 },
        hero: { x: 0.77694, y: 0.42041 },
        foe: { x: 0.79124, y: 0.44274 },
    },
    Delmsmire: {
        foe: { x: 0.83994, y: 0.34892 },
        hero: { x: 0.86675, y: 0.32703 },
        marker: { x: 0.89221, y: 0.31631 },
    },
    'Hissing Groves': {
        marker: { x: 0.67151, y: 0.33865 },
        building: { x: 0.70502, y: 0.3869 },
        skull: { x: 0.71127, y: 0.38422 },
        hero: { x: 0.66436, y: 0.38645 },
        foe: { x: 0.64783, y: 0.36054 },
    },
    'Idran Forest': {
        hero: { x: 0.54105, y: 0.21221 },
        foe: { x: 0.54865, y: 0.23455 },
        marker: { x: 0.58394, y: 0.22294 },
    },
    'Lonelight Hills': {
        marker: { x: 0.58573, y: 0.30291 },
        hero: { x: 0.58662, y: 0.32524 },
        foe: { x: 0.54507, y: 0.30112 },
    },
    'Lost Lands': {
        hero: { x: 0.56339, y: 0.08935 },
        foe: { x: 0.57813, y: 0.10633 },
        marker: { x: 0.57367, y: 0.0688 },
    },
    'Plains of Plovo': {
        marker: { x: 0.92348, y: 0.42532 },
        building: { x: 0.88238, y: 0.39717 },
        skull: { x: 0.89042, y: 0.3936 },
        hero: { x: 0.89221, y: 0.43158 },
        foe: { x: 0.91053, y: 0.44632 },
    },
    'Plains of Woldra': {
        hero: { x: 0.62862, y: 0.12107 },
        foe: { x: 0.57322, y: 0.15815 },
        marker: { x: 0.60851, y: 0.16798 },
    },
    'The Empty Glade': {
        hero: { x: 0.72646, y: 0.29352 },
        foe: { x: 0.78052, y: 0.34982 },
        marker: { x: 0.74746, y: 0.32078 },
    },
    'The Grass Sea': {
        hero: { x: 0.57099, y: 0.37662 },
        foe: { x: 0.62281, y: 0.43426 },
        marker: { x: 0.60181, y: 0.40343 },
    },
    'Weeping Waters': {
        hero: { x: 0.64202, y: 0.24795 },
        foe: { x: 0.65453, y: 0.23053 },
        marker: { x: 0.67464, y: 0.24393 },
    },
    Yellowpike: {
        marker: { x: 0.76533, y: 0.22338 },
        hero: { x: 0.79348, y: 0.19792 },
        foe: { x: 0.81492, y: 0.17379 },
    },
};
//# sourceMappingURL=udtBoardAnchors.js.map