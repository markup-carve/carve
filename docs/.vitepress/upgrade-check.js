// The upgrade reads every input as 0.1. On 0.2 source it only escapes text that 0.2 reads as syntax (an `=` heading),
// so an escape-only result cannot tell which reading the author meant; any rewrite marks a 0.1-only spelling.

/**
 * What `upgrade(source, { edits: true })` means for `source`: `unchanged`, `already-0.2` when every change is an
 * escape, or `upgrade`.
 */
export function upgradeVerdict(source, result) {
  if (result.output === source) return 'unchanged'
  if (result.records.some((record) => record.class === 'rewrite')) return 'upgrade'
  const escapes = new Set(result.records.filter((record) => record.class === 'escape').map((record) => record.entry))
  const edits = result.edits ?? []
  return edits.length > 0 && edits.every((edit) => escapes.has(edit.entry)) ? 'already-0.2' : 'upgrade'
}
