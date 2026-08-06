/*
 * The root-shape probe (carve#743, PART 12 §12).
 *
 * The runner's verdict could only be exercised by having an engine that repairs
 * a malformed root, which is the thing it exists to look for - so, like the
 * unknown-property probe beside it, the decision lives in a pure function and
 * these drive it directly.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXTRA_ROOT_FIELD,
  UNKNOWN_NODE_TYPE,
  refusableRootShapes,
  rootShapeVerdict,
} from '../scripts/spec/root-shape-probe.mjs'

const tree = () => ({
  type: 'document',
  srcByteLength: 2,
  children: [
    {
      type: 'paragraph',
      pos: { startLine: 1, endLine: 1 },
      children: [{ type: 'text', value: 'hi', pos: { startLine: 1, endLine: 1 } }],
    },
  ],
})

test('every shape differs from the valid payload in exactly one way', () => {
  // The point of mutating real output rather than hand-writing a tree: a
  // refusal then names the mutation, not whatever else a minimal fixture
  // happened to be missing.
  const base = tree()
  for (const shape of refusableRootShapes(base)) {
    assert.notDeepEqual(shape.payload, base, `${shape.id} must differ from the valid payload`)
  }
  assert.deepEqual(base, tree(), 'building the shapes must not mutate the input')
})

test('the three §7 root fields each get their own shape', () => {
  const ids = refusableRootShapes(tree()).map((s) => s.id)
  assert.ok(ids.includes('root-missing-type'))
  assert.ok(ids.includes('root-missing-children'))
  assert.ok(ids.includes('root-missing-srcByteLength'))
  for (const shape of refusableRootShapes(tree())) {
    if (!shape.id.startsWith('root-missing-')) continue
    const field = shape.id.replace('root-missing-', '')
    assert.ok(!(field in shape.payload), `${shape.id} must actually drop ${field}`)
  }
})

test('the extra-root-field shape adds a name the schema has never had', () => {
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'root-extra-field')
  const added = Object.keys(shape.payload).filter((k) => !(k in tree()))
  assert.equal(added.length, 1)
  assert.equal(added[0], EXTRA_ROOT_FIELD)
  // A probe that could be mistaken for a real field would measure an engine
  // handling that field correctly and report it as leniency.
  assert.match(added[0], /^zz/)
})

test('an unknown node type is probed as a block AND as an inline', () => {
  // Separate rows on purpose: an engine can turn a foreign block away at the
  // top of its child loop and still walk a foreign inline into the tree.
  const shapes = refusableRootShapes(tree())
  const block = shapes.find((s) => s.id === 'unknown-node-type-block')
  const inline = shapes.find((s) => s.id === 'unknown-node-type-inline')
  assert.ok(block !== undefined)
  assert.ok(inline !== undefined)
  assert.equal(block.payload.children.at(-1).type, UNKNOWN_NODE_TYPE)
  assert.equal(inline.payload.children[0].children.at(-1).type, UNKNOWN_NODE_TYPE)
  // Depth is what distinguishes them: the block one leaves the paragraph alone.
  assert.deepEqual(block.payload.children[0], tree().children[0])
})

test('the inline shape is skipped when the document has no inline host', () => {
  const noInlines = { type: 'document', srcByteLength: 0, children: [{ type: 'thematic_break' }] }
  const ids = refusableRootShapes(noInlines).map((s) => s.id)
  assert.ok(!ids.includes('unknown-node-type-inline'))
  assert.ok(ids.includes('unknown-node-type-block'), 'the block row does not depend on inlines')
})

test('the unknown type is not a name the schema declares', () => {
  assert.match(UNKNOWN_NODE_TYPE, /^zz/)
  assert.ok(!/^(paragraph|text|document|div|span|list|table)$/.test(UNKNOWN_NODE_TYPE))
})

test('refusing at decode is the conformant answer', () => {
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'root-missing-srcByteLength')
  const message = 'document.srcByteLength is required'
  assert.equal(rootShapeVerdict({ shape, refused: true, renderRefused: false, message }), null)
})

test('a throw that names nothing is not a refusal', () => {
  // §12 asks for an error of its own in the sense §9(b) means, and §9(b) rules
  // out "whatever its JSON library happened to raise". A bare catch cannot tell
  // a typed refusal from a null dereference inside a conversion, so it would
  // report conformance on the exact payload class the clause is about.
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'root-missing-srcByteLength')
  const verdict = rootShapeVerdict({
    shape,
    refused: true,
    renderRefused: false,
    message: "TypeError: Cannot read properties of undefined (reading 'length')",
  })
  assert.match(verdict, /without naming "srcByteLength"/)
})

test('every shape names a token the engine has to echo back', () => {
  // The token is what turns "it threw" into "it refused". A shape without one
  // would accept any crash as conformance, which is the whole point of the
  // branch above.
  const legal = new Set(['type', 'children', 'srcByteLength', EXTRA_ROOT_FIELD, UNKNOWN_NODE_TYPE])
  for (const shape of refusableRootShapes(tree())) {
    assert.equal(typeof shape.names, 'string')
    assert.ok(legal.has(shape.names), `${shape.id} names ${shape.names}, which is not a §7 field`)
  }
})

test('the two probe tokens are names nothing else produces', () => {
  assert.match(EXTRA_ROOT_FIELD, /^zz/)
  assert.match(UNKNOWN_NODE_TYPE, /^zz/)
  assert.notEqual(EXTRA_ROOT_FIELD, UNKNOWN_NODE_TYPE)
})

test('refusing only in the renderer is a finding, and says so', () => {
  // The exact defect §12(c) was written against. Folding it into "refused"
  // would have made carve-js pass on the row it fails.
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'unknown-node-type-block')
  const verdict = rootShapeVerdict({ shape, refused: false, renderRefused: true, message: '' })
  assert.match(verdict, /failed only in the renderer/)
  assert.match(verdict, /§12\(c\)/)
})

test('accepting outright is a finding too', () => {
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'root-missing-srcByteLength')
  const verdict = rootShapeVerdict({ shape, refused: false, renderRefused: false })
  assert.match(verdict, /srcByteLength/)
  assert.match(verdict, /typed refusal/)
})

test('the two non-conformant answers are distinguishable', () => {
  // The control on the two above: one message for both would satisfy each match
  // while telling a maintainer nothing about which engine did what.
  const shape = refusableRootShapes(tree()).find((s) => s.id === 'unknown-node-type-block')
  const late = rootShapeVerdict({ shape, refused: false, renderRefused: true })
  const accepted = rootShapeVerdict({ shape, refused: false, renderRefused: false })
  assert.notEqual(late, accepted)
})
