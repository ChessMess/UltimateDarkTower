#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relPath) {
  return readFileSync(resolve(root, relPath), 'utf8');
}

function unique(items) {
  return [...new Set(items)];
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function extractQuotedArrayByMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return [];

  const start = source.indexOf('[', markerIndex);
  if (start < 0) return [];

  let depth = 0;
  let end = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) return [];

  const region = source.slice(start, end + 1);
  return [...region.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

// Engine node kinds are the discriminant tags of the `EngineNode` discriminated union in
// packages/engine/src/engine/types.ts — NOT the derived `export type NodeKind = EngineNode['kind']`
// alias (which carries no string literals). We slice the union's source region and read the `kind`
// tag off both member shapes: inline object members (`kind: '...'`) and the `PropslessNode<'...'>`
// helper for props-less kinds.
function extractEngineNodeKinds(source) {
  const marker = 'export type EngineNode =';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return [];

  // The union runs from the marker until the next top-level `export` declaration
  // (`export type NodeKind = ...`). A naive first-`;` scan would stop inside a member's object type.
  const tail = source.slice(markerIndex + marker.length);
  const endIndex = tail.indexOf('\nexport ');
  const region = endIndex < 0 ? tail : tail.slice(0, endIndex);

  return [
    ...[...region.matchAll(/kind:\s*'([^']+)'/g)].map((m) => m[1]),
    ...[...region.matchAll(/PropslessNode<'([^']+)'>/g)].map((m) => m[1]),
  ];
}

function formatList(items) {
  if (items.length === 0) return '(none)';
  return items.map((item) => `  - ${item}`).join('\n');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const creatorTypesPath = 'apps/creator/src/types/index.ts';
const schemaPath = 'packages/schema/src/scenario.schema.json';
const engineTypesPath = 'packages/engine/src/engine/types.ts';
const catalogPath = 'docs/node-catalog.md';

// Creator/Schema node kinds that INTENTIONALLY have no engine reducer implementation, so the engine
// ⇄ creator parity check must not flag them. These are setup-time pickers the Player resolves before
// the reducer runs, UI-only affordances, and author annotations — exactly the kinds `docs/node-
// catalog.md` badges `Creator-only` / `Annotation` (that catalog is the human-facing rationale).
// When a kind here gains an engine implementation, remove it from this set (the hygiene checks below
// fail if an allowlisted kind ever appears in the engine union, so the set can't silently go stale).
const ENGINE_ABSENT_KINDS = new Set([
  'lifecycle.importSeed',
  'lifecycle.selectGameDifficulty',
  'lifecycle.selectAdversary',
  'lifecycle.selectFoes',
  'lifecycle.selectMainGoal',
  'lifecycle.selectAlly',
  'action.skullDrop',
  'action.endTurn',
  'battle.cardSelect',
  'battle.retreat',
  'battle.removeFoeNoBattle',
  'battle.foeStatus',
  'dungeon.relicTower',
  'cond.random',
  'cond.setFlag',
  'media.playVideo',
  'media.playSound',
  'media.showImage',
  'media.cutscene',
  'winloss.competitiveEnd',
  'util.linkOut',
  'util.linkIn',
  'util.group',
  'util.comment',
  'util.catch',
]);

const creatorSource = read(creatorTypesPath);
const schemaSource = read(schemaPath);
const engineTypesSource = read(engineTypesPath);
const catalogSource = read(catalogPath);

const creatorKinds = unique(extractQuotedArrayByMarker(creatorSource, 'export const NODE_KINDS'));
if (creatorKinds.length === 0) fail(`Could not parse NODE_KINDS from ${creatorTypesPath}`);

let schemaKinds = [];
try {
  const schemaJson = JSON.parse(schemaSource);
  schemaKinds = unique(schemaJson.$defs.node.properties.kind.enum || []);
} catch {
  fail(`Could not parse JSON from ${schemaPath}`);
}
if (schemaKinds.length === 0) fail(`Could not parse node kind enum from ${schemaPath}`);

const missingInSchema = diff(creatorKinds, schemaKinds);
const missingInCreator = diff(schemaKinds, creatorKinds);

if (missingInSchema.length || missingInCreator.length) {
  fail(
    [
      'Node kind mismatch between Creator and Schema.',
      '',
      `Creator kinds not in schema (${missingInSchema.length}):`,
      formatList(missingInSchema),
      '',
      `Schema kinds not in creator (${missingInCreator.length}):`,
      formatList(missingInCreator),
    ].join('\n'),
  );
}

const missingInCatalog = creatorKinds.filter((kind) => !catalogSource.includes(kind));
if (missingInCatalog.length) {
  fail(
    [
      `Node catalog drift detected in ${catalogPath}.`,
      '',
      `Kinds missing from catalog (${missingInCatalog.length}):`,
      formatList(missingInCatalog),
    ].join('\n'),
  );
}

const engineKinds = unique(extractEngineNodeKinds(engineTypesSource));
if (engineKinds.length === 0) fail(`Could not parse EngineNode kinds from ${engineTypesPath}`);

const allowlist = [...ENGINE_ABSENT_KINDS];
// Real drift: the engine implements a kind Creator/Schema don't know about.
const engineNotInCreator = diff(engineKinds, creatorKinds);
// Real drift: a Creator kind is missing from the engine AND isn't a known engine-absent kind
// (a new reducer-backed kind added to Creator but not the engine, or a kind dropped from the engine).
const creatorNotInEngine = diff(creatorKinds, engineKinds).filter(
  (kind) => !ENGINE_ABSENT_KINDS.has(kind),
);
// Allowlist hygiene, so the set can't silently mask future drift:
const staleAllowlist = diff(allowlist, creatorKinds); // allowlisted kind no longer exists in Creator
const allowlistNowInEngine = allowlist.filter((kind) => engineKinds.includes(kind)); // now implemented

if (
  engineNotInCreator.length ||
  creatorNotInEngine.length ||
  staleAllowlist.length ||
  allowlistNowInEngine.length
) {
  fail(
    [
      'Engine node-kind parity check failed.',
      '',
      `Engine kinds not in creator/schema (${engineNotInCreator.length}):`,
      formatList(engineNotInCreator),
      '',
      `Creator kinds missing from engine and not allowlisted (${creatorNotInEngine.length}):`,
      formatList(creatorNotInEngine),
      '',
      `Stale allowlist entries — no longer a creator kind (${staleAllowlist.length}):`,
      formatList(staleAllowlist),
      '',
      `Allowlisted kinds now implemented in engine — remove from allowlist (${allowlistNowInEngine.length}):`,
      formatList(allowlistNowInEngine),
    ].join('\n'),
  );
}

console.log(
  [
    'Node catalog consistency check passed.',
    `- creator kinds: ${creatorKinds.length}`,
    `- schema kinds: ${schemaKinds.length}`,
    `- catalog coverage: ${creatorKinds.length}/${creatorKinds.length}`,
    `- engine kinds: ${engineKinds.length} (+ ${allowlist.length} allowlisted engine-absent)`,
  ].join('\n'),
);
