"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights,
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
 *
 * Known Issues:
 *    Tower command complete response is not being considered. Async Await is working
 *    only on the fact that a command was sent, which is pretty much immediate, so we need
 *    to rework this a bit to take into account when a command is complete. This is all
 *    part of work still to be done.
 */
class UltimateDarkTower {
    constructor() {
        // ble
        this.TowerDevice = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        // tower configuration
        this.batteryNotifyFrequency = 15 * 1000; // Tower sends these every ~200ms
        this.batteryNotifyOnValueChangeOnly = false; // overrides frequency setting if true
        this.retrySendCommandCount = 0;
        this.retrySendCommandMax = 5;
        // tower state
        this.currentDrumPositions = { topMiddle: 0x10, bottom: 0x42 };
        this.isCalibrated = false;
        this.isConnected = false;
        this.towerSkullDropCount = -1;
        this.performingCalibration = false;
        this.lastBatteryNotification = 0;
        // call back functions
        // you overwrite these with your own functions 
        // to handle these events in your app
        this.onCalibrationComplete = () => { };
        this.onSkullDrop = (towerSkullCount) => { };
        this.onBatteryLevelNotify = (millivolts) => { };
        this.onTowerConnect = () => { };
        this.onTowerDisconnect = () => { };
        // utility
        this.logDetail = false;
        this.logTowerResponses = true;
        // allows you to log specific responses
        // [Differential Readings] & [Battery] are sent continously so
        // setting their defaults to false.
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
            LOG_ALL: false, // overrides individual
        };
        // handle tower response
        this.onRxCharacteristicValueChanged = (event) => {
            // convert data to byte array
            // @ts-ignore-next-line
            let receivedData = [];
            for (var i = 0; i < event.target.value.byteLength; i++) {
                receivedData[i] = event.target.value.getUint8(i);
            }
            const { cmdKey } = this.getTowerCommand(receivedData[0]);
            // log response
            if (this.logTowerResponses) {
                this.logTowerResponse(receivedData);
            }
            // tower state response check
            const isCommandTowerState = cmdKey === constants_1.TC.STATE;
            if (isCommandTowerState) {
                this.handleTowerStateResponse(receivedData);
            }
            ;
            // battery 
            const isBatteryResponse = cmdKey === constants_1.TC.BATTERY;
            if (isBatteryResponse) {
                const millivolts = this.getMilliVoltsFromTowerReponse(receivedData);
                const batteryPercentage = this.millVoltsToPercentage(millivolts);
                const didBatteryLevelChange = this.lastBatteryPercentage !== batteryPercentage;
                const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);
                const shouldNotify = this.batteryNotifyOnValueChangeOnly ?
                    didBatteryLevelChange :
                    batteryNotifyFrequencyPassed;
                if (shouldNotify) {
                    console.log('[UDT] Tower response: ', ...this.commandToString(receivedData));
                    this.lastBatteryNotification = Date.now();
                    this.lastBatteryPercentage = batteryPercentage;
                    this.onBatteryLevelNotify(millivolts);
                }
            }
        };
        this.createLightPacketCommand = (lights) => {
            let packetPos = null;
            const command = new Uint8Array(20);
            const doorways = lights === null || lights === void 0 ? void 0 : lights.doorway;
            const ledges = lights === null || lights === void 0 ? void 0 : lights.ledge;
            const bases = lights === null || lights === void 0 ? void 0 : lights.base;
            doorways && doorways.forEach(dlt => {
                packetPos = constants_1.LIGHT_PACKETS.doorway[dlt.level][dlt.position];
                const shouldBitShift = constants_1.DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            ledges && ledges.forEach(llt => {
                packetPos = constants_1.LIGHT_PACKETS.ledge[llt.position];
                const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            bases && bases.forEach(blt => {
                packetPos = constants_1.LIGHT_PACKETS.base[blt.position.side][blt.position.level];
                const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            return command;
        };
        //#endregion
    }
    //#region Tower Commands 
    async calibrate() {
        if (!this.performingCalibration) {
            console.log('[UDT] Performing Tower Calibration');
            await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.calibration]));
            // flag to look for calibration complete tower response
            this.performingCalibration = true;
            return;
        }
        console.log('[UDT] Tower calibration requested when tower is already performing calibration');
        return;
    }
    //TODO: currently not working - investigating
    async requestTowerState() {
        console.log('[UDT] Requesting Tower State');
        await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.towerState]));
    }
    async playSound(soundIndex) {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(constants_1.TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            console.log('[UDT] attempt to play invalid sound index', soundIndex);
            return;
        }
        const soundCommand = this.createSoundCommand(soundIndex);
        this.updateCommandWithCurrentDrumPositions(soundCommand);
        console.log('[UDT] Sending sound command');
        await this.sendTowerCommand(soundCommand);
    }
    async Lights(lights) {
        const lightCommand = this.createLightPacketCommand(lights);
        this.updateCommandWithCurrentDrumPositions(lightCommand);
        this.logDetail && console.log('[UDT] Light Parameter', lights);
        console.log('[UDT] Sending light command');
        await this.sendTowerCommand(lightCommand);
    }
    async lightOverrides(light, soundIndex) {
        const lightOverrideCommand = this.createLightOverrideCommand(light);
        this.updateCommandWithCurrentDrumPositions(lightOverrideCommand);
        if (soundIndex) {
            lightOverrideCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
        }
        console.log('[UDT] Sending light override' + (soundIndex ? ' with sound' : ''));
        await this.sendTowerCommand(lightOverrideCommand);
    }
    async Rotate(top, middle, bottom, soundIndex) {
        this.logDetail && console.log(`[UDT] Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${middle}] S[${soundIndex}]`);
        const rotateCommand = this.createRotateCommand(top, middle, bottom);
        if (soundIndex) {
            rotateCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
        }
        console.log('[UDT] Sending rotate command' + (soundIndex ? ' with sound' : ''));
        await this.sendTowerCommand(rotateCommand);
        // saving drum positions
        this.currentDrumPositions = {
            topMiddle: rotateCommand[constants_1.DRUM_PACKETS.topMiddle],
            bottom: rotateCommand[constants_1.DRUM_PACKETS.bottom]
        };
    }
    async MultiCommand(rotate, lights, soundIndex) {
        this.logDetail && console.log('[UDT] MultiCommand Parameters', rotate, lights, soundIndex);
        let multiCmd = new Uint8Array(20);
        const rotateCmd = this.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
        const lightCmd = this.createLightPacketCommand(lights);
        // combine commands into single command packet
        for (let index = 0; index < 20; index++) {
            multiCmd[index] = rotateCmd[index] | lightCmd[index];
        }
        // add sound
        if (soundIndex) {
            const soundCmd = this.createSoundCommand(soundIndex);
            multiCmd[constants_1.AUDIO_COMMAND_POS] = multiCmd[constants_1.AUDIO_COMMAND_POS] | soundCmd[constants_1.AUDIO_COMMAND_POS];
        }
        this.sendTowerCommand(multiCmd);
        const packetMsg = this.commandToPacketString(multiCmd);
        console.log('[UDT] multiple command sent', packetMsg);
    }
    async resetTowerSkullCount() {
        console.log('[UDT] Tower skull count reset requested');
        await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.resetCounter]));
    }
    //#endregion
    //#region future features 
    // TODO: Implement function
    breakSeals(seal) {
        // seals are numbered 1 - 12 with 1/5/8 representing north positions
        // Top: 1-4, Middle: 5-8, Bottom: 9-12
    }
    // TODO: Implement function
    randomizeLevels(level = 0) {
        // 0 = all, 1 = top, 2 = middle, 3 = bottom
        // 4 = top & middle, 5 = top & bottom, 6 = middle & bottom
    }
    //#endregion
    //#region bluetooth
    async connect() {
        console.log("[UDT] Looking for Tower...");
        try {
            // @ts-ignore
            this.TowerDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: constants_1.TOWER_DEVICE_NAME }],
                optionalServices: [constants_1.UART_SERVICE_UUID]
            });
            if (this.TowerDevice === null) {
                console.log("[UDT] Tower not found");
                return;
            }
            // @ts-ignore
            navigator.bluetooth.addEventListener("availabilitychanged", (event) => {
                const availability = event.value;
                console.log('[UDT] ble availability changed', availability);
            });
            console.log("[UDT] Connecting to Tower GATT Server...");
            const server = await this.TowerDevice.gatt.connect();
            console.log("[UDT] Getting Tower Primary Service...");
            const service = await server.getPrimaryService(constants_1.UART_SERVICE_UUID);
            console.log("[UDT] Getting Tower Characteristics...");
            this.txCharacteristic = await service.getCharacteristic(constants_1.UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(constants_1.UART_RX_CHARACTERISTIC_UUID);
            console.log("[UDT] Subscribing to Tower...");
            await this.rxCharacteristic.startNotifications();
            await this.rxCharacteristic.addEventListener("characteristicvaluechanged", this.onRxCharacteristicValueChanged);
            console.log('[UDT] Tower connection complete');
            this.isConnected = true;
            this.onTowerConnect();
        }
        catch (error) {
            console.log('[UDT] Tower Connection Error', error);
            this.isConnected = false;
            this.onTowerDisconnect();
        }
    }
    handleTowerStateResponse(receivedData) {
        const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
        const dataSkullDropCount = receivedData[constants_1.SKULL_DROP_COUNT_POS];
        // check to see if the response for a calibration request
        if (this.performingCalibration) {
            this.performingCalibration = false;
            this.isCalibrated = true;
            this.onCalibrationComplete();
            console.log('[UDT] Tower calibration complete');
        }
        // skull drop check
        // Note: If IR triggers when tower is disconnected it will result in tower sending
        // skull count when tower is reconnected.
        if (dataSkullDropCount !== this.towerSkullDropCount) {
            // don't trigger if skull count is zero, this can happen if the tower is power cycled
            // or when a 'reset' command is sent.
            if (!!dataSkullDropCount) {
                this.onSkullDrop(dataSkullDropCount);
                console.log(`[UDT] Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`);
            }
            else {
                console.log(`[UDT] Skull count reset to ${dataSkullDropCount}`);
            }
            this.towerSkullDropCount = dataSkullDropCount;
        }
    }
    logTowerResponse(receivedData) {
        const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
        const logAll = this.logTowerResponseConfig["LOG_ALL"];
        let canLogThisResponse = this.logTowerResponseConfig[cmdKey] || logAll;
        // in case a command is not known we want to capture its occurance
        if (!cmdKey) {
            canLogThisResponse = true;
        }
        if (!canLogThisResponse) {
            return;
        }
        const isBatteryResponse = cmdKey === constants_1.TC.BATTERY;
        if (isBatteryResponse) {
            return; // logged elsewhere
        }
        console.log('[UDT] Tower response:', ...this.commandToString(receivedData));
    }
    async disconnect() {
        if (!this.TowerDevice) {
            return;
        }
        if (this.TowerDevice.gatt.connected) {
            await this.TowerDevice.gatt.disconnect();
            console.log("[UDT] Tower disconnected");
            this.isConnected = false;
            this.onTowerDisconnect();
        }
    }
    bleAvailabilityChange(event) {
        console.log('[UDT] Bluetooth availability changed', event);
        this.isConnected = !!this.txCharacteristic;
        this.isConnected && this.onTowerConnect();
        !this.isConnected && this.onTowerDisconnect();
    }
    //#endregion
    //#region utility
    async sendTowerCommand(command) {
        var _a;
        try {
            const cmdStr = this.commandToPacketString(command);
            this.logDetail && console.log('[UDT] packet(s) sent:', cmdStr);
            if (!this.txCharacteristic || !this.isConnected) {
                console.log('[UDT] Tower is not connected');
                return;
            }
            await this.txCharacteristic.writeValue(command);
            this.isConnected = true;
            this.retrySendCommandCount = 0;
        }
        catch (error) {
            console.log('[UDT] command send error:', error);
            const errorMsg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : new String(error);
            const wasCancelled = errorMsg.includes('User cancelled');
            const alreadyInProgress = errorMsg.includes('already in progress');
            const maxRetriesReached = this.retrySendCommandCount < this.retrySendCommandMax;
            if (!maxRetriesReached && this.isConnected) {
                console.log(`[UDT] retrying tower command attempt ${this.retrySendCommandCount}`);
                this.retrySendCommandCount++;
                setTimeout(() => {
                    this.sendTowerCommand(command);
                }, 250 * this.retrySendCommandCount);
            }
            const isDisconnected = errorMsg.includes('Cannot read properties of null');
            this.isConnected = !isDisconnected;
        }
    }
    updateCommandWithCurrentDrumPositions(commandPacket) {
        commandPacket[constants_1.DRUM_PACKETS.topMiddle] = this.currentDrumPositions.topMiddle;
        commandPacket[constants_1.DRUM_PACKETS.bottom] = this.currentDrumPositions.bottom;
    }
    createLightOverrideCommand(lightOverride) {
        const lightOverrideCommand = new Uint8Array(20);
        lightOverrideCommand[constants_1.LIGHT_PACKETS.overrides] = lightOverride;
        return lightOverrideCommand;
    }
    createRotateCommand(top, middle, bottom) {
        const rotateCmd = new Uint8Array(20);
        rotateCmd[constants_1.DRUM_PACKETS.topMiddle] =
            constants_1.drumPositionCmds.top[top] | constants_1.drumPositionCmds.middle[middle];
        rotateCmd[constants_1.DRUM_PACKETS.bottom] = constants_1.drumPositionCmds.bottom[bottom];
        return rotateCmd;
    }
    createSoundCommand(soundIndex) {
        const soundCommand = new Uint8Array(20);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[constants_1.AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }
    // TODO: return parsed data values rather than raw packet values
    commandToString(command) {
        const cmdValue = command[0];
        const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);
        switch (cmdKey) {
            case constants_1.TC.STATE:
            case constants_1.TC.INVALID_STATE:
            case constants_1.TC.FAILURE:
            case constants_1.TC.JIGGLE:
            case constants_1.TC.UNEXPECTED:
            case constants_1.TC.DURATION:
            case constants_1.TC.DIFFERENTIAL:
            case constants_1.TC.CALIBRATION:
                return [towerCommand.name, this.commandToPacketString(command)];
                break;
            case constants_1.TC.BATTERY:
                const millivolts = this.getMilliVoltsFromTowerReponse(command);
                const retval = [towerCommand.name, this.millVoltsToPercentage(millivolts)];
                if (this.logDetail) {
                    retval.push(`${millivolts}mv`);
                    retval.push(this.commandToPacketString(command));
                }
                return retval;
                break;
            default:
                return ["Unmapped Response!", this.commandToPacketString(command)];
                break;
        }
    }
    commandToPacketString(command) {
        let cmdStr = "[";
        command.forEach(n => cmdStr += n.toString(16) + ",");
        cmdStr = cmdStr.slice(0, -1) + "]";
        return cmdStr;
    }
    getTowerCommand(cmdValue) {
        const cmdKeys = Object.keys(constants_1.TOWER_MESSAGES);
        const cmdKey = cmdKeys.find(key => constants_1.TOWER_MESSAGES[key].value === cmdValue);
        const command = constants_1.TOWER_MESSAGES[cmdKey];
        return { cmdKey, command };
    }
    getMilliVoltsFromTowerReponse(command) {
        const mv = new Uint8Array(4);
        mv[0] = command[4];
        mv[1] = command[3];
        mv[3] = 0;
        mv[4] = 0;
        var view = new DataView(mv.buffer, 0);
        return view.getUint32(0, true);
    }
    // Tower returns sum total battery level in millivolts
    millVoltsToPercentage(mv) {
        const batLevel = mv ? mv / 3 : 0; // lookup is based on sinlge AA
        const levels = constants_1.VOLTAGE_LEVELS.filter(v => batLevel >= v);
        return `${levels.length * 5}%`;
    }
    ;
}
exports.default = UltimateDarkTower;
//# sourceMappingURL=UltimateDarkTower.js.map