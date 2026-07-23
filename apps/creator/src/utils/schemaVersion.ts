// The schema version this build of the Creator reads and writes. Single source of truth for
// `scaffold.ts` (what a new scenario is stamped with) and `store.loadScenario` (the refuse-guard
// below).
//
// 0.5.0 is the first non-backward-compatible bump in the schema's history (`$defs/boardDef.anchors`
// removed for `spots`) — so unlike every earlier bump, there is no migration path. A document
// stamped with anything else is refused outright: `store.loadScenario` detects it BEFORE touching
// any state and offers the caller a chance to download a copy, rather than half-loading a document
// whose board anchors this build can no longer read.
export const CURRENT_SCHEMA_VERSION = '0.5.0';

/** True when `version` is exactly the version this build reads. No forward- or backward-compat. */
export function isSupportedSchemaVersion(version: unknown): boolean {
  return version === CURRENT_SCHEMA_VERSION;
}
