/**
 * Light mapping — level/side/corner → light index.
 *
 * Exported because consumers need the same mapping to drive light UIs: they cannot
 * build a Lights payload without knowing which index a given side lands on. These
 * lived as private methods on UdtTowerCommands, which left apps/controller no option
 * but to copy them, and the copy drifted.
 *
 * Ring layers (top/middle/bottom) address lights by cardinal side; ledge and base
 * layers address them by ordinal corner. mapSideToCorner bridges the two.
 */

import {
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  type TowerSide,
  type TowerCorner,
  type TowerLevels,
} from './udtConstants';

/**
 * Gets the tower layer index for a doorway light level.
 * @param level - Tower level (top, middle, bottom)
 * @returns Layer index
 */
export function getTowerLayerForLevel(level: TowerLevels): number {
  switch (level) {
    case 'top':
      return TOWER_LAYERS.TOP_RING;
    case 'middle':
      return TOWER_LAYERS.MIDDLE_RING;
    case 'bottom':
      return TOWER_LAYERS.BOTTOM_RING;
    default:
      return TOWER_LAYERS.TOP_RING;
  }
}

/**
 * Gets the light index for a cardinal direction (ring lights).
 * @param side - Tower side (north, east, south, west)
 * @returns Light index
 */
export function getLightIndexForSide(side: TowerSide): number {
  switch (side) {
    case 'north':
      return RING_LIGHT_POSITIONS.NORTH;
    case 'east':
      return RING_LIGHT_POSITIONS.EAST;
    case 'south':
      return RING_LIGHT_POSITIONS.SOUTH;
    case 'west':
      return RING_LIGHT_POSITIONS.WEST;
    default:
      return RING_LIGHT_POSITIONS.NORTH;
  }
}

/**
 * Maps cardinal directions to their closest corner positions for ledge lights.
 * @param side - Tower side (north, east, south, west)
 * @returns Tower corner (northeast, southeast, southwest, northwest)
 */
export function mapSideToCorner(side: TowerSide): TowerCorner {
  switch (side) {
    case 'north':
      return 'northeast';
    case 'east':
      return 'southeast';
    case 'south':
      return 'southwest';
    case 'west':
      return 'northwest';
    default:
      return 'northeast';
  }
}

/**
 * Gets the light index for ledge lights (ordinal directions).
 * @param corner - Tower corner (northeast, southeast, southwest, northwest)
 * @returns Light index
 */
export function getLedgeLightIndexForSide(corner: TowerCorner): number {
  switch (corner) {
    case 'northeast':
      return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
    case 'southeast':
      return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
    case 'southwest':
      return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
    case 'northwest':
      return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
    default:
      return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
  }
}

/**
 * Gets the light index for base lights (ordinal directions).
 * @param side - Tower side (north, east, south, west)
 * @returns Light index
 */
export function getBaseLightIndexForSide(side: TowerSide): number {
  return getLedgeLightIndexForSide(mapSideToCorner(side));
}
