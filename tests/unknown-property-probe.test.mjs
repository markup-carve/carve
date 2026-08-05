/*
 * The unknown-property probe (carve-js#709, carve#743).
 *
 * The runner's copy of this could only be exercised by having an engine that
 * echoes an unknown property, which is the thing it exists to look for - so the
 * apparatus was untestable exactly where it mattered. These drive the pure
 * helpers directly.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  UNKNOWN_PROPERTY_PROBE,
  countProbes,
  injectUnknownProperty,
} from '../scripts/spec/unknown-property-probe.mjs'

const tree = () => ({
  type: 'document',
  srcByteLength: 5,
  children: [
    {
      type: 'paragraph',
      pos: { startLine: 1, endLine: 1 },
      children: [
        { type: 'text', value: 'a', pos: { startLine: 1, endLine: 1 } },
        { type: 'emphasis', children: [{ type: 'text', value: 'b' }] },
      ],
    },
  ],
})

test('the probe lands on every node and counts them', () => {
  const doc = tree()
  const { n } = injectUnknownProperty(doc)
  assert.equal(n, 5, 'document, paragraph, text, emphasis, text')
  assert.equal(countProbes(doc), 5)
})

test('pos and attrs are not nodes, so they are not probed', () => {
  // They are shared shapes with their own rules, and an engine rebuilding one
  // field by field is not the behavior under test.
  const doc = tree()
  injectUnknownProperty(doc)
  assert.ok(!(UNKNOWN_PROPERTY_PROBE in doc.children[0].pos))
})

test('a dropped property counts as dropped', () => {
  // What carve-rs does. The runner must read this as a pass.
  const doc = tree()
  injectUnknownProperty(doc)
  const stripped = JSON.parse(
    JSON.stringify(doc, (key, value) => (key === UNKNOWN_PROPERTY_PROBE ? undefined : value)),
  )
  assert.equal(countProbes(stripped), 0)
})

test('a partial echo is still an echo', () => {
  // What carve-js does: most nodes are copied wholesale, and the two kinds the
  // codec rebuilds field by field come back clean. A check that only noticed a
  // FULL echo would have called that a pass.
  const doc = tree()
  const { n } = injectUnknownProperty(doc)
  delete doc.children[0].children[1].children[0][UNKNOWN_PROPERTY_PROBE]
  const echoed = countProbes(doc)
  assert.equal(echoed, n - 1)
  assert.ok(echoed > 0, 'a partial echo must not read as a pass')
})

test('the probe name is not a field the schema declares', () => {
  // If it ever collided with a real field the check would measure the engine
  // handling that field correctly and report it as a leak.
  assert.match(UNKNOWN_PROPERTY_PROBE, /^zz/)
  assert.ok(!/^(id|href|src|number|ref|rawRef|value|type)$/.test(UNKNOWN_PROPERTY_PROBE))
})
