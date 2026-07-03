// glyph.js — the derived glyph-facing mirror the glyph gate reads (§4.4 / §3.4). Pure state reads;
// the drum→facing geometry is an adapter seam kept as a tagged placeholder until UDT verification.

// ---------- glyph gate (§4.4 / §3.4) ----------
// While a REVEALED glyph faces the acting hero's HOME kingdom, the matching action requires 1 spirit,
// else it is blocked. Facing is DERIVED (not observed) from the engine's mirrored drum positions
// (UDT getGlyphsFacingDirection). The drum→facing geometry resolves via the UDT adapter; until that
// geometry is source-verified it is a tagged placeholder (cf. the headless board/tower targets and the
// Advantage-pool placeholder). The engine carries the derived facing mirror in `state.tower.glyphFacing`
// (a `{ kingdom: glyph|null }` map — only REVEALED glyphs appear), which is what the gate reads.
function homeKingdomOf(state, heroId) {
  const own = (state.kingdoms && state.kingdoms.ownership) || {};
  for (const k of Object.keys(own)) if (own[k] === heroId) return k;
  return undefined;
}
function deriveGlyphFacing(state) {
  return (state.tower && state.tower.glyphFacing) || {};
}
// Adapter seam (intended-design placeholder): recompute the derived facing from drum positions + the
// broken-seal set. Real impl calls UDT getGlyphsFacingDirection(drums) and reveals only seal-broken
// glyphs. Kept as a no-op stand-in so commanded rotations / seal changes have an explicit hook.
function recomputeGlyphFacing(state) {
  if (!state.tower) state.tower = { drums: [0, 0, 0], glyphFacing: {}, calibrated: true };
  return state.tower.glyphFacing;
}

module.exports = { homeKingdomOf, deriveGlyphFacing, recomputeGlyphFacing };
