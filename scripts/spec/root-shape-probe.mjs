/* Probe PART 12 §12 with one change to an engine-produced AST per case.
 * Pure verdict functions let tests exercise failing paths without a faulty engine.
 */

/** A node type the schema has never named, and cannot be mistaken for one. */
export const UNKNOWN_NODE_TYPE = 'zzBlockNotInTheSchema'

/** A root field the schema has never named, for the same reason. */
export const EXTRA_ROOT_FIELD = 'zzRootFieldNotInTheSchema'

/**
 * The first array in `node` that demonstrably holds INLINES, or `undefined`.
 *
 * `text` is the marker: it is inline-only, so an array containing one cannot be
 * a block list. Depth-first, so the innermost paragraph of a nested container is
 * found rather than the container's own block children.
 */
function findInlineHost(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findInlineHost(item)
      if (found !== undefined) return found
    }

    return undefined
  }
  if (node === null || typeof node !== 'object') return undefined
  for (const value of Object.values(node)) {
    const found = findInlineHost(value)
    if (found !== undefined) return found
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value) && value.some((child) => child?.type === 'text')) return value
  }

  return undefined
}

/**
 * The shapes §12 requires an ingest to refuse, built from one valid payload.
 *
 * `doc` is a parsed tree with at least one block child. Each entry carries the
 * clause letter it tests, so a finding names the rule rather than the fixture.
 */
export function refusableRootShapes(doc) {
  const clone = () => JSON.parse(JSON.stringify(doc))
  const mutated = (change) => {
    const payload = clone()
    change(payload)
    return payload
  }
  const shapes = [
    {
      id: 'root-missing-type',
      clause: '§12(a)',
      why: 'a root with no `type`',
      names: 'type',
      payload: mutated((d) => { delete d.type }),
    },
    {
      id: 'root-missing-children',
      clause: '§12(a)',
      why: 'a root with no `children`',
      names: 'children',
      payload: mutated((d) => { delete d.children }),
    },
    {
      id: 'root-missing-srcByteLength',
      clause: '§12(a)',
      why: 'a root with no `srcByteLength`',
      names: 'srcByteLength',
      payload: mutated((d) => { delete d.srcByteLength }),
    },
    {
      id: 'root-extra-field',
      clause: '§12(b)',
      why: 'a root carrying a fourth field',
      names: EXTRA_ROOT_FIELD,
      payload: mutated((d) => { d[EXTRA_ROOT_FIELD] = 1 }),
    },
    {
      id: 'unknown-node-type-block',
      clause: '§12(c)',
      why: 'a block child whose `type` the schema does not name',
      names: UNKNOWN_NODE_TYPE,
      payload: mutated((d) => { d.children.push({ type: UNKNOWN_NODE_TYPE, children: [] }) }),
    },
  ]

  // An engine can reject unknown blocks yet pass unknown inlines to its renderer.
  // A text child identifies an inline list; container children repeat the block test.
  if (findInlineHost(doc) !== undefined) {
    shapes.push({
      id: 'unknown-node-type-inline',
      clause: '§12(c)',
      why: 'an inline whose `type` the schema does not name',
      names: UNKNOWN_NODE_TYPE,
      payload: mutated((d) => { findInlineHost(d).push({ type: UNKNOWN_NODE_TYPE }) }),
    })
  }

  return shapes
}

/**
 * What an ingest's answer to one shape means, as a finding or `null`.
 *
 * `refused` means the ingest itself threw. That is the only conformant answer:
 * §12 puts the boundary at DECODE, and §9(b) already rules out the alternative
 * for depth - "an ingest that accepts a tree and then silently renders only
 * part of it is the worst of the three, because the caller is told nothing".
 *
 * `renderRefused` is reported SEPARATELY rather than folded into `refused`,
 * because it is the exact defect §12(c) was written against: carve-js accepted
 * every unknown type and threw `renderHtml: unknown block ...` one step later,
 * which reads to a caller as a rendering problem and never arrives at all for a
 * consumer that holds the tree without rendering it.
 */
export function rootShapeVerdict({ shape, refused, renderRefused, message = '' }) {
  if (refused) {
    // A bare throw may be a library error; §12 requires an error naming the field or type.
    // The missing-type probe is weak because many errors mention "type", but it
    // still checks more than an unqualified catch.
    if (!String(message).includes(shape.names)) {
      return (
        `ingest refused ${shape.why} (${shape.clause}) without naming ` +
        `${JSON.stringify(shape.names)}; §12 asks for an error of its own, not whatever was raised`
      )
    }

    return null
  }
  if (renderRefused) {
    return (
      `ingest accepted ${shape.why} (${shape.clause}) and failed only in the renderer; ` +
      '§12 puts the refusal at decode, where a consumer that never renders still sees it'
    )
  }

  return `ingest accepted ${shape.why} (${shape.clause}); §12 requires a typed refusal`
}
