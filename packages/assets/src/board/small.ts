// The downscaled board only — see ./index.ts for why this is a separate module.

/**
 * A downscaled 1400² board (~0.5 MB) — the same artwork, not a different image.
 *
 * Board geometry is resolution-independent: `BOARD_IMAGE_INFO` in `ultimatedarktowerdata` is
 * normalized `[0,1]` and renderers stretch the image to `imageInfo.width/height`, so a smaller
 * backdrop annotates identically to the full-resolution board.
 *
 * Regenerate from the full-res source with:
 * ```sh
 * sips -Z 1400 -s format jpeg -s formatOptions 60 \
 *   packages/assets/board/board.png --out packages/assets/board/board-small.jpg
 * ```
 */
export const boardSmall: string = new URL('../../board/board-small.jpg', import.meta.url).href;
