// Maps an L2/L3 validation error message to the node id(s) it names. This is the ONE place that
// heuristic lives — the store used to scrape the FIRST quoted token out of an error string with a
// regex (no check that it was actually a known node id), while InspectorPanel separately checked
// whether the CURRENT node's id appeared anywhere in the message. The two disagreed: a node could
// show an error badge on canvas that the Inspector didn't list for the same document. Both call
// sites now go through this single primitive.

/** Does `err` reference `nodeId` (as a double-quoted token, the shape every L2/L3 message uses)? */
export function errorMentionsNode(err: string, nodeId: string): boolean {
  return err.includes(`"${nodeId}"`);
}

/** Which of `knownNodeIds` does `err` reference? (An error can name more than one node.) */
export function nodeIdsInError(err: string, knownNodeIds: Iterable<string>): string[] {
  const found: string[] = [];
  for (const id of knownNodeIds) {
    if (errorMentionsNode(err, id)) found.push(id);
  }
  return found;
}
