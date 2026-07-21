/** Narrow `v` to a plain object, or undefined — for reading optional nested JSON-shaped fields
 *  (schemaDoc.setup/library etc.) without a chain of `typeof`/`Array.isArray` checks at each call
 *  site. Was defined identically three times across InspectorPanel.tsx; one copy here. */
export function asObj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}
