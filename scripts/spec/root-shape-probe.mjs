/*
 * A probe for the root shape an ingest may never repair (PART 12 §12).
 *
 * §7 fixes the root at `type`, `children` and `srcByteLength`, and
 * `resources/ast-schema.json` marks all three `required`. §12 rules what a
 * READER does with a root that deviates: refuse it, because a reader that
 * invents a missing field or ignores an unexpected one has silently repaired
 * attacker-controlled input.
 *
 * Every shape here is built by MUTATING an engine's own serialized output, so
 * the payload differs from a document that engine just produced in exactly one
 * way. A hand-written minimal tree would differ in several, and a refusal could
 * then be for any of them.
 *
 * Pure functions, so a test can drive every verdict with no engine present -
 * the same reason `unknown-property-probe.mjs` is shaped this way. The branch
 * that decides "this is a finding" is otherwise reachable only by having an
 * engine that misbehaves, which is the thing being looked for.
 */

/** A node type the schema has never named, and cannot be mistaken for one. */
export const UNKNOWN_NODE_TYPE = 'zzBlockNotInTheSchema'

/** A root field the schema has never named, for the same reason. */
export const EXTRA_ROOT_FIELD = 'zzRootFieldNotInTheSchema'

/**
 * The shapes §12 requires an ingest to refuse, built from one valid payload.
 *
 * `doc` is a parsed tree with at least one block child. Each entry carries the
 * clause letter it tests, so a finding names the rule rather than the fixture.
 */
export function refusableRootShapes(doc) {
  const clone = () => JSON.parse(JSON.stringify(doc))
  const shapes = [
    {
      id: 'root-missing-type',
      clause: '§12(a)',
      why: 'a root with no `type`',
      names: 'type',
      payload: (() => {
        const d = clone()
        delete d.type
        return d
      })(),
    },
    {
      id: 'root-missing-children',
      clause: '§12(a)',
      why: 'a root with no `children`',
      names: 'children',
      payload: (() => {
        const d = clone()
        delete d.children
        return d
      })(),
    },
    {
      id: 'root-missing-srcByteLength',
      clause: '§12(a)',
      why: 'a root with no `srcByteLength`',
      names: 'srcByteLength',
      payload: (() => {
        const d = clone()
        delete d.srcByteLength
        return d
      })(),
    },
    {
      id: 'root-extra-field',
      clause: '§12(b)',
      why: 'a root carrying a fourth field',
      names: EXTRA_ROOT_FIELD,
      payload: (() => {
        const d = clone()
        d[EXTRA_ROOT_FIELD] = 1
        return d
      })(),
    },
    {
      id: 'unknown-node-type-block',
      clause: '§12(c)',
      why: 'a block child whose `type` the schema does not name',
      names: UNKNOWN_NODE_TYPE,
      payload: (() => {
        const d = clone()
        d.children.push({ type: UNKNOWN_NODE_TYPE, children: [] })
        return d
      })(),
    },
  ]

  // A nested unknown type is a SEPARATE row: an engine can turn a foreign
  // BLOCK away at the top of its child loop and still walk an inline one into
  // the tree, which is what carve-js did - both were accepted, and both threw
  // in the renderer, one step past where §12(c) puts the boundary.
  const firstWithInlines = doc.children?.find((child) => Array.isArray(child?.children))
  if (firstWithInlines !== undefined) {
    const index = doc.children.indexOf(firstWithInlines)
    shapes.push({
      id: 'unknown-node-type-inline',
      clause: '§12(c)',
      why: 'an inline whose `type` the schema does not name',
      names: UNKNOWN_NODE_TYPE,
      payload: (() => {
        const d = clone()
        d.children[index].children.push({ type: UNKNOWN_NODE_TYPE })
        return d
      })(),
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
    // A THROW IS NOT YET A REFUSAL. §12 asks for "an error of its own" in the
    // sense §9(b) already means - typed, documented, naming what was wrong -
    // and explicitly rules out "whatever its JSON library happened to raise".
    // A bare catch cannot tell those apart, so a null dereference deep in a
    // conversion would have read as conformance on the exact payload class the
    // clause is about. The message has to NAME the offending thing.
    //
    // The token is the distinctive one per shape: `srcByteLength`, `children`,
    // and the two probe names nothing else can produce. `root-missing-type` is
    // the weak one - almost any message mentions the word "type" - and it is
    // kept because a shape with no assertion at all would be worse, not because
    // it discriminates as sharply as the other four.
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
