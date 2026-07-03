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

function extractQuotedUnionByMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return [];

  const tail = source.slice(markerIndex);
  const end = tail.indexOf(';');
  if (end < 0) return [];

  const unionRegion = tail.slice(0, end);
  return [...unionRegion.matchAll(/'([^']+)'/g)].map((m) => m[1]);
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

const engineTypeKinds = unique(
  extractQuotedUnionByMarker(engineTypesSource, 'export type NodeKind ='),
);
const creatorNotInEngineTypes = diff(creatorKinds, engineTypeKinds);
const engineTypesNotInCreator = diff(engineTypeKinds, creatorKinds);

if (creatorNotInEngineTypes.length || engineTypesNotInCreator.length) {
  console.warn(
    [
      'Warning: Engine NodeKind type union is out of sync with creator/schema.',
      'This does not fail the check yet (known gap), but should be tracked.',
      '',
      `Creator kinds not in engine types (${creatorNotInEngineTypes.length}):`,
      formatList(creatorNotInEngineTypes),
      '',
      `Engine type kinds not in creator (${engineTypesNotInCreator.length}):`,
      formatList(engineTypesNotInCreator),
      '',
    ].join('\n'),
  );
}

console.log(
  [
    'Node catalog consistency check passed.',
    `- creator kinds: ${creatorKinds.length}`,
    `- schema kinds: ${schemaKinds.length}`,
    `- catalog coverage: ${creatorKinds.length}/${creatorKinds.length}`,
  ].join('\n'),
);
