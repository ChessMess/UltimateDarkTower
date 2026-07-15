import {
  UltimateDarkTower,
  BluetoothPlatform,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothTimeoutError,
  BluetoothUserCancelledError,
  BufferOutput,
  TowerState,
  ConnectionStatus,
  DeviceInformation,
  Lights,
  TowerSide,
  SealIdentifier,
  Glyphs,
  LogOutput,
} from "ultimatedarktower";

// ---------------------------------------------------------------------------
// TowerState helpers
// ---------------------------------------------------------------------------

function buildDefaultTowerState(): TowerState {
  const makeLight = () => ({ effect: 0, loop: false });
  const makeLayer = () => ({ light: [makeLight(), makeLight(), makeLight(), makeLight()] });
  const makeDrum = () => ({
    jammed: false,
    calibrated: false,
    position: 0,
    playSound: false,
    reverse: false,
  });
  return {
    drum: [makeDrum(), makeDrum(), makeDrum()],
    layer: [makeLayer(), makeLayer(), makeLayer(), makeLayer(), makeLayer(), makeLayer()],
    audio: { sample: 0, loop: false, volume: 0 },
    beam: { count: 0, fault: false },
    led_sequence: 0,
  } as unknown as TowerState;
}

type BufferOutputType = InstanceType<typeof BufferOutput>;

export interface TowerSnapshot {
  connected: boolean;
  calibrated: boolean;
  performingLongCommand: boolean;
  performingCalibration: boolean;
  battery: {
    currentMillivolts: number;
    previousMillivolts: number;
    currentPercentage: number;
    previousPercentage: number;
  };
  skullDropCount: number;
  connectionStatus: ConnectionStatus | null;
  deviceInfo: DeviceInformation | null;
  towerState: TowerState | null;
  brokenSeals: SealIdentifier[];
  glyphs: Record<string, TowerSide | null>;
  drumPositions: Record<string, TowerSide | null>;
}

export class TowerController {
  private static instance: TowerController | null = null;
  private tower: UltimateDarkTower | null = null;
  private lastTowerState: TowerState | null = null;
  private lastDeviceInfo: DeviceInformation | null = null;
  private lastConnectionStatus: ConnectionStatus | null = null;
  private skullCount = 0;
  private connected = false;
  private calibrated = false;
  private calibrationCompleteResolve: (() => void) | null = null;
  private bufferOutput: BufferOutputType;

  private constructor() {
    this.bufferOutput = new BufferOutput(500);
  }

  static getInstance(): TowerController {
    if (!TowerController.instance) {
      TowerController.instance = new TowerController();
    }
    return TowerController.instance;
  }

  private ensureTower(): UltimateDarkTower {
    if (!this.tower) {
      const platformEnv = process.env.TOWER_PLATFORM;
      const config =
        platformEnv === "node"
          ? { platform: BluetoothPlatform.NODE }
          : platformEnv === "web"
            ? { platform: BluetoothPlatform.WEB }
            : undefined;

      this.tower = new UltimateDarkTower(config);

      this.tower.onTowerConnect = () => {
        this.connected = true;
      };

      this.tower.onTowerDisconnect = () => {
        this.connected = false;
      };

      this.tower.onCalibrationComplete = () => {
        this.calibrated = true;
        if (this.calibrationCompleteResolve) {
          this.calibrationCompleteResolve();
          this.calibrationCompleteResolve = null;
        }
      };

      this.tower.onSkullDrop = (count: number) => {
        this.skullCount = count;
      };

      this.tower.onBatteryLevelNotify = (_millivolts: number) => {
        // Battery values are tracked by the UDT instance properties
      };

      this.tower.onTowerStateUpdate = (
        newState: TowerState,
        _oldState: TowerState,
        _source: string
      ) => {
        this.lastTowerState = newState;
      };
    }
    return this.tower;
  }

  setLoggerOutputs(outputs: LogOutput[]): void {
    this.ensureTower();
    this.tower!.setLoggerOutputs([...outputs, this.bufferOutput]);
  }

  get isConnected(): boolean {
    return this.tower?.isConnected ?? false;
  }

  get isCalibrated(): boolean {
    return this.tower?.isCalibrated ?? false;
  }

  get performingLongCommand(): boolean {
    return this.tower?.performingLongCommand ?? false;
  }

  get performingCalibration(): boolean {
    return this.tower?.performingCalibration ?? false;
  }

  // --- Connection methods ---

  async connect(): Promise<void> {
    const t = this.ensureTower();
    await t.connect();
    this.connected = true;
    this.lastDeviceInfo = t.getDeviceInformation();
    this.lastConnectionStatus = t.getConnectionStatus();
  }

  async disconnect(): Promise<void> {
    if (this.tower) {
      await this.tower.disconnect();
      this.connected = false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.tower) {
      await this.tower.cleanup();
      this.connected = false;
    }
  }

  async isConnectedAndResponsive(): Promise<boolean> {
    if (!this.tower) return false;
    return this.tower.isConnectedAndResponsive();
  }

  getConnectionStatus(): ConnectionStatus | null {
    if (!this.tower) return null;
    this.lastConnectionStatus = this.tower.getConnectionStatus();
    return this.lastConnectionStatus;
  }

  getDeviceInformation(): DeviceInformation | null {
    if (!this.tower) return null;
    this.lastDeviceInfo = this.tower.getDeviceInformation();
    return this.lastDeviceInfo;
  }

  setConnectionMonitoring(enabled: boolean): void {
    this.ensureTower();
    this.tower!.setConnectionMonitoring(enabled);
  }

  configureConnectionMonitoring(frequency?: number, timeout?: number): void {
    this.ensureTower();
    this.tower!.configureConnectionMonitoring(frequency, timeout);
  }

  configureBatteryHeartbeatMonitoring(
    enabled?: boolean,
    timeout?: number,
    verifyConnection?: boolean
  ): void {
    this.ensureTower();
    this.tower!.configureBatteryHeartbeatMonitoring(enabled, timeout, verifyConnection);
  }

  // --- Calibration ---

  async calibrate(): Promise<void> {
    this.requireConnected();
    const calibrationDone = new Promise<void>((resolve) => {
      this.calibrationCompleteResolve = resolve;
    });
    await this.tower!.calibrate();
    await calibrationDone;
  }

  // --- Audio ---

  async playSoundStateful(soundIndex: number, loop?: boolean, volume?: number): Promise<void> {
    this.requireConnected();
    await this.tower!.playSoundStateful(soundIndex, loop, volume);
  }

  // --- Lights ---

  async lights(lights: Lights): Promise<void> {
    this.requireConnected();
    await this.tower!.lights(lights);
  }

  async setLED(
    layerIndex: number,
    lightIndex: number,
    effect: number,
    loop?: boolean
  ): Promise<void> {
    this.requireConnected();
    await this.tower!.setLED(layerIndex, lightIndex, effect, loop);
  }

  async allLightsOn(effect?: number): Promise<void> {
    this.requireConnected();
    await this.tower!.allLightsOn(effect);
  }

  async allLightsOff(): Promise<void> {
    this.requireConnected();
    await this.tower!.allLightsOff();
  }

  async lightOverrides(sequence: number, soundIndex?: number): Promise<void> {
    this.requireConnected();
    await this.tower!.lightOverrides(sequence, soundIndex);
  }

  // --- Drums ---

  async rotateWithState(
    top: TowerSide,
    middle: TowerSide,
    bottom: TowerSide,
    soundIndex?: number
  ): Promise<void> {
    this.requireConnected();
    this.requireCalibrated();
    await this.tower!.rotateWithState(top, middle, bottom, soundIndex);
  }

  async rotateDrumStateful(
    drumIndex: number,
    position: number,
    playSound?: boolean
  ): Promise<void> {
    this.requireConnected();
    this.requireCalibrated();
    await this.tower!.rotateDrumStateful(drumIndex, position, playSound);
  }

  async randomRotateLevels(level?: number): Promise<void> {
    this.requireConnected();
    this.requireCalibrated();
    await this.tower!.randomRotateLevels(level);
  }

  getCurrentDrumPosition(level: "top" | "middle" | "bottom"): TowerSide {
    this.requireConnected();
    return this.tower!.getCurrentDrumPosition(level);
  }

  // --- Seals ---

  async breakSeal(seal: SealIdentifier, volume?: number): Promise<void> {
    this.requireConnected();
    this.requireCalibrated();
    await this.tower!.breakSeal(seal, volume);
  }

  isSealBroken(seal: SealIdentifier): boolean {
    if (!this.tower) return false;
    return this.tower.isSealBroken(seal);
  }

  getBrokenSeals(): SealIdentifier[] {
    if (!this.tower) return [];
    return this.tower.getBrokenSeals();
  }

  resetBrokenSeals(): void {
    if (this.tower) {
      this.tower.resetBrokenSeals();
    }
  }

  getRandomUnbrokenSeal(): SealIdentifier | null {
    if (!this.tower) return null;
    return this.tower.getRandomUnbrokenSeal();
  }

  // --- State & Glyphs ---

  getCurrentTowerState(): TowerState | null {
    if (!this.tower) return null;
    this.lastTowerState = this.tower.getCurrentTowerState();
    return this.lastTowerState;
  }

  async sendTowerState(state: TowerState): Promise<void> {
    this.requireConnected();
    // Guard against null/undefined or partially-shaped state objects.
    // rtdt_pack_state crashes if state.drum is missing — merge with current
    // state (or a safe default) so all required fields are always present.
    const base = this.getCurrentTowerState() ?? buildDefaultTowerState();
    const complete = {
      drum: state?.drum ?? base.drum,
      layer: state?.layer ?? base.layer,
      audio: state?.audio ?? base.audio,
      beam: state?.beam ?? base.beam,
      led_sequence: state?.led_sequence ?? base.led_sequence,
    } as unknown as TowerState;
    await this.tower!.sendTowerState(complete);
  }

  getGlyphPosition(glyph: Glyphs): TowerSide | null {
    if (!this.tower) return null;
    return this.tower.getGlyphPosition(glyph);
  }

  getAllGlyphPositions(): Record<string, TowerSide | null> {
    if (!this.tower) {
      return { cleanse: null, quest: null, battle: null, banner: null, reinforce: null };
    }
    return this.tower.getAllGlyphPositions();
  }

  getGlyphsFacingDirection(direction: TowerSide): Glyphs[] {
    if (!this.tower) return [];
    return this.tower.getGlyphsFacingDirection(direction);
  }

  get towerSkullDropCount(): number {
    return this.tower?.towerSkullDropCount ?? this.skullCount;
  }

  async resetTowerSkullCount(): Promise<void> {
    this.requireConnected();
    await this.tower!.resetTowerSkullCount();
    this.skullCount = 0;
  }

  // --- Snapshot for resources ---

  getSnapshot(): TowerSnapshot {
    return {
      connected: this.isConnected,
      calibrated: this.isCalibrated,
      performingLongCommand: this.performingLongCommand,
      performingCalibration: this.performingCalibration,
      battery: {
        currentMillivolts: this.tower?.currentBattery ?? 0,
        previousMillivolts: this.tower?.previousBattery ?? 0,
        currentPercentage: this.tower?.currentBatteryPercent ?? 0,
        previousPercentage: this.tower?.previousBatteryPercent ?? 0,
      },
      skullDropCount: this.towerSkullDropCount,
      connectionStatus: this.getConnectionStatus(),
      deviceInfo: this.lastDeviceInfo,
      towerState: this.lastTowerState,
      brokenSeals: this.getBrokenSeals(),
      glyphs: this.getAllGlyphPositions(),
      drumPositions: this.getDrumPositionsMap(),
    };
  }

  private getDrumPositionsMap(): Record<string, TowerSide | null> {
    if (!this.tower || !this.isConnected) {
      return { top: null, middle: null, bottom: null };
    }
    try {
      return {
        top: this.tower.getCurrentDrumPosition("top"),
        middle: this.tower.getCurrentDrumPosition("middle"),
        bottom: this.tower.getCurrentDrumPosition("bottom"),
      };
    } catch {
      return { top: null, middle: null, bottom: null };
    }
  }

  // --- Precondition checks ---

  private requireConnected(): void {
    if (!this.tower || !this.isConnected) {
      throw new BluetoothConnectionError("Tower is not connected. Call tower_connect first.");
    }
  }

  private requireCalibrated(): void {
    this.requireConnected();
    if (!this.isCalibrated) {
      throw new BluetoothConnectionError("Tower is not calibrated. Call tower_calibrate first.");
    }
  }
}

/**
 * Wraps a tool handler to catch UDT errors and return MCP-friendly error responses.
 */
export function wrapToolHandler<T>(
  fn: () => Promise<T>
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  return fn()
    .then((result) => ({
      content: [
        {
          type: "text" as const,
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    }))
    .catch((err) => {
      let message = "Unknown error";
      if (err instanceof BluetoothDeviceNotFoundError) {
        message = `Tower not found: ${err.message}`;
      } else if (err instanceof BluetoothTimeoutError) {
        message = `Bluetooth timeout: ${err.message}`;
      } else if (err instanceof BluetoothUserCancelledError) {
        message = `Operation cancelled: ${err.message}`;
      } else if (err instanceof BluetoothConnectionError) {
        message = `Connection error: ${err.message}`;
      } else if (err instanceof Error) {
        message = err.message;
      }
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    });
}
