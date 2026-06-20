/**
 * Game / board reference data, grouped by domain sub-namespaces. Exposed from the library
 * as the `data` namespace, so consumers reach each dataset via its domain:
 *
 *   import { data } from 'ultimatedarktower';
 *   data.heroes.HEROES        // board hero roster
 *   data.content.HEROES       // gameplay hero content (virtues, banner actions)
 *   data.board.BOARD_LOCATIONS
 *   data.inventory.expansions
 *
 * Sub-namespacing keeps the two hero/foe datasets (board roster vs gameplay content)
 * distinct without name collisions.
 */
export * as heroes from './udtHeroes';
export * as monuments from './udtMonuments';
export * as foes from './udtFoes';
export * as board from './board';
export * as content from './udtGameContent';
export * as inventory from './udtBoxInventory';
