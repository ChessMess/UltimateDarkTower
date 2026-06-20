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
export type Anchor = {
    x: number;
    y: number;
};
export type AnchorSlot = 'building' | 'skull' | 'hero' | 'foe' | 'marker';
export type LocationAnchors = Partial<Record<AnchorSlot, Anchor>>;
export type BoardAnchorMap = Readonly<Record<string, LocationAnchors>>;
/**
 * Board-image metadata so consumers can map normalized image coordinates onto a
 * 2D canvas or the 3D disc. `northHeadingDegrees` is the image rotation that
 * aligns image-north with the scene's north. A singleton for the four-kingdoms
 * board (v1); the type leaves room for a future per-region map.
 */
export type BoardImageInfo = {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
    northHeadingDegrees: number;
};
export declare const BOARD_IMAGE_INFO: BoardImageInfo;
/** Layout anchors for all 60 board locations, keyed by location name. */
export declare const BOARD_ANCHORS: BoardAnchorMap;
