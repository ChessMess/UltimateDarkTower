// Deep-sort all object keys alphabetically — canonical form for byte-identical round-trips.
// Arrays are NOT sorted (array order is significant in JSON).
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalJson(doc: unknown): string {
  return JSON.stringify(sortDeep(doc), null, 2);
}
