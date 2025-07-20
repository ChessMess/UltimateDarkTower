# Tower Technical Reference Documentation

## LED Architecture Overview

The Tower uses **24 individually addressable LEDs** organized into 6 logical layers with 4 LEDs each:

-   **Layers 0-2**: Ring LEDs (Top, Middle, Bottom rings)
-   **Layer 3**: Ledge LEDs
-   **Layer 4**: Base1 LEDs
-   **Layer 5**: Base2 LEDs

## Layer to Physical Position Mapping

The `TowerState.layer` array maps to physical tower components:

-   `layer[0]` = **TOP RING** (positions 0-3 = North, East, South, West)
-   `layer[1]` = **MIDDLE RING** (positions 0-3 = North, East, South, West)
-   `layer[2]` = **BOTTOM RING** (positions 0-3 = North, East, South, West)
-   `layer[3]` = **LEDGE** (positions 0-3 = North-East, South-East, South-West, North-West)
-   `layer[4]` = **BASE1** (positions 0-3 = North-East, South-East, South-West, North-West)
-   `layer[5]` = **BASE2** (positions 0-3 = North-East, South-East, South-West, North-West)

### Direction Systems

-   **Ring layers (0-2)**: Cardinal directions (N, E, S, W)
-   **Ledge/Base layers (3-5)**: Ordinal directions (NE, SE, SW, NW)

## LED Channel Lookup Table

The tower converts `(layer * 4) + position` to LED driver channels 0-23:

```
Layer 0: Top Ring    → Channels [0, 3, 2, 1]    (N, E, S, W)
Layer 1: Middle Ring → Channels [7, 6, 5, 4]    (N, E, S, W)  
Layer 2: Bottom Ring → Channels [10, 9, 8, 11]  (N, E, S, W)
Layer 3: Ledge       → Channels [12, 13, 14, 15] (NE, SE, SW, NW)
Layer 4: Base1       → Channels [16, 17, 18, 19] (NE, SE, SW, NW)
Layer 5: Base2       → Channels [20, 21, 22, 23] (NE, SE, SW, NW)
```

## Constants Reference

Tower layer and position constants are defined in `src/udtConstants.ts`:

-   `TOWER_LAYERS` - Maps layer names to indices (0-5)
-   `RING_LIGHT_POSITIONS` - Cardinal direction positions for ring layers
-   `LEDGE_BASE_LIGHT_POSITIONS` - Ordinal direction positions for ledge/base layers
-   `LED_CHANNEL_LOOKUP` - Hardware LED channel mapping array
-   `STATE_DATA_LENGTH` - Binary state data length (19 bytes)

See the source file for the complete definitions and latest values.

## Usage Example

```typescript
import { getTowerPosition, getActiveLights } from './src/udtHelpers';
import { TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS } from './src/udtConstants';

// Get position for a ring light
const topNorth = getTowerPosition(TOWER_LAYERS.TOP_RING, RING_LIGHT_POSITIONS.NORTH);
// Returns: { level: 'TOP_RING', direction: 'NORTH', ledChannel: 0 }

// Get position for a ledge light
const ledgeNE = getTowerPosition(TOWER_LAYERS.LEDGE, LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST);
// Returns: { level: 'LEDGE', direction: 'NORTH_EAST', ledChannel: 12 }

// Get all active lights from a tower state
const activeLights = getActiveLights(towerState);
// Returns array with correct level names and LED channel mappings
```

---

# Command Packet Structure Documentation

## Overview

The tower communication uses **20-byte command packets** that consist of:

-   **Byte 0**: Command Type (always `0x00` for tower state commands)
-   **Bytes 1-19**: Tower State Data (19 bytes containing complete tower state)

## Complete 20-Byte Command Packet Structure

```
 Byte:  00  01  02  03  04  05  06  07  08  09  10  11  12  13  14  15  16  17  18  19
       [CMD][      DRUM STATE     ][            LED STATES (6 layers × 2 bytes)            ][AUD][  BEAM+VOL  ][SEQ]
       [00 ][D0D1][D1D2][L0L0][L0L0][L1L1][L1L1][L2L2][L2L2][L3L3][L3L3][L4L4][L4L4][L5L5][L5L5][AUD][BH ][BL ][VDF][LED]
```

## Byte-by-Byte Breakdown

### Byte 0: Command Type

```
Byte 0: Command Type
Value: 0x00 (always 0 for tower state commands)
```

### Bytes 1-2: Drum States (Top, Middle, Bottom)

Three drums (Top/Middle combined in one byte, Bottom in another) with position, status flags, and sound control.

#### Byte 1: Top Drum + Middle Drum (Partial)

```
Bit:    7       6       5       4       3       2       1       0
      [M_POS1][M_POS0][M_SND][T_CAL][T_JAM][T_POS1][T_POS0][T_SND]

T_SND    = Top drum play sound flag (0=silent, 1=play sound during rotation)
T_POS0-1 = Top drum position (0-3: 0=North, 1=East, 2=South, 3=West)
T_JAM    = Top drum jammed flag (0=not jammed, 1=jammed)
T_CAL    = Top drum calibrated flag (0=not calibrated, 1=calibrated)
M_SND    = Middle drum play sound flag
M_POS0-1 = Middle drum position (0-3: 0=North, 1=East, 2=South, 3=West)
```

#### Byte 2: Middle Drum (Partial) + Bottom Drum

```
Bit:    7       6       5       4       3       2       1       0
      [B_CAL][B_JAM][B_POS2][B_POS1][B_POS0][B_SND][M_CAL][M_JAM]

M_JAM    = Middle drum jammed flag
M_CAL    = Middle drum calibrated flag
B_SND    = Bottom drum play sound flag
B_POS0-2 = Bottom drum position (0-3: 0=North, 1=East, 2=South, 3=West)
B_JAM    = Bottom drum jammed flag
B_CAL    = Bottom drum calibrated flag
```

### Bytes 3-14: LED States (6 Layers × 2 Bytes Each)

Each layer controls 4 LEDs, with each LED using 4 bits (3 for effect, 1 for loop).

#### LED Byte Pattern (applies to all layer bytes)

```
Byte N (LED positions 0&2):     Byte N+1 (LED positions 1&3):
Bit: 7  6  5  4  3  2  1  0     Bit: 7  6  5  4  3  2  1  0
    [POS2_FX ][P2][POS0_FX ][P0]     [POS3_FX ][P3][POS1_FX ][P1]

POS0_FX = Position 0 effect (3 bits: 0-7)
P0      = Position 0 loop flag (1 bit)
POS2_FX = Position 2 effect (3 bits: 0-7)
P2      = Position 2 loop flag (1 bit)
POS1_FX = Position 1 effect (3 bits: 0-7)
P1      = Position 1 loop flag (1 bit)
POS3_FX = Position 3 effect (3 bits: 0-7)
P3      = Position 3 loop flag (1 bit)
```

#### Bytes 3-4: Layer 0 (Top Ring - N,E,S,W)

```
Byte 3: [N_RING_TOP_FX][N_LOOP][S_RING_TOP_FX][S_LOOP]
Byte 4: [W_RING_TOP_FX][W_LOOP][E_RING_TOP_FX][E_LOOP]
```

#### Bytes 5-6: Layer 1 (Middle Ring - N,E,S,W)

```
Byte 5: [N_RING_MID_FX][N_LOOP][S_RING_MID_FX][S_LOOP]
Byte 6: [W_RING_MID_FX][W_LOOP][E_RING_MID_FX][E_LOOP]
```

#### Bytes 7-8: Layer 2 (Bottom Ring - N,E,S,W)

```
Byte 7: [N_RING_BOT_FX][N_LOOP][S_RING_BOT_FX][S_LOOP]
Byte 8: [W_RING_BOT_FX][W_LOOP][E_RING_BOT_FX][E_LOOP]
```

#### Bytes 9-10: Layer 3 (Ledge - NE,SE,SW,NW)

```
Byte 9:  [SW_LEDGE_FX][SW_LOOP][NE_LEDGE_FX][NE_LOOP]
Byte 10: [NW_LEDGE_FX][NW_LOOP][SE_LEDGE_FX][SE_LOOP]
```

#### Bytes 11-12: Layer 4 (Base1 - NE,SE,SW,NW)

```
Byte 11: [SW_BASE1_FX][SW_LOOP][NE_BASE1_FX][NE_LOOP]
Byte 12: [NW_BASE1_FX][NW_LOOP][SE_BASE1_FX][SE_LOOP]
```

#### Bytes 13-14: Layer 5 (Base2 - NE,SE,SW,NW)

```
Byte 13: [SW_BASE2_FX][SW_LOOP][NE_BASE2_FX][NE_LOOP]
Byte 14: [NW_BASE2_FX][NW_LOOP][SE_BASE2_FX][SE_LOOP]
```

### Byte 15: Audio State

```
Bit:    7       6       5       4       3       2       1       0
      [LOOP][        AUDIO_SAMPLE_INDEX (0-127)                ]

AUDIO_SAMPLE_INDEX = Sound sample to play (0-127, 0=no sound)
LOOP               = Audio loop flag (0=play once, 1=loop continuously)
```

### Bytes 16-18: Beam Counter, Volume, Drum Reversal, Fault Flags

#### Bytes 16-17: Beam Break Counter (16-bit)

```
Byte 16: BEAM_COUNT_HIGH (upper 8 bits of 16-bit counter)
Byte 17: BEAM_COUNT_LOW  (lower 8 bits of 16-bit counter)
```

#### Byte 18: Volume, Drum Reversal, Beam Fault

```
Bit:    7       6       5       4       3       2       1       0
      [     VOLUME (0-15)      ][B_REV][M_REV][T_REV][FAULT]

FAULT  = Beam sensor fault flag (0=OK, 1=fault detected)
T_REV  = Top drum reverse flag (0=normal, 1=reverse direction)
M_REV  = Middle drum reverse flag
B_REV  = Bottom drum reverse flag
VOLUME = Audio volume level (0-15, 0=silent, 15=maximum)
```

### Byte 19: LED Sequence Override

```
Byte 19: LED_SEQUENCE (0-255)
Special LED sequence/pattern override (0=normal operation)
```

## LED Effect Values

The 3-bit effect values (0-7) correspond to these lighting patterns:

```
0 = Off
1 = On (solid)
2 = Slow Pulse
3 = Fast Pulse
4 = Slow Fade
5 = Fast Fade
6 = Strobe
7 = Flicker
```

## Example Command Packets

### Example 1: Turn on North Top Ring LED (solid, no loop)

```
Packet: [00,00,00,20,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00,00]

Byte 0:  0x00 = Command type (tower state)
Byte 1:  0x00 = No drum changes
Byte 2:  0x00 = No drum changes
Byte 3:  0x20 = North Top Ring: effect=1 (0x20 = 0010 0000 = effect 1 in bits 7-5)
Bytes 4-19: All zeros (no other changes)
```

### Example 2: Play sound 5 with loop, preserve all other state

```
Packet: [00,00,00,00,00,00,00,00,00,00,00,00,00,00,85,00,00,00,00,00]

Byte 0:  0x00 = Command type
Bytes 1-14: 0x00 = No drum or LED changes
Byte 15: 0x85 = Audio: sample 5 (0x05) + loop flag (0x80) = 0x85
Bytes 16-19: 0x00 = No other changes
```

## Working with Command Packets

### Creating State Commands

1. Get current tower state using `rtdt_unpack_state` from last tower response
2. Modify only the fields you want to change
3. Pack state using `rtdt_pack_state` to get 19 bytes
4. Prepend command type byte (0x00) to create 20-byte command packet
5. Send via `sendTowerCommandDirect`

### Preserving Existing State

The key to avoiding unintended effects (like drum rotation when changing LEDs) is to always start with the current complete tower state and only modify the specific fields you want to change, leaving everything else intact.

## Integration with Tower State Management

This packet structure is used by:

-   `rtdt_pack_state()` - Packs TowerState object into bytes 1-19
-   `rtdt_unpack_state()` - Unpacks bytes 1-19 into TowerState object
-   Command factory methods - Create complete packets by prepending command type
-   Response processing - Extracts state from tower responses

The 20th byte (command type) is added by the command layer, while the tower state functions handle the core 19-byte data payload that contains all the actual tower state information.
