(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/constants.ts
  var UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  var UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  var UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
  var TOWER_DEVICE_NAME = "ReturnToDarkTower";
  var DIS_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
  var DIS_MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
  var DIS_MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";
  var DIS_SERIAL_NUMBER_UUID = "00002a25-0000-1000-8000-00805f9b34fb";
  var DIS_HARDWARE_REVISION_UUID = "00002a27-0000-1000-8000-00805f9b34fb";
  var DIS_FIRMWARE_REVISION_UUID = "00002a26-0000-1000-8000-00805f9b34fb";
  var DIS_SOFTWARE_REVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";
  var DIS_SYSTEM_ID_UUID = "00002a23-0000-1000-8000-00805f9b34fb";
  var DIS_IEEE_REGULATORY_UUID = "00002a2a-0000-1000-8000-00805f9b34fb";
  var DIS_PNP_ID_UUID = "00002a50-0000-1000-8000-00805f9b34fb";
  var TOWER_COMMANDS = {
    towerState: 0,
    // not a sendable command
    doorReset: 1,
    unjamDrums: 2,
    resetCounter: 3,
    calibration: 4,
    overwriteDrumStates: 5
    // go no further!
  };
  var TC = {
    STATE: "TOWER_STATE",
    INVALID_STATE: "INVALID_STATE",
    FAILURE: "HARDWARE_FAILURE",
    JIGGLE: "MECH_JIGGLE_TRIGGERED",
    UNEXPECTED: "MECH_UNEXPECTED_TRIGGER",
    DURATION: "MECH_DURATION",
    DIFFERENTIAL: "DIFFERENTIAL_READINGS",
    CALIBRATION: "CALIBRATION_FINISHED",
    BATTERY: "BATTERY_READING"
  };
  var DRUM_PACKETS = {
    topMiddle: 1,
    bottom: 2
  };
  var LIGHT_PACKETS = {
    doorway: {
      top: { north: 3, east: 3, south: 4, west: 4 },
      middle: { north: 5, east: 5, south: 6, west: 6 },
      bottom: { north: 7, east: 7, south: 8, west: 8 }
    },
    base: {
      north: { a: 12, b: 14 },
      east: { a: 11, b: 13 },
      south: { a: 11, b: 13 },
      west: { a: 12, b: 14 }
    },
    ledge: { north: 10, west: 10, south: 9, east: 9 },
    overrides: 19
  };
  var AUDIO_COMMAND_POS = 15;
  var SKULL_DROP_COUNT_POS = 17;
  var drumPositionCmds = {
    top: { north: 16, west: 2, south: 20, east: 22 },
    // bits 1-8
    middle: { north: 16, west: 64, south: 144, east: 208 },
    // bits 1-4
    bottom: { north: 66, west: 74, south: 82, east: 90 }
  };
  var BASE_LEDGE_LIGHTS_TO_BIT_SHIFT = ["east", "west"];
  var DOORWAY_LIGHTS_TO_BIT_SHIFT = ["north", "south"];
  var LIGHT_EFFECTS = {
    on: 3,
    off: 0,
    breathe: 5,
    breatheFast: 7,
    breathe50percent: 9,
    flicker: 11
  };
  var TOWER_LIGHT_SEQUENCES = {
    twinkle: 1,
    flareThenFade: 2,
    flareThenFadeBase: 3,
    flareThenFlicker: 4,
    angryStrobe01: 5,
    angryStrobe02: 6,
    angryStrobe03: 7,
    gloat01: 8,
    gloat02: 9,
    gloat03: 10,
    defeat: 11,
    victory: 12,
    dungeonIdle: 13,
    sealReveal: 14,
    rotationAllDrums: 15,
    rotationDrumTop: 16,
    rotationDrumMiddle: 17,
    rotationDrumBottom: 18,
    monthStarted: 19
  };
  var TOWER_AUDIO_LIBRARY = {
    Ashstrider: { name: "Ashstrider", value: 1, category: "Adversary" },
    BaneofOmens: { name: "Bane of Omens", value: 2, category: "Adversary" },
    EmpressofShades: { name: "Empress of Shades", value: 3, category: "Adversary" },
    GazeEternal: { name: "Gaze Eternal", value: 4, category: "Adversary" },
    Gravemaw: { name: "Gravemaw", value: 5, category: "Adversary" },
    IsatheHollow: { name: "Isa the Hollow", value: 6, category: "Adversary" },
    LingeringRot: { name: "Lingering Rot", value: 7, category: "Adversary" },
    UtukKu: { name: "Utuk'Ku", value: 8, category: "Adversary" },
    Gleb: { name: "Gleb", value: 9, category: "Ally" },
    Grigor: { name: "Grigor", value: 10, category: "Ally" },
    Hakan: { name: "Hakan", value: 11, category: "Ally" },
    Letha: { name: "Letha", value: 12, category: "Ally" },
    Miras: { name: "Miras", value: 13, category: "Ally" },
    Nimet: { name: "Nimet", value: 14, category: "Ally" },
    Tomas: { name: "Tomas", value: 15, category: "Ally" },
    Vasa: { name: "Vasa", value: 16, category: "Ally" },
    Yana: { name: "Yana", value: 17, category: "Ally" },
    Zaida: { name: "Zaida", value: 18, category: "Ally" },
    ApplyAdvantage01: { name: "Apply Advantage 01", value: 19, category: "Battle" },
    ApplyAdvantage02: { name: "Apply Advantage 02", value: 20, category: "Battle" },
    ApplyAdvantage03: { name: "Apply Advantage 03", value: 21, category: "Battle" },
    ApplyAdvantage04: { name: "Apply Advantage 04", value: 22, category: "Battle" },
    ApplyAdvantage05: { name: "Apply Advantage 05", value: 23, category: "Battle" },
    MaxAdvantages: { name: "Max Advantages", value: 24, category: "Battle" },
    NoAdvantages: { name: "No Advantages", value: 25, category: "Battle" },
    AdversaryEscaped: { name: "Adversary Escaped", value: 26, category: "Battle" },
    BattleButton: { name: "Battle Button", value: 27, category: "Battle" },
    CardFlip01: { name: "Card Flip 01", value: 28, category: "Battle" },
    CardFlip02: { name: "Card Flip 02", value: 29, category: "Battle" },
    CardFlip03: { name: "Card Flip 03", value: 30, category: "Battle" },
    CardFlipPaper01: { name: "Card Flip Paper 01", value: 31, category: "Battle" },
    CardFlipPaper02: { name: "Card Flip Paper 02", value: 32, category: "Battle" },
    CardFlipPaper03: { name: "Card Flip Paper 03", value: 33, category: "Battle" },
    CardSelect01: { name: "Card Select 01", value: 34, category: "Battle" },
    CardSelect02: { name: "Card Select 02", value: 35, category: "Battle" },
    CardSelect03: { name: "Card Select 03", value: 36, category: "Battle" },
    BattleStart: { name: "Battle Start", value: 37, category: "Battle" },
    BattleVictory: { name: "Battle Victory", value: 38, category: "Battle" },
    ButtonHoldPressCombo: { name: "Button Hold Press Combo", value: 39, category: "Battle" },
    ButtonHold: { name: "Button Hold", value: 40, category: "Battle" },
    ButtonPress: { name: "Button Press", value: 41, category: "Battle" },
    ClassicAdvantageApplied: { name: "8-bit Advantage", value: 42, category: "Classic" },
    ClassicAttackTower: { name: "8-bit Attack Tower", value: 43, category: "Classic" },
    ClassicBazaar: { name: "8-bit Bazaar", value: 44, category: "Classic" },
    ClassicConfirmation: { name: "8-bit Confirmation", value: 45, category: "Classic" },
    ClassicDragons: { name: "8-bit Dragons", value: 46, category: "Classic" },
    ClassicQuestFailed: { name: "8-bit Quest Failed", value: 47, category: "Classic" },
    ClassicRetreat: { name: "8-bit Retreat", value: 48, category: "Classic" },
    ClassicStartMonth: { name: "8-bit Start Month", value: 49, category: "Classic" },
    ClassicStartDungeon: { name: "8-bit Start Dungeon", value: 50, category: "Classic" },
    ClassicTowerLost: { name: "8-bit Tower Lost", value: 51, category: "Classic" },
    ClassicUnsure: { name: "8-bit Unsure", value: 52, category: "Classic" },
    DungeonAdvantage01: { name: "Dungeon Advantage 01", value: 53, category: "Dungeon" },
    DungeonAdvantage02: { name: "Dungeon Advantage 02", value: 54, category: "Dungeon" },
    DungeonButton: { name: "Dungeon Button", value: 55, category: "Dungeon" },
    DungeonFootsteps: { name: "Dungeon Footsteps", value: 56, category: "Dungeon" },
    DungeonCaves: { name: "Dungeon Caves", value: 57, category: "Dungeon" },
    DungeonComplete: { name: "Dungeon Complete", value: 58, category: "Dungeon" },
    DungeonEncampment: { name: "Dungeon Encampment", value: 59, category: "Dungeon" },
    DungeonEscape: { name: "Dungeon Escape", value: 60, category: "Dungeon" },
    DungeonFortress: { name: "Dungeon Fortress", value: 61, category: "Dungeon" },
    DungeonRuins: { name: "Dungeon Ruins", value: 62, category: "Dungeon" },
    DungeonShrine: { name: "Dungeon Shrine", value: 63, category: "Dungeon" },
    DungeonTomb: { name: "Dungeon Tomb", value: 64, category: "Dungeon" },
    FoeEvent: { name: "Foe Event", value: 65, category: "Foe" },
    FoeSpawn: { name: "Foe Spawn", value: 66, category: "Foe" },
    Brigands: { name: "Brigands", value: 67, category: "Foe" },
    ClanofNeuri: { name: "Clan of Neuri", value: 68, category: "Foe" },
    Dragons: { name: "Dragons", value: 69, category: "Foe" },
    Lemures: { name: "Lemures", value: 70, category: "Foe" },
    LeveledUp: { name: "Leveled Up", value: 71, category: "Foe" },
    Mormos: { name: "Mormos", value: 72, category: "Foe" },
    Oreks: { name: "Oreks", value: 73, category: "Foe" },
    ShadowWolves: { name: "Shadow Wolves", value: 74, category: "Foe" },
    SpineFiends: { name: "Spine Fiends", value: 75, category: "Foe" },
    Strigas: { name: "Strigas", value: 76, category: "Foe" },
    Titans: { name: "Titans", value: 77, category: "Foe" },
    FrostTrolls: { name: "Frost Trolls", value: 78, category: "Foe" },
    WidowmadeSpiders: { name: "Widowmade Spiders", value: 79, category: "Foe" },
    AshstriderSpawn: { name: "Ashstrider Spawn", value: 80, category: "Spawn" },
    BaneofOmensSpawn: { name: "Bane of Omens Spawn", value: 81, category: "Spawn" },
    EmpressofShadesSpawn: { name: "Empress of Shades Spawn", value: 82, category: "Spawn" },
    GazeEternalSpawn: { name: "Gaze Eternal Spawn", value: 83, category: "Spawn" },
    GravemawSpawn: { name: "Gravemaw Spawn", value: 84, category: "Spawn" },
    IsatheHollowSpawn: { name: "Isa the Hollow Spawn", value: 85, category: "Spawn" },
    LingeringRotSpawn: { name: "Lingering Rot Spawn", value: 86, category: "Spawn" },
    UtukKuSpawn: { name: "Utuk'Ku Spawn", value: 87, category: "Spawn" },
    QuestComplete: { name: "Quest Complete", value: 88, category: "Quest" },
    TowerAllGlyphs: { name: "Tower All Glyphs", value: 89, category: "Glyph" },
    TowerAngry1: { name: "Tower Angry 1", value: 90, category: "Glyph" },
    TowerAngry2: { name: "Tower Angry 2", value: 91, category: "Glyph" },
    TowerAngry3: { name: "Tower Angry 3", value: 92, category: "Glyph" },
    TowerAngry4: { name: "Tower Angry 4", value: 93, category: "Glyph" },
    TowerConnected: { name: "Tower Connected", value: 94, category: "State" },
    GameStart: { name: "Game Start", value: 95, category: "State" },
    TowerGloat1: { name: "Tower Gloat 1", value: 96, category: "State" },
    TowerGloat2: { name: "Tower Gloat 2", value: 97, category: "State" },
    TowerGloat3: { name: "Tower Gloat 3", value: 98, category: "State" },
    TowerGlyph: { name: "Tower Glyph", value: 99, category: "State" },
    TowerIdle1: { name: "Tower Idle 1", value: 100, category: "State" },
    TowerIdle2: { name: "Tower Idle 2", value: 101, category: "State" },
    TowerIdle3: { name: "Tower Idle 3", value: 102, category: "State" },
    TowerIdle4: { name: "Tower Idle 4", value: 103, category: "State" },
    TowerIdle5: { name: "Tower Idle 5", value: 104, category: "Unlisted" },
    TowerDisconnected: { name: "Tower Disconnect", value: 105, category: "State" },
    MonthEnded: { name: "Month Ended", value: 106, category: "State" },
    MonthStarted: { name: "Month Started", value: 107, category: "State" },
    QuestFailed: { name: "Quest Failed", value: 108, category: "Quest" },
    RotateExit: { name: "Rotate Exit", value: 109, category: "Seals" },
    RotateLoop: { name: "Rotate Loop", value: 110, category: "Seals" },
    RotateStart: { name: "Rotate Start", value: 111, category: "Seals" },
    TowerSeal: { name: "Tower Seal", value: 112, category: "Seals" },
    TowerSkullDropped: { name: "Tower Skull Dropped", value: 113, category: "State" }
  };
  var TOWER_MESSAGES = {
    TOWER_STATE: { name: "Tower State", value: 0, critical: false },
    INVALID_STATE: { name: "Invalid State", value: 1, critical: true },
    HARDWARE_FAILURE: { name: "Hardware Failure", value: 2, critical: true },
    MECH_JIGGLE_TRIGGERED: { name: "Unjam Jiggle Triggered", value: 3, critical: false },
    MECH_DURATION: { name: "Rotation Duration", value: 4, critical: false },
    MECH_UNEXPECTED_TRIGGER: { name: "Unexpected Trigger", value: 5, critical: false },
    DIFFERENTIAL_READINGS: { name: "Diff Voltage Readings", value: 6, critical: false },
    BATTERY_READING: { name: "Battery Level", value: 7, critical: false },
    CALIBRATION_FINISHED: { name: "Calibration Finished", value: 8, critical: false }
  };
  var VOLTAGE_LEVELS = [
    1500,
    1390,
    1350,
    1320,
    1295,
    1270,
    1245,
    1225,
    1205,
    1180,
    1175,
    1166,
    1150,
    1133,
    1125,
    1107,
    1095,
    1066,
    1033,
    980
    // There's an additional 5% until 800mV is reached
  ];

  // src/Logger.ts
  var ConsoleOutput = class {
    write(level, message, _timestamp) {
      switch (level) {
        case "debug":
          console.debug(message);
          break;
        case "info":
          console.info(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "error":
          console.error(message);
          break;
      }
    }
  };
  var DOMOutput = class {
    constructor(containerId, maxLines = 100) {
      this.container = null;
      this.maxLines = 100;
      this.allEntries = [];
      this.container = typeof document !== "undefined" ? document.getElementById(containerId) : null;
      this.maxLines = maxLines;
    }
    write(level, message, timestamp) {
      if (!this.container)
        return;
      this.allEntries.push({ level, message, timestamp });
      while (this.allEntries.length > this.maxLines) {
        this.allEntries.shift();
      }
      this.refreshDisplay();
    }
    refreshDisplay() {
      if (!this.container)
        return;
      this.container.innerHTML = "";
      const enabledLevels = this.getEnabledLevelsFromCheckboxes();
      const textFilter = this.getTextFilter();
      this.allEntries.forEach((entry) => {
        if (enabledLevels.has(entry.level)) {
          if (textFilter && !entry.message.toLowerCase().includes(textFilter.toLowerCase())) {
            return;
          }
          const timeStr = entry.timestamp.toLocaleTimeString();
          const logLine = document.createElement("div");
          logLine.className = `log-line log-${entry.level}`;
          logLine.textContent = `[${timeStr}] ${entry.message}`;
          this.container.appendChild(logLine);
        }
      });
      this.container.scrollTop = this.container.scrollHeight;
      this.updateBufferSizeDisplay();
    }
    getEnabledLevelsFromCheckboxes() {
      const enabledLevels = /* @__PURE__ */ new Set();
      if (typeof document === "undefined") {
        return enabledLevels;
      }
      const checkboxes = ["debug", "info", "warn", "error"];
      checkboxes.forEach((level) => {
        const checkbox = document.getElementById(`logLevel-${level}`);
        if (checkbox && checkbox.checked) {
          enabledLevels.add(level);
        }
      });
      return enabledLevels;
    }
    getTextFilter() {
      var _a;
      if (typeof document === "undefined") {
        return "";
      }
      const textFilterInput = document.getElementById("logTextFilter");
      return ((_a = textFilterInput == null ? void 0 : textFilterInput.value) == null ? void 0 : _a.trim()) || "";
    }
    updateBufferSizeDisplay() {
      var _a, _b;
      if (typeof document === "undefined") {
        return;
      }
      const bufferSizeElement = document.getElementById("logBufferSize");
      if (!bufferSizeElement) {
        return;
      }
      const displayedCount = ((_b = (_a = this.container) == null ? void 0 : _a.children) == null ? void 0 : _b.length) || 0;
      const totalCount = this.allEntries.length;
      bufferSizeElement.textContent = `${displayedCount} / ${totalCount}`;
    }
    // Public method to refresh display when filter checkboxes change
    refreshFilter() {
      this.refreshDisplay();
    }
    // Public method to clear all entries
    clearAll() {
      this.allEntries = [];
      if (this.container) {
        this.container.innerHTML = "";
      }
    }
    // Debug methods to help diagnose filtering issues
    getEntryCount() {
      return this.allEntries.length;
    }
    getEnabledLevels() {
      return Array.from(this.getEnabledLevelsFromCheckboxes());
    }
    debugEntries() {
      console.log("DOMOutput Debug:");
      console.log("- Container exists:", !!this.container);
      console.log("- Entry count:", this.allEntries.length);
      console.log("- Enabled levels:", this.getEnabledLevels());
      console.log("- Entries:", this.allEntries);
    }
  };
  var _Logger = class _Logger {
    constructor() {
      this.outputs = [];
      this.enabledLevels = /* @__PURE__ */ new Set(["all"]);
      this.outputs.push(new ConsoleOutput());
    }
    static getInstance() {
      if (!_Logger.instance) {
        _Logger.instance = new _Logger();
      }
      return _Logger.instance;
    }
    addOutput(output) {
      this.outputs.push(output);
    }
    setMinLevel(level) {
      this.enabledLevels = /* @__PURE__ */ new Set([level]);
    }
    setEnabledLevels(levels) {
      this.enabledLevels = new Set(levels);
    }
    enableLevel(level) {
      this.enabledLevels.add(level);
    }
    disableLevel(level) {
      this.enabledLevels.delete(level);
    }
    getEnabledLevels() {
      return Array.from(this.enabledLevels);
    }
    shouldLog(level) {
      if (this.enabledLevels.has("all"))
        return true;
      if (level === "all")
        return true;
      if (this.enabledLevels.has(level))
        return true;
      if (this.enabledLevels.size === 1) {
        const singleLevel = Array.from(this.enabledLevels)[0];
        if (singleLevel !== "all") {
          const levels = ["debug", "info", "warn", "error"];
          const minIndex = levels.indexOf(singleLevel);
          const currentIndex = levels.indexOf(level);
          return currentIndex >= minIndex;
        }
      }
      return false;
    }
    log(level, message, context) {
      if (!this.shouldLog(level))
        return;
      const contextPrefix = context ? `${context} ` : "";
      const finalMessage = `${contextPrefix}${message}`;
      const timestamp = /* @__PURE__ */ new Date();
      this.outputs.forEach((output) => {
        try {
          output.write(level, finalMessage, timestamp);
        } catch (error) {
          console.error("Logger output error:", error);
        }
      });
    }
    debug(message, context) {
      this.log("debug", message, context);
    }
    info(message, context) {
      this.log("info", message, context);
    }
    warn(message, context) {
      this.log("warn", message, context);
    }
    error(message, context) {
      this.log("error", message, context);
    }
  };
  _Logger.instance = null;
  var Logger = _Logger;
  var logger = Logger.getInstance();

  // src/udtTowerResponse.ts
  var TowerResponseProcessor = class {
    constructor(logDetail = false) {
      this.logDetail = false;
      this.logDetail = logDetail;
    }
    /**
     * Sets whether to include detailed information in command string conversion
     * @param {boolean} enabled - Whether to enable detailed logging
     */
    setDetailedLogging(enabled) {
      this.logDetail = enabled;
    }
    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue) {
      const cmdKeys = Object.keys(TOWER_MESSAGES);
      const cmdKey = cmdKeys.find((key) => TOWER_MESSAGES[key].value === cmdValue);
      if (!cmdKey) {
        logger.warn(`Unknown command received from tower: ${cmdValue} (0x${cmdValue.toString(16)})`, "TowerResponseProcessor");
        return { cmdKey: void 0, command: { name: "Unknown Command", value: cmdValue } };
      }
      const command = TOWER_MESSAGES[cmdKey];
      return { cmdKey, command };
    }
    /**
     * Converts a command packet to a human-readable string array for logging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command) {
      const cmdValue = command[0];
      const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);
      switch (cmdKey) {
        case TC.STATE:
        case TC.INVALID_STATE:
        case TC.FAILURE:
        case TC.JIGGLE:
        case TC.UNEXPECTED:
        case TC.DURATION:
        case TC.DIFFERENTIAL:
        case TC.CALIBRATION:
          return [towerCommand.name, this.commandToPacketString(command)];
        case TC.BATTERY:
          const millivolts = this.getMilliVoltsFromTowerResponse(command);
          const retval = [towerCommand.name, this.milliVoltsToPercentage(millivolts)];
          if (this.logDetail) {
            retval.push(`${millivolts}mv`);
            retval.push(this.commandToPacketString(command));
          }
          return retval;
        default:
          return ["Unmapped Response!", this.commandToPacketString(command)];
      }
    }
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command) {
      let cmdStr = "[";
      command.forEach((n) => cmdStr += n.toString(16) + ",");
      cmdStr = cmdStr.slice(0, -1) + "]";
      return cmdStr;
    }
    /**
     * Extracts battery voltage in millivolts from a tower battery response.
     * @param {Uint8Array} command - Battery response packet from tower
     * @returns {number} Battery voltage in millivolts
     */
    getMilliVoltsFromTowerResponse(command) {
      const mv = new Uint8Array(4);
      mv[0] = command[4];
      mv[1] = command[3];
      mv[2] = 0;
      mv[3] = 0;
      const view = new DataView(mv.buffer, 0);
      return view.getUint32(0, true);
    }
    /**
     * Converts battery voltage in millivolts to percentage.
     * Tower returns sum total battery level in millivolts for all batteries.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv) {
      const batLevel = mv ? mv / 3 : 0;
      const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
      return `${levels.length * 5}%`;
    }
    /**
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey, logConfig) {
      const logAll = logConfig["LOG_ALL"];
      let canLogThisResponse = logConfig[cmdKey] || logAll;
      if (!cmdKey) {
        canLogThisResponse = true;
      }
      return canLogThisResponse;
    }
    /**
     * Checks if a command is a battery response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a battery response
     */
    isBatteryResponse(cmdKey) {
      return cmdKey === TC.BATTERY;
    }
    /**
     * Checks if a command is a tower state response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a tower state response
     */
    isTowerStateResponse(cmdKey) {
      return cmdKey === TC.STATE;
    }
  };

  // src/udtBleConnection.ts
  var UdtBleConnection = class {
    constructor(logger2, callbacks) {
      // BLE connection objects
      this.TowerDevice = null;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      // Connection state
      this.isConnected = false;
      this.isCalibrated = false;
      this.performingCalibration = false;
      this.performingLongCommand = false;
      // Connection monitoring
      this.connectionMonitorInterval = null;
      this.connectionMonitorFrequency = 2 * 1e3;
      this.lastSuccessfulCommand = 0;
      this.connectionTimeoutThreshold = 30 * 1e3;
      this.enableConnectionMonitoring = true;
      // Battery heartbeat monitoring
      this.lastBatteryHeartbeat = 0;
      this.batteryHeartbeatTimeout = 3 * 1e3;
      this.longTowerCommandTimeout = 30 * 1e3;
      this.enableBatteryHeartbeatMonitoring = true;
      this.batteryHeartbeatVerifyConnection = true;
      // When true, verifies connection before triggering disconnection on heartbeat timeout
      // Tower state
      this.towerSkullDropCount = -1;
      this.lastBatteryNotification = 0;
      this.lastBatteryPercentage = "";
      this.batteryNotifyFrequency = 15 * 1e3;
      this.batteryNotifyOnValueChangeOnly = false;
      // Device information
      this.deviceInformation = {};
      // Logging configuration
      this.logTowerResponses = true;
      this.logTowerResponseConfig = {
        TOWER_STATE: true,
        INVALID_STATE: true,
        HARDWARE_FAILURE: true,
        MECH_JIGGLE_TRIGGERED: true,
        MECH_UNEXPECTED_TRIGGER: true,
        MECH_DURATION: true,
        DIFFERENTIAL_READINGS: false,
        BATTERY_READING: true,
        CALIBRATION_FINISHED: true,
        LOG_ALL: false
      };
      this.onRxCharacteristicValueChanged = (event) => {
        this.lastSuccessfulCommand = Date.now();
        const target = event.target;
        let receivedData = new Uint8Array(target.value.byteLength);
        for (var i = 0; i < target.value.byteLength; i++) {
          receivedData[i] = target.value.getUint8(i);
        }
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
        if (this.logTowerResponses) {
          this.logTowerResponse(receivedData);
        }
        if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
          this.handleTowerStateResponse(receivedData);
        }
        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
          this.lastBatteryHeartbeat = Date.now();
          const millivolts = this.responseProcessor.getMilliVoltsFromTowerResponse(receivedData);
          const batteryPercentage = this.responseProcessor.milliVoltsToPercentage(millivolts);
          const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
          const batteryNotifyFrequencyPassed = Date.now() - this.lastBatteryNotification >= this.batteryNotifyFrequency;
          const shouldNotify = this.batteryNotifyOnValueChangeOnly ? didBatteryLevelChange || this.lastBatteryPercentage === "" : batteryNotifyFrequencyPassed;
          if (shouldNotify) {
            this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT]");
            this.lastBatteryNotification = Date.now();
            this.lastBatteryPercentage = batteryPercentage;
            this.callbacks.onBatteryLevelNotify(millivolts);
          }
        } else {
          if (this.callbacks.onTowerResponse) {
            this.callbacks.onTowerResponse();
          }
        }
      };
      this.bleAvailabilityChange = (event) => {
        this.logger.info("Bluetooth availability changed", "[UDT]");
        const availability = event.value;
        if (!availability && this.isConnected) {
          this.logger.warn("Bluetooth became unavailable - handling disconnection", "[UDT]");
          this.handleDisconnection();
        }
      };
      this.onTowerDeviceDisconnected = (_event) => {
        this.logger.warn("Tower device disconnected unexpectedly", "[UDT]");
        this.handleDisconnection();
      };
      this.logger = logger2;
      this.callbacks = callbacks;
      this.responseProcessor = new TowerResponseProcessor();
    }
    async connect() {
      this.logger.info("Looking for Tower...", "[UDT]");
      try {
        this.TowerDevice = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: TOWER_DEVICE_NAME }],
          optionalServices: [UART_SERVICE_UUID, DIS_SERVICE_UUID]
        });
        if (this.TowerDevice === null) {
          this.logger.warn("Tower not found", "[UDT]");
          return;
        }
        navigator.bluetooth.addEventListener("availabilitychanged", this.bleAvailabilityChange);
        this.logger.info("Connecting to Tower GATT Server...", "[UDT]");
        const server = await this.TowerDevice.gatt.connect();
        this.logger.info("Getting Tower Primary Service...", "[UDT]");
        const service = await server.getPrimaryService(UART_SERVICE_UUID);
        this.logger.info("Getting Tower Characteristics...", "[UDT]");
        this.txCharacteristic = await service.getCharacteristic(
          UART_TX_CHARACTERISTIC_UUID
        );
        this.rxCharacteristic = await service.getCharacteristic(
          UART_RX_CHARACTERISTIC_UUID
        );
        this.logger.info("Subscribing to Tower...", "[UDT]");
        await this.rxCharacteristic.startNotifications();
        await this.rxCharacteristic.addEventListener(
          "characteristicvaluechanged",
          this.onRxCharacteristicValueChanged
        );
        this.TowerDevice.addEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        this.logger.info("Tower connection complete", "[UDT]");
        this.isConnected = true;
        this.lastSuccessfulCommand = Date.now();
        this.lastBatteryHeartbeat = Date.now();
        await this.readDeviceInformation();
        if (this.enableConnectionMonitoring) {
          this.startConnectionMonitoring();
        }
        this.callbacks.onTowerConnect();
      } catch (error) {
        this.logger.error(`Tower Connection Error: ${error}`, "[UDT]");
        this.isConnected = false;
        this.callbacks.onTowerDisconnect();
      }
    }
    async disconnect() {
      if (!this.TowerDevice) {
        return;
      }
      this.stopConnectionMonitoring();
      if (this.TowerDevice.gatt.connected) {
        this.TowerDevice.removeEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        await this.TowerDevice.gatt.disconnect();
        this.logger.info("Tower disconnected", "[UDT]");
        this.handleDisconnection();
      }
    }
    handleTowerStateResponse(receivedData) {
      const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
      if (this.performingCalibration) {
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.isCalibrated = true;
        this.lastBatteryHeartbeat = Date.now();
        this.callbacks.onCalibrationComplete();
        this.logger.info("Tower calibration complete", "[UDT]");
      }
      if (dataSkullDropCount !== this.towerSkullDropCount) {
        if (!!dataSkullDropCount) {
          this.callbacks.onSkullDrop(dataSkullDropCount);
          this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? "empty" : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, "[UDT]");
        } else {
          this.logger.info(`Skull count reset to ${dataSkullDropCount}`, "[UDT]");
        }
        this.towerSkullDropCount = dataSkullDropCount;
      }
    }
    logTowerResponse(receivedData) {
      const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
      if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
        return;
      }
      if (this.responseProcessor.isBatteryResponse(cmdKey)) {
        return;
      }
      this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT]");
    }
    handleDisconnection() {
      this.isConnected = false;
      this.isCalibrated = false;
      this.performingCalibration = false;
      this.performingLongCommand = false;
      this.stopConnectionMonitoring();
      this.lastBatteryHeartbeat = 0;
      this.lastSuccessfulCommand = 0;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      this.deviceInformation = {};
      this.callbacks.onTowerDisconnect();
    }
    startConnectionMonitoring() {
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval);
      }
      this.connectionMonitorInterval = setInterval(() => {
        this.checkConnectionHealth();
      }, this.connectionMonitorFrequency);
    }
    stopConnectionMonitoring() {
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval);
        this.connectionMonitorInterval = null;
      }
    }
    checkConnectionHealth() {
      var _a, _b;
      if (!this.isConnected || !this.TowerDevice) {
        return;
      }
      if (!this.TowerDevice.gatt.connected) {
        this.logger.warn("GATT connection lost detected during health check", "[UDT]");
        this.handleDisconnection();
        return;
      }
      if (this.enableBatteryHeartbeatMonitoring) {
        const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
        const timeoutThreshold = this.performingLongCommand ? this.longTowerCommandTimeout : this.batteryHeartbeatTimeout;
        if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
          const operationContext = this.performingLongCommand ? " during long command operation" : "";
          this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, "[UDT]");
          if (this.performingLongCommand) {
            this.logger.info("Ignoring battery heartbeat timeout during long command - this is expected behavior", "[UDT]");
            return;
          }
          if (this.batteryHeartbeatVerifyConnection) {
            this.logger.info("Verifying tower connection status before triggering disconnection...", "[UDT]");
            if (((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) && this.rxCharacteristic) {
              this.logger.info("GATT connection and characteristics still available - heartbeat timeout may be temporary", "[UDT]");
              this.lastBatteryHeartbeat = Date.now();
              this.logger.info("Reset battery heartbeat timer - will monitor for another timeout period", "[UDT]");
              return;
            }
          }
          this.logger.warn("Tower possibly disconnected due to battery depletion or power loss", "[UDT]");
          this.handleDisconnection();
          return;
        }
      }
      const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
      if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
        this.logger.warn("General connection timeout detected - no responses received", "[UDT]");
        this.logger.warn("Heartbeat timeout - connection appears lost", "[UDT]");
        this.handleDisconnection();
      }
    }
    setConnectionMonitoring(enabled) {
      this.enableConnectionMonitoring = enabled;
      if (enabled && this.isConnected) {
        this.startConnectionMonitoring();
      } else {
        this.stopConnectionMonitoring();
      }
    }
    configureConnectionMonitoring(frequency = 2e3, timeout = 3e4) {
      this.connectionMonitorFrequency = frequency;
      this.connectionTimeoutThreshold = timeout;
      if (this.enableConnectionMonitoring && this.isConnected) {
        this.startConnectionMonitoring();
      }
    }
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3e3, verifyConnection = true) {
      this.enableBatteryHeartbeatMonitoring = enabled;
      this.batteryHeartbeatTimeout = timeout;
      this.batteryHeartbeatVerifyConnection = verifyConnection;
    }
    async isConnectedAndResponsive() {
      var _a, _b;
      if (!this.isConnected || !((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected)) {
        return false;
      }
      if (!this.txCharacteristic || !this.rxCharacteristic) {
        return false;
      }
      try {
        if (this.txCharacteristic.service && this.rxCharacteristic.service) {
          return true;
        }
      } catch (error) {
        this.logger.warn("GATT characteristics or services no longer accessible", "[UDT]");
        return false;
      }
      return true;
    }
    getConnectionStatus() {
      var _a, _b;
      const now = Date.now();
      const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
      const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
      return {
        isConnected: this.isConnected,
        isGattConnected: ((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) || false,
        isCalibrated: this.isCalibrated,
        lastBatteryHeartbeatMs: timeSinceLastBattery,
        lastCommandResponseMs: timeSinceLastCommand,
        batteryHeartbeatHealthy: timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
        connectionMonitoringEnabled: this.enableConnectionMonitoring,
        batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
        batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
        batteryHeartbeatVerifyConnection: this.batteryHeartbeatVerifyConnection,
        connectionTimeoutMs: this.connectionTimeoutThreshold
      };
    }
    getDeviceInformation() {
      return __spreadValues({}, this.deviceInformation);
    }
    async readDeviceInformation() {
      var _a, _b;
      if (!((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected)) {
        this.logger.warn("Cannot read device information - not connected", "[UDT]");
        return;
      }
      try {
        this.logger.info("Reading device information service...", "[UDT]");
        const disService = await this.TowerDevice.gatt.getPrimaryService(DIS_SERVICE_UUID);
        this.deviceInformation = {};
        const characteristicMap = [
          { uuid: DIS_MANUFACTURER_NAME_UUID, name: "Manufacturer Name", key: "manufacturerName", logIfMissing: true },
          { uuid: DIS_MODEL_NUMBER_UUID, name: "Model Number", key: "modelNumber", logIfMissing: true },
          { uuid: DIS_SERIAL_NUMBER_UUID, name: "Serial Number", key: "serialNumber", logIfMissing: false },
          { uuid: DIS_HARDWARE_REVISION_UUID, name: "Hardware Revision", key: "hardwareRevision", logIfMissing: true },
          { uuid: DIS_FIRMWARE_REVISION_UUID, name: "Firmware Revision", key: "firmwareRevision", logIfMissing: true },
          { uuid: DIS_SOFTWARE_REVISION_UUID, name: "Software Revision", key: "softwareRevision", logIfMissing: true },
          { uuid: DIS_SYSTEM_ID_UUID, name: "System ID", key: "systemId", logIfMissing: false },
          { uuid: DIS_IEEE_REGULATORY_UUID, name: "IEEE Regulatory", key: "ieeeRegulatory", logIfMissing: false },
          { uuid: DIS_PNP_ID_UUID, name: "PnP ID", key: "pnpId", logIfMissing: false }
        ];
        for (const { uuid, name, key, logIfMissing } of characteristicMap) {
          try {
            const characteristic = await disService.getCharacteristic(uuid);
            const value = await characteristic.readValue();
            if (uuid === DIS_SYSTEM_ID_UUID || uuid === DIS_PNP_ID_UUID) {
              const hexValue = Array.from(new Uint8Array(value.buffer)).map((b) => b.toString(16).padStart(2, "0")).join(":");
              this.logger.info(`Device ${name}: ${hexValue}`, "[UDT]");
              this.deviceInformation[key] = hexValue;
            } else {
              const textValue = new TextDecoder().decode(value);
              this.logger.info(`Device ${name}: ${textValue}`, "[UDT]");
              this.deviceInformation[key] = textValue;
            }
          } catch (error) {
            if (logIfMissing) {
              this.logger.debug(`Device ${name} characteristic not available`, "[UDT]");
            }
          }
        }
        this.deviceInformation.lastUpdated = /* @__PURE__ */ new Date();
      } catch (error) {
        this.logger.debug("Device Information Service not available", "[UDT]");
      }
    }
    async cleanup() {
      this.logger.info("Cleaning up UdtBleConnection instance", "[UDT]");
      this.stopConnectionMonitoring();
      if (this.TowerDevice) {
        this.TowerDevice.removeEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
      }
      if (navigator.bluetooth) {
        navigator.bluetooth.removeEventListener("availabilitychanged", this.bleAvailabilityChange);
      }
      if (this.isConnected) {
        await this.disconnect();
      }
    }
  };

  // src/udtCommandFactory.ts
  var UdtCommandFactory = class {
    /**
     * Creates a light command packet from a lights configuration object.
     * @param lights - Light configuration specifying doorway, ledge, and base lights
     * @returns Command packet for controlling tower lights
     */
    createLightPacketCommand(lights2) {
      let packetPos = null;
      const command = new Uint8Array(20);
      const doorways = lights2 == null ? void 0 : lights2.doorway;
      const ledges = lights2 == null ? void 0 : lights2.ledge;
      const bases = lights2 == null ? void 0 : lights2.base;
      doorways && doorways.forEach((dlt) => {
        packetPos = LIGHT_PACKETS.doorway[dlt.level][dlt.position];
        const shouldBitShift = DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
        command[packetPos] += LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 16 : 1);
      });
      ledges && ledges.forEach((llt) => {
        packetPos = LIGHT_PACKETS.ledge[llt.position];
        const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
        command[packetPos] += LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 16 : 1);
      });
      bases && bases.forEach((blt) => {
        packetPos = LIGHT_PACKETS.base[blt.position.side][blt.position.level];
        const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
        command[packetPos] += LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 16 : 1);
      });
      return command;
    }
    /**
     * Creates a light override command packet.
     * @param lightOverride - Light override value to send
     * @returns Command packet for light override
     */
    createLightOverrideCommand(lightOverride) {
      const lightOverrideCommand = new Uint8Array(20);
      lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
      return lightOverrideCommand;
    }
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
      const rotateCmd = new Uint8Array(20);
      rotateCmd[DRUM_PACKETS.topMiddle] = drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
      rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
      return rotateCmd;
    }
    /**
     * Creates a sound command packet for playing tower audio.
     * @param soundIndex - Index of the sound to play from the audio library
     * @returns Command packet for playing sound
     */
    createSoundCommand(soundIndex) {
      const soundCommand = new Uint8Array(20);
      const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, "0"));
      soundCommand[AUDIO_COMMAND_POS] = sound;
      return soundCommand;
    }
    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket, currentPositions) {
      commandPacket[DRUM_PACKETS.topMiddle] = currentPositions.topMiddle;
      commandPacket[DRUM_PACKETS.bottom] = currentPositions.bottom;
    }
    /**
     * Creates a combined command packet by merging rotation, light, and sound commands.
     * @param rotateCommand - Rotation command packet
     * @param lightCommand - Light command packet
     * @param soundCommand - Optional sound command packet
     * @returns Combined command packet
     */
    createMultiCommand(rotateCommand, lightCommand, soundCommand) {
      const multiCmd = new Uint8Array(20);
      for (let index = 0; index < 20; index++) {
        multiCmd[index] = rotateCommand[index] | lightCommand[index];
      }
      if (soundCommand) {
        multiCmd[AUDIO_COMMAND_POS] = multiCmd[AUDIO_COMMAND_POS] | soundCommand[AUDIO_COMMAND_POS];
      }
      return multiCmd;
    }
    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue) {
      return new Uint8Array([commandValue]);
    }
  };

  // src/udtCommandQueue.ts
  var CommandQueue = class {
    // 30 seconds
    constructor(logger2, sendCommandFn) {
      this.logger = logger2;
      this.sendCommandFn = sendCommandFn;
      this.queue = [];
      this.currentCommand = null;
      this.timeoutHandle = null;
      this.isProcessing = false;
      this.timeoutMs = 3e4;
    }
    /**
     * Enqueue a command for processing
     */
    async enqueue(command, description) {
      return new Promise((resolve, reject) => {
        const queuedCommand = {
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          command,
          timestamp: Date.now(),
          resolve,
          reject,
          description
        };
        this.queue.push(queuedCommand);
        this.logger.debug(`Command queued: ${description || "unnamed"} (queue size: ${this.queue.length})`, "[UDT]");
        if (!this.isProcessing) {
          this.processNext();
        }
      });
    }
    /**
     * Process the next command in the queue
     */
    async processNext() {
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }
      this.isProcessing = true;
      this.currentCommand = this.queue.shift();
      const { id, command, description, resolve, reject } = this.currentCommand;
      this.logger.debug(`Processing command: ${description || id}`, "[UDT]");
      try {
        this.timeoutHandle = setTimeout(() => {
          this.onTimeout();
        }, this.timeoutMs);
        await this.sendCommandFn(command);
      } catch (error) {
        this.clearTimeout();
        this.currentCommand = null;
        this.isProcessing = false;
        reject(error);
        this.processNext();
      }
    }
    /**
     * Called when a tower response is received
     */
    onResponse() {
      if (this.currentCommand) {
        this.clearTimeout();
        const { resolve, description, id } = this.currentCommand;
        this.logger.debug(`Command completed: ${description || id}`, "[UDT]");
        this.currentCommand = null;
        this.isProcessing = false;
        resolve();
        this.processNext();
      }
    }
    /**
     * Handle command timeout
     */
    onTimeout() {
      if (this.currentCommand) {
        const { description, id } = this.currentCommand;
        this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, "[UDT]");
        this.currentCommand.resolve();
        this.currentCommand = null;
        this.isProcessing = false;
        this.processNext();
      }
    }
    /**
     * Clear the current timeout
     */
    clearTimeout() {
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
      }
    }
    /**
     * Clear all pending commands
     */
    clear() {
      this.clearTimeout();
      this.queue.forEach((cmd) => {
        cmd.reject(new Error("Command queue cleared"));
      });
      this.queue = [];
      if (this.currentCommand) {
        this.currentCommand.reject(new Error("Command queue cleared"));
      }
      this.currentCommand = null;
      this.isProcessing = false;
      this.logger.debug("Command queue cleared", "[UDT]");
    }
    /**
     * Get queue status for debugging
     */
    getStatus() {
      return {
        queueLength: this.queue.length,
        isProcessing: this.isProcessing,
        currentCommand: this.currentCommand ? {
          id: this.currentCommand.id,
          description: this.currentCommand.description,
          timestamp: this.currentCommand.timestamp
        } : null
      };
    }
  };

  // src/udtTowerCommands.ts
  var UdtTowerCommands = class {
    constructor(dependencies) {
      this.deps = dependencies;
      this.commandQueue = new CommandQueue(
        this.deps.logger,
        (command) => this.sendTowerCommandDirect(command)
      );
    }
    /**
     * Sends a command packet to the tower via the command queue
     * @param command - The command packet to send to the tower
     * @param description - Optional description for logging
     * @returns Promise that resolves when command is completed
     */
    async sendTowerCommand(command, description) {
      return await this.commandQueue.enqueue(command, description);
    }
    /**
     * Directly sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * This method is used internally by the command queue.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    async sendTowerCommandDirect(command) {
      var _a, _b, _c;
      try {
        const cmdStr = this.deps.responseProcessor.commandToPacketString(command);
        this.deps.logDetail && this.deps.logger.debug(`packet(s) sent: ${cmdStr}`, "[UDT]");
        if (!this.deps.bleConnection.txCharacteristic || !this.deps.bleConnection.isConnected) {
          this.deps.logger.warn("Tower is not connected", "[UDT]");
          return;
        }
        await this.deps.bleConnection.txCharacteristic.writeValue(command);
        this.deps.retrySendCommandCount.value = 0;
        this.deps.bleConnection.lastSuccessfulCommand = Date.now();
      } catch (error) {
        this.deps.logger.error(`command send error: ${error}`, "[UDT]");
        const errorMsg = (_a = error == null ? void 0 : error.message) != null ? _a : new String(error);
        const wasCancelled = errorMsg.includes("User cancelled");
        const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;
        const isDisconnected = errorMsg.includes("Cannot read properties of null") || errorMsg.includes("GATT Server is disconnected") || errorMsg.includes("Device is not connected") || !((_c = (_b = this.deps.bleConnection.TowerDevice) == null ? void 0 : _b.gatt) == null ? void 0 : _c.connected);
        if (isDisconnected) {
          this.deps.logger.warn("Disconnect detected during command send", "[UDT]");
          await this.deps.bleConnection.disconnect();
          return;
        }
        if (!maxRetriesReached && this.deps.bleConnection.isConnected && !wasCancelled) {
          this.deps.logger.info(`retrying tower command attempt ${this.deps.retrySendCommandCount.value + 1}`, "[UDT]");
          this.deps.retrySendCommandCount.value++;
          setTimeout(() => {
            this.sendTowerCommandDirect(command);
          }, 250 * this.deps.retrySendCommandCount.value);
        } else {
          this.deps.retrySendCommandCount.value = 0;
        }
      }
    }
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    async calibrate() {
      if (!this.deps.bleConnection.performingCalibration) {
        this.deps.logger.info("Performing Tower Calibration", "[UDT]");
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]), "calibrate");
        this.deps.bleConnection.performingCalibration = true;
        this.deps.bleConnection.performingLongCommand = true;
        return;
      }
      this.deps.logger.warn("Tower calibration requested when tower is already performing calibration", "[UDT]");
      return;
    }
    /**
     * Plays a sound from the tower's audio library.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT]");
        return;
      }
      const soundCommand = this.deps.commandFactory.createSoundCommand(soundIndex);
      this.deps.commandFactory.updateCommandWithCurrentDrumPositions(soundCommand, this.deps.currentDrumPositions);
      this.deps.logger.info("Sending sound command", "[UDT]");
      await this.sendTowerCommand(soundCommand, `playSound(${soundIndex})`);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights2) {
      const lightCommand = this.deps.commandFactory.createLightPacketCommand(lights2);
      this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightCommand, this.deps.currentDrumPositions);
      this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights2)}`, "[UDT]");
      this.deps.logger.info("Sending light command", "[UDT]");
      await this.sendTowerCommand(lightCommand, "lights");
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
      const lightOverrideCommand = this.deps.commandFactory.createLightOverrideCommand(light);
      this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightOverrideCommand, this.deps.currentDrumPositions);
      if (soundIndex) {
        lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      this.deps.logger.info("Sending light override" + (soundIndex ? " with sound" : ""), "[UDT]");
      await this.sendTowerCommand(lightOverrideCommand, `lightOverrides(${light}${soundIndex ? `, ${soundIndex}` : ""})`);
    }
    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async rotate(top, middle, bottom, soundIndex) {
      this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, "[UDT]");
      const rotateCommand = this.deps.commandFactory.createRotateCommand(top, middle, bottom);
      if (soundIndex) {
        rotateCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      this.deps.logger.info("Sending rotate command" + (soundIndex ? " with sound" : ""), "[UDT]");
      this.deps.bleConnection.performingLongCommand = true;
      await this.sendTowerCommand(rotateCommand, `rotate(${top}, ${middle}, ${bottom}${soundIndex ? `, ${soundIndex}` : ""})`);
      setTimeout(() => {
        this.deps.bleConnection.performingLongCommand = false;
        this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
      }, this.deps.bleConnection.longTowerCommandTimeout);
      this.deps.currentDrumPositions.topMiddle = rotateCommand[DRUM_PACKETS.topMiddle];
      this.deps.currentDrumPositions.bottom = rotateCommand[DRUM_PACKETS.bottom];
    }
    /**
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     */
    async multiCommand(rotate2, lights2, soundIndex) {
      this.deps.logDetail && this.deps.logger.debug(`MultiCommand Parameters ${JSON.stringify(rotate2)} ${JSON.stringify(lights2)} ${soundIndex}`, "[UDT]");
      const rotateCmd = this.deps.commandFactory.createRotateCommand(rotate2.top, rotate2.middle, rotate2.bottom);
      const lightCmd = this.deps.commandFactory.createLightPacketCommand(lights2);
      const soundCmd = soundIndex ? this.deps.commandFactory.createSoundCommand(soundIndex) : void 0;
      const multiCmd = this.deps.commandFactory.createMultiCommand(rotateCmd, lightCmd, soundCmd);
      await this.sendTowerCommand(multiCmd, "multiCommand");
      const packetMsg = this.deps.responseProcessor.commandToPacketString(multiCmd);
      this.deps.logger.info(`multiple command sent ${packetMsg}`, "[UDT]");
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
      this.deps.logger.info("Tower skull count reset requested", "[UDT]");
      await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]), "resetTowerSkullCount");
    }
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
      const sealNumbers = Array.isArray(seal) ? seal : [seal];
      const SEAL_TO_SIDE = {
        1: "north",
        2: "east",
        3: "south",
        4: "west",
        // Top level
        5: "north",
        6: "east",
        7: "south",
        8: "west",
        // Middle level  
        9: "north",
        10: "east",
        11: "south",
        12: "west"
        // Bottom level
      };
      const SEAL_TO_LEVEL = {
        1: "top",
        2: "top",
        3: "top",
        4: "top",
        5: "middle",
        6: "middle",
        7: "middle",
        8: "middle",
        9: "bottom",
        10: "bottom",
        11: "bottom",
        12: "bottom"
      };
      for (const sealNum of sealNumbers) {
        if (sealNum < 1 || sealNum > 12) {
          this.deps.logger.error(`Invalid seal number: ${sealNum}. Seals must be 1-12.`, "[UDT]");
          return;
        }
      }
      this.deps.logger.info("Playing tower seal sound", "[UDT]");
      await this.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);
      const sidesWithBrokenSeals = [...new Set(sealNumbers.map((sealNum) => SEAL_TO_SIDE[sealNum]))];
      const ledgeLights = [];
      const adjacentSides = {
        north: "east",
        east: "south",
        south: "west",
        west: "north"
      };
      sidesWithBrokenSeals.forEach((side) => {
        ledgeLights.push({ position: side, style: "on" });
        ledgeLights.push({ position: adjacentSides[side], style: "on" });
      });
      const uniqueLedgeLights = ledgeLights.filter(
        (light, index, self) => index === self.findIndex((l) => l.position === light.position)
      );
      const doorwayLights = sealNumbers.map((sealNum) => ({
        level: SEAL_TO_LEVEL[sealNum],
        position: SEAL_TO_SIDE[sealNum],
        style: "breatheFast"
      }));
      const lights2 = {
        ledge: uniqueLedgeLights,
        doorway: doorwayLights
      };
      this.deps.logger.info(`Breaking seal(s) ${sealNumbers.join(", ")} - lighting ledges and doorways with breath effect`, "[UDT]");
      await this.lights(lights2);
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level = 0) {
      const sides = ["north", "east", "south", "west"];
      const getRandomSide = () => sides[Math.floor(Math.random() * sides.length)];
      const currentTop = this.getCurrentDrumPosition("top");
      const currentMiddle = this.getCurrentDrumPosition("middle");
      const currentBottom = this.getCurrentDrumPosition("bottom");
      let topSide, middleSide, bottomSide;
      switch (level) {
        case 0:
          topSide = getRandomSide();
          middleSide = getRandomSide();
          bottomSide = getRandomSide();
          break;
        case 1:
          topSide = getRandomSide();
          middleSide = currentMiddle;
          bottomSide = currentBottom;
          break;
        case 2:
          topSide = currentTop;
          middleSide = getRandomSide();
          bottomSide = currentBottom;
          break;
        case 3:
          topSide = currentTop;
          middleSide = currentMiddle;
          bottomSide = getRandomSide();
          break;
        case 4:
          topSide = getRandomSide();
          middleSide = getRandomSide();
          bottomSide = currentBottom;
          break;
        case 5:
          topSide = getRandomSide();
          middleSide = currentMiddle;
          bottomSide = getRandomSide();
          break;
        case 6:
          topSide = currentTop;
          middleSide = getRandomSide();
          bottomSide = getRandomSide();
          break;
        default:
          this.deps.logger.error("Invalid level parameter for randomRotateLevels. Must be 0-6.", "[UDT]");
          return;
      }
      this.deps.logger.info(`Random rotating levels to: top:${topSide}, middle:${middleSide}, bottom:${bottomSide}`, "[UDT]");
      await this.rotate(topSide, middleSide, bottomSide);
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
      const drumPositions = drumPositionCmds[level];
      const currentValue = level === "bottom" ? this.deps.currentDrumPositions.bottom : level === "top" ? this.deps.currentDrumPositions.topMiddle & 22 : this.deps.currentDrumPositions.topMiddle & 192;
      for (const [side, value] of Object.entries(drumPositions)) {
        if (level === "middle") {
          if ((value & 192) === (currentValue & 192)) {
            return side;
          }
        } else if (level === "top") {
          if ((value & 22) === (currentValue & 22)) {
            return side;
          }
        } else {
          if (value === currentValue) {
            return side;
          }
        }
      }
      return "north";
    }
    /**
     * Called when a tower response is received to notify the command queue
     * This should be called from the BLE connection response handler
     */
    onTowerResponse() {
      this.commandQueue.onResponse();
    }
    /**
     * Get command queue status for debugging
     */
    getQueueStatus() {
      return this.commandQueue.getStatus();
    }
    /**
     * Clear the command queue (for cleanup or error recovery)
     */
    clearQueue() {
      this.commandQueue.clear();
    }
  };

  // src/UltimateDarkTower.ts
  var UltimateDarkTower = class {
    constructor() {
      // tower configuration
      this.retrySendCommandCountRef = { value: 0 };
      this.retrySendCommandMax = 5;
      // tower state
      this.currentDrumPositions = { topMiddle: 16, bottom: 66 };
      this.currentBatteryValue = 0;
      this.previousBatteryValue = 0;
      this.currentBatteryPercentage = 0;
      this.previousBatteryPercentage = 0;
      // call back functions
      // you overwrite these with your own functions 
      // to handle these events in your app
      this.onCalibrationComplete = () => {
      };
      this.onSkullDrop = (_towerSkullCount) => {
      };
      this.onBatteryLevelNotify = (_millivolts) => {
      };
      this.onTowerConnect = () => {
      };
      this.onTowerDisconnect = () => {
      };
      // utility
      this._logDetail = false;
      this.logger = new Logger();
      this.logger.addOutput(new ConsoleOutput());
      const callbacks = {
        onTowerConnect: () => this.onTowerConnect(),
        onTowerDisconnect: () => {
          this.onTowerDisconnect();
          if (this.towerCommands) {
            this.towerCommands.clearQueue();
          }
        },
        onBatteryLevelNotify: (millivolts) => {
          this.previousBatteryValue = this.currentBatteryValue;
          this.currentBatteryValue = millivolts;
          this.previousBatteryPercentage = this.currentBatteryPercentage;
          this.currentBatteryPercentage = this.milliVoltsToPercentageNumber(millivolts);
          this.onBatteryLevelNotify(millivolts);
        },
        onCalibrationComplete: () => this.onCalibrationComplete(),
        onSkullDrop: (towerSkullCount) => this.onSkullDrop(towerSkullCount)
      };
      this.bleConnection = new UdtBleConnection(this.logger, callbacks);
      this.responseProcessor = new TowerResponseProcessor(this.logDetail);
      this.commandFactory = new UdtCommandFactory();
      const commandDependencies = {
        logger: this.logger,
        commandFactory: this.commandFactory,
        bleConnection: this.bleConnection,
        responseProcessor: this.responseProcessor,
        currentDrumPositions: this.currentDrumPositions,
        logDetail: this.logDetail,
        retrySendCommandCount: this.retrySendCommandCountRef,
        retrySendCommandMax: this.retrySendCommandMax
      };
      this.towerCommands = new UdtTowerCommands(commandDependencies);
      callbacks.onTowerResponse = () => this.towerCommands.onTowerResponse();
    }
    get logDetail() {
      return this._logDetail;
    }
    set logDetail(value) {
      this._logDetail = value;
      this.responseProcessor.setDetailedLogging(value);
      if (this.towerCommands) {
        const commandDependencies = {
          logger: this.logger,
          commandFactory: this.commandFactory,
          bleConnection: this.bleConnection,
          responseProcessor: this.responseProcessor,
          currentDrumPositions: this.currentDrumPositions,
          logDetail: this.logDetail,
          retrySendCommandCount: this.retrySendCommandCountRef,
          retrySendCommandMax: this.retrySendCommandMax
        };
        this.towerCommands = new UdtTowerCommands(commandDependencies);
      }
    }
    // Getter methods for connection state
    get isConnected() {
      return this.bleConnection.isConnected;
    }
    get isCalibrated() {
      return this.bleConnection.isCalibrated;
    }
    get performingCalibration() {
      return this.bleConnection.performingCalibration;
    }
    get performingLongCommand() {
      return this.bleConnection.performingLongCommand;
    }
    get towerSkullDropCount() {
      return this.bleConnection.towerSkullDropCount;
    }
    get txCharacteristic() {
      return this.bleConnection.txCharacteristic;
    }
    // Getter methods for battery state
    get currentBattery() {
      return this.currentBatteryValue;
    }
    get previousBattery() {
      return this.previousBatteryValue;
    }
    get currentBatteryPercent() {
      return this.currentBatteryPercentage;
    }
    get previousBatteryPercent() {
      return this.previousBatteryPercentage;
    }
    // Getter/setter methods for connection configuration
    get batteryNotifyFrequency() {
      return this.bleConnection.batteryNotifyFrequency;
    }
    set batteryNotifyFrequency(value) {
      this.bleConnection.batteryNotifyFrequency = value;
    }
    get batteryNotifyOnValueChangeOnly() {
      return this.bleConnection.batteryNotifyOnValueChangeOnly;
    }
    set batteryNotifyOnValueChangeOnly(value) {
      this.bleConnection.batteryNotifyOnValueChangeOnly = value;
    }
    get logTowerResponses() {
      return this.bleConnection.logTowerResponses;
    }
    set logTowerResponses(value) {
      this.bleConnection.logTowerResponses = value;
    }
    get logTowerResponseConfig() {
      return this.bleConnection.logTowerResponseConfig;
    }
    set logTowerResponseConfig(value) {
      this.bleConnection.logTowerResponseConfig = value;
    }
    //#region Tower Commands 
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns {Promise<void>} Promise that resolves when calibration command is sent
     */
    async calibrate() {
      return await this.towerCommands.calibrate();
    }
    /**
     * Plays a sound from the tower's audio library.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
      return await this.towerCommands.playSound(soundIndex);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async Lights(lights2) {
      return await this.towerCommands.lights(lights2);
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
      return await this.towerCommands.lightOverrides(light, soundIndex);
    }
    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async Rotate(top, middle, bottom, soundIndex) {
      return await this.towerCommands.rotate(top, middle, bottom, soundIndex);
    }
    /**
     * DO NOT USE THIS FUNCTION - MULTIPLE SIMULTANEOUS ACTIONS CAN CAUSE TOWER DISCONNECTION
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     * @deprecated SPECIAL USE ONLY - CAN CAUSE DISCONNECTS
     */
    async MultiCommand(rotate2, lights2, soundIndex) {
      return await this.towerCommands.multiCommand(rotate2, lights2, soundIndex);
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
      return await this.towerCommands.resetTowerSkullCount();
    }
    //#endregion
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
      return await this.towerCommands.breakSeal(seal);
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level = 0) {
      return await this.towerCommands.randomRotateLevels(level);
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
      return this.towerCommands.getCurrentDrumPosition(level);
    }
    //#region bluetooth
    /**
     * Establishes a Bluetooth connection to the Dark Tower device.
     * Initializes GATT services, characteristics, and starts connection monitoring.
     * @returns {Promise<void>} Promise that resolves when connection is established
     */
    async connect() {
      await this.bleConnection.connect();
    }
    /**
     * Disconnects from the tower device and cleans up resources.
     * @returns {Promise<void>} Promise that resolves when disconnection is complete
     */
    async disconnect() {
      await this.bleConnection.disconnect();
    }
    //#endregion
    //#region utility
    /**
     * Configure logger outputs for this UltimateDarkTower instance
     * @param {LogOutput[]} outputs - Array of log outputs to use (e.g., ConsoleOutput, DOMOutput)
     */
    setLoggerOutputs(outputs) {
      this.logger.outputs = [];
      outputs.forEach((output) => this.logger.addOutput(output));
    }
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param {Uint8Array} command - The command packet to send to the tower
     * @returns {Promise<void>} Promise that resolves when command is sent successfully
     */
    async sendTowerCommand(command) {
      return await this.towerCommands.sendTowerCommand(command);
    }
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command) {
      return this.responseProcessor.commandToPacketString(command);
    }
    /**
     * Converts battery voltage in millivolts to percentage.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv) {
      return this.responseProcessor.milliVoltsToPercentage(mv);
    }
    //#endregion
    //#region Connection Management
    /**
     * Enable or disable connection monitoring
     * @param {boolean} enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled) {
      this.bleConnection.setConnectionMonitoring(enabled);
    }
    /**
     * Configure connection monitoring parameters
     * @param {number} [frequency=2000] - How often to check connection (milliseconds)
     * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency = 2e3, timeout = 3e4) {
      this.bleConnection.configureConnectionMonitoring(frequency, timeout);
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3e3, verifyConnection = true) {
      this.bleConnection.configureBatteryHeartbeatMonitoring(enabled, timeout, verifyConnection);
    }
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    async isConnectedAndResponsive() {
      return await this.bleConnection.isConnectedAndResponsive();
    }
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus() {
      return this.bleConnection.getConnectionStatus();
    }
    //#endregion
    /**
     * Converts millivolts to percentage number (0-100).
     * @param mv - Battery voltage in millivolts
     * @returns Battery percentage as number (0-100)
     */
    milliVoltsToPercentageNumber(mv) {
      const batLevel = mv ? mv / 3 : 0;
      const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
      return levels.length * 5;
    }
    //#region cleanup
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
      this.logger.info("Cleaning up UltimateDarkTower instance", "[UDT]");
      this.towerCommands.clearQueue();
      await this.bleConnection.cleanup();
    }
    //#endregion
  };
  var UltimateDarkTower_default = UltimateDarkTower;

  // src/index.ts
  var src_default = UltimateDarkTower_default;

  // examples/controller/TowerController.ts
  var Tower = new src_default();
  var sharedDOMOutput;
  var initializeLogger = () => {
    sharedDOMOutput = new DOMOutput("log-container", 1e3);
    Tower.setLoggerOutputs([new ConsoleOutput(), sharedDOMOutput]);
    Tower.logDetail = true;
    logger.addOutput(sharedDOMOutput);
    logger.info("Logger initialized with DOM output", "[TC]");
    window.sharedDOMOutput = sharedDOMOutput;
    window.towerDOMOutput = sharedDOMOutput;
    window.loggerDOMOutput = sharedDOMOutput;
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLogger);
  } else {
    initializeLogger();
  }
  window.TOWER_AUDIO_LIBRARY = TOWER_AUDIO_LIBRARY;
  window.TOWER_LIGHT_SEQUENCES = TOWER_LIGHT_SEQUENCES;
  window.LIGHT_EFFECTS = LIGHT_EFFECTS;
  window.Tower = Tower;
  window.Tower = Tower;
  window.logger = logger;
  var updateSkullDropCount = (count) => {
    const el = document.getElementById("skull-count");
    if (el) {
      el.innerText = count.toString();
    }
  };
  Tower.onSkullDrop = updateSkullDropCount;
  async function connectToTower() {
    logger.info("Attempting to connect to tower...", "[TC]");
    try {
      await Tower.connect();
    } catch (error) {
      logger.error(`Connection failed: ${error}`, "[TC]");
    }
  }
  var onTowerConnected = () => {
    var _a;
    const el = document.getElementById("tower-connection-state");
    if (el) {
      el.innerText = "Tower Connected";
      el.style.background = "rgb(2 255 14 / 30%)";
    }
    logger.info("Tower connected successfully", "[TC]");
    Tower.batteryNotifyFrequency = 1e3;
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    const selectedValue = (_a = Array.from(batteryFilterRadios).find((radio) => radio.checked)) == null ? void 0 : _a.value;
    Tower.batteryNotifyOnValueChangeOnly = selectedValue === "changes";
    updateBatteryTrend();
  };
  Tower.onTowerConnect = onTowerConnected;
  var onTowerDisconnected = () => {
    const el = document.getElementById("tower-connection-state");
    if (el) {
      el.innerText = "Tower Disconnected";
      el.style.background = "rgb(255 1 1 / 30%)";
    }
    logger.warn("Tower disconnected", "[TC]");
  };
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
  var onCalibrationComplete = () => {
    const el = document.getElementById("calibrating-message");
    if (el) {
      el.classList.add("hide");
    }
  };
  Tower.onCalibrationComplete = onCalibrationComplete;
  var updateBatteryTrend = () => {
    const trendElement = document.getElementById("batteryTrend");
    if (!trendElement)
      return;
    const currentBatteryPercent = Tower.currentBatteryPercent;
    const previousBatteryPercent = Tower.previousBatteryPercent;
    if (previousBatteryPercent === 0) {
      trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">\u2192</span>';
      return;
    }
    if (currentBatteryPercent > previousBatteryPercent) {
      trendElement.innerHTML = '<span style="color: #10b981; font-size: 16px;">\u2191</span>';
    } else if (currentBatteryPercent < previousBatteryPercent) {
      trendElement.innerHTML = '<span style="color: #fbbf24; font-size: 16px;">\u2193</span>';
    } else {
      trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">\u2192</span>';
    }
  };
  var onBatteryLevelNotify = (millivolts) => {
    const el = document.getElementById("battery");
    if (el) {
      el.innerText = Tower.milliVoltsToPercentage(millivolts).toString();
    }
    updateBatteryTrend();
  };
  Tower.onBatteryLevelNotify = onBatteryLevelNotify;
  async function resetSkullCount() {
    if (!Tower.isConnected) {
      return;
    }
    Tower.resetTowerSkullCount();
    updateSkullDropCount(0);
  }
  var playSound = () => {
    const select = document.getElementById("sounds");
    Tower.playSound(Number(select.value));
  };
  var overrides = () => {
    const select = document.getElementById("lightOverrideDropDown");
    Tower.lightOverrides(Number(select.value));
  };
  var rotate = () => {
    const top = document.getElementById("top");
    const middle = document.getElementById("middle");
    const bottom = document.getElementById("bottom");
    const sound = document.getElementById("sounds");
    Tower.Rotate(
      top.value,
      middle.value,
      bottom.value,
      Number(sound.value)
    );
  };
  var randomizeLevels = () => {
    const select = document.getElementById("randomLevels");
    const levelValue = parseInt(select.value);
    if (levelValue === -1) {
      logger.warn("No level selected for randomization", "[TC]");
      return;
    }
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    Tower.randomRotateLevels(levelValue);
  };
  var breakSeal = async () => {
    const select = document.getElementById("sealSelect");
    const sealValue = select.value;
    if (!sealValue) {
      logger.warn("No seal selected", "[TC]");
      return;
    }
    const sealMap = {
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
      clearAllLightCheckboxes();
      await Tower.breakSeal(sealNumber);
    }
  };
  var clearAllLightCheckboxes = () => {
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.removeAttribute("data-light-style");
    });
  };
  var allLightsOn = () => {
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = true;
    });
    lights();
  };
  var allLightsOff = () => {
    clearAllLightCheckboxes();
    lights();
  };
  var clearAllLights = async () => {
    clearAllLightCheckboxes();
    const allLightsOff2 = {
      doorway: [
        { position: "north", level: "top", style: "off" },
        { position: "north", level: "middle", style: "off" },
        { position: "north", level: "bottom", style: "off" },
        { position: "east", level: "top", style: "off" },
        { position: "east", level: "middle", style: "off" },
        { position: "east", level: "bottom", style: "off" },
        { position: "south", level: "top", style: "off" },
        { position: "south", level: "middle", style: "off" },
        { position: "south", level: "bottom", style: "off" },
        { position: "west", level: "top", style: "off" },
        { position: "west", level: "middle", style: "off" },
        { position: "west", level: "bottom", style: "off" }
      ],
      ledge: [
        { position: "north", style: "off" },
        { position: "east", style: "off" },
        { position: "south", style: "off" },
        { position: "west", style: "off" }
      ],
      base: [
        { position: { side: "north", level: "top" }, style: "off" },
        { position: { side: "north", level: "bottom" }, style: "off" },
        { position: { side: "east", level: "top" }, style: "off" },
        { position: { side: "east", level: "bottom" }, style: "off" },
        { position: { side: "south", level: "top" }, style: "off" },
        { position: { side: "south", level: "bottom" }, style: "off" },
        { position: { side: "west", level: "top" }, style: "off" },
        { position: { side: "west", level: "bottom" }, style: "off" }
      ]
    };
    await Tower.Lights(allLightsOff2);
    logger.info("All lights cleared", "[TC]");
  };
  var singleLight = (el) => {
    let style = "off";
    if (el.checked) {
      const ls = document.getElementById("lightStyles");
      if (ls && ls.selectedIndex >= 0) {
        style = ls.options[ls.selectedIndex].innerHTML;
      }
    }
    el.setAttribute("data-light-style", style);
    lights();
  };
  var lights = () => {
    var _a;
    const lightStyleSelect = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a = lightStyleSelect == null ? void 0 : lightStyleSelect.options[lightStyleSelect.selectedIndex]) == null ? void 0 : _a.textContent) || "off";
    const allCheckedLights = document.querySelectorAll('input[type="checkbox"][data-light-type]:checked');
    allCheckedLights.forEach((checkbox) => {
      checkbox.setAttribute("data-light-style", selectedLightStyle);
    });
    const doorwayLights = getDoorwayLights();
    const ledgeLights = getLedgeLights();
    const baseLights = getBaseLights();
    const allLights = { doorway: doorwayLights, ledge: ledgeLights, base: baseLights };
    Tower.Lights(allLights);
  };
  var getDoorwayLights = () => {
    var _a;
    const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked';
    const checked = document.querySelectorAll(qs);
    const ls = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a = ls == null ? void 0 : ls.options[ls.selectedIndex]) == null ? void 0 : _a.textContent) || "off";
    let doorwayCmds = [];
    Array.from(checked).forEach((cb) => {
      let { lightSide, lightStyle, lightLevel } = getDataAttributes(cb);
      if (lightStyle !== selectedLightStyle) {
        lightStyle = selectedLightStyle;
        cb.setAttribute("data-light-style", lightStyle);
      }
      if (lightSide && lightLevel && lightStyle) {
        doorwayCmds.push({ position: lightSide, level: lightLevel, style: lightStyle });
      }
    });
    return doorwayCmds;
  };
  var getLedgeLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="ledge"]:checked';
    const checked = document.querySelectorAll(qs);
    let ledgeCmds = [];
    Array.from(checked).forEach((cb) => {
      const { lightSide, lightStyle } = getDataAttributes(cb);
      if (lightSide && lightStyle) {
        ledgeCmds.push({ position: lightSide, style: lightStyle });
      }
    });
    return ledgeCmds;
  };
  var getBaseLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="base"]:checked';
    const checked = document.querySelectorAll(qs);
    let baseCmds = [];
    Array.from(checked).forEach((cb) => {
      const { lightSide, lightStyle, lightBaseLocation } = getDataAttributes(cb);
      if (lightSide && lightStyle && lightBaseLocation) {
        baseCmds.push({
          position: {
            side: lightSide,
            level: lightBaseLocation
          },
          style: lightStyle
        });
      }
    });
    return baseCmds;
  };
  var getDataAttributes = (el) => {
    const lightType = el.getAttribute("data-light-type");
    const lightSide = el.getAttribute("data-light-location");
    const lightLevel = el.getAttribute("data-light-level");
    const lightBaseLocation = el.getAttribute("data-light-base-location");
    const lightStyle = el.getAttribute("data-light-style");
    return {
      lightSide,
      lightLevel,
      lightBaseLocation,
      lightStyle,
      lightType
    };
  };
  window.connectToTower = connectToTower;
  window.calibrate = calibrate;
  window.resetSkullCount = resetSkullCount;
  window.playSound = playSound;
  window.singleLight = singleLight;
  window.lights = lights;
  window.overrides = overrides;
  window.rotate = rotate;
  window.breakSeal = breakSeal;
  window.clearAllLights = clearAllLights;
  window.clearAllLightCheckboxes = clearAllLightCheckboxes;
  window.allLightsOn = allLightsOn;
  window.allLightsOff = allLightsOff;
  window.randomizeLevels = randomizeLevels;
})();
//# sourceMappingURL=TowerController.js.map
