/*
 * A document's STRUCTURAL SIGNATURE: the tree of node types, with values,
 * attributes and positions removed, plus a flat rendering of it.
 *
 * Extracted from scripts/ast-conformance.mjs so both halves can be tested
 * without running the whole conformance report, which needs sibling engine
 * checkouts and exits the process.
 */

/** Position fields, stripped from a signature: shape is not placement. */
export const POS_KEYS = [
  'startLine',
  'endLine',
  'startColumn',
  'endColumn',
  'startOffset',
  'endOffset',
]

/**
 * The schema says whether a tree is well formed; it cannot say whether two
 * engines produced the SAME tree. Both can be valid and structurally
 * different - which is what PART 12 §1 actually forbids, because "a consumer
 * written against one implementation MUST be able to read another's output"
 * is a statement about shape, not about validity.
 *
 * That gap let carve-php ship a table cell split into three text nodes where
 * the reference emits one (carve-php#612), and carve-rs the same cell as five
 * (carve-rs#413). Every span in both was correct and every document validated,
 * so nothing reported anything.
 */
export function shapeOf(node) {
  if (Array.isArray(node)) return node.map(shapeOf)
  if (!node || typeof node !== 'object') return null
  const children = []
  // Sorted by key: engines serialize their fields in different orders, and a
  // signature that inherited that order would report every one of them as a
  // shape difference.
  for (const [key, value] of Object.entries(node).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (POS_KEYS.includes(key) || key === 'pos' || key === 'srcByteLength') continue
    if (Array.isArray(value)) {
      const sub = value.map(shapeOf).filter((s) => s !== null)
      if (sub.length) children.push([key, sub])
    } else if (value && typeof value === 'object') {
      const sub = shapeOf(value)
      if (sub !== null) children.push([key, [sub]])
    }
  }
  return typeof node.type === 'string' || children.length ? { type: node.type ?? '?', children } : null
}

/**
 * Render a shape as a compact path list, so a mismatch names where it is.
 *
 * A shape can be an ARRAY, because shapeOf maps an array to an array of shapes
 * and a node field may hold an array OF arrays. `definition_list.items` is the
 * one the corpus reaches: each entry is itself a list of nodes, so that field's
 * shape nests one level deeper than a plain `children` array does.
 *
 * Without the array branch that value reached the `shape.children` loop and
 * threw `shape.children is not iterable`, killing the run partway through --
 * after the position findings had already printed, so it read like a report
 * that had finished rather than one that had died. Every definition-list
 * document reached it, which means the shape comparison had never once run for
 * them. Pinned by tests/ast-shape.test.mjs.
 */
export function shapePaths(shape, path = '$') {
  if (!shape) return []
  if (Array.isArray(shape)) {
    return shape.flatMap((s, i) => shapePaths(s, `${path}[${i}]`))
  }
  const out = [`${path}:${shape.type}`]
  for (const [key, subs] of shape.children) {
    subs.forEach((s, i) => out.push(...shapePaths(s, `${path}.${key}[${i}]`)))
  }
  return out
}

/**
 * Which engine, if any, stands ALONE on one document.
 *
 * Kept here as a pure function rather than inline in the runner so it can be
 * tested directly. The runner's version of this could not fail on purpose: the
 * only way to see it classify a three-way split was to find a document that
 * produced one, which is the same reason the gap it closes went unnoticed
 * (carve#747).
 *
 * `signatures` is an array of [engine, signature] in a stable order, one entry
 * per independent engine. A signature of `undefined` means that engine produced
 * no tree for the document, which is a finding of its own and not a
 * disagreement about shape - so the document is skipped rather than counted as a
 * split.
 */
export function classifyShapeDisagreement(signatures) {
  if (signatures.length < 3) return { kind: 'skipped', reason: 'fewer than three engines' }
  if (signatures.some(([, signature]) => signature === undefined)) {
    return { kind: 'skipped', reason: 'an engine produced no tree' }
  }
  const [[, a], [, b], [, c]] = signatures
  if (a === b && b === c) return { kind: 'unanimous' }
  // Two agree and one does not: name the one that does not, WHICHEVER it is.
  // Naming it only when it is not the reference is the defect this replaces.
  if (a === b) return { kind: 'alone', engine: signatures[2][0] }
  if (b === c) return { kind: 'alone', engine: signatures[0][0] }
  if (a === c) return { kind: 'alone', engine: signatures[1][0] }

  return { kind: 'three-way' }
}
