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
  unknownPropertyVerdict,
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
  // What carve-rs used to do. The COUNT is what these helpers report; §11 makes
  // the runner treat an accepted-and-dropped payload as a finding all the same,
  // because refusing is now the only conformant answer.
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

test('refusing the payload is the conformant answer', () => {
  // PART 12 §11. Nothing else passes.
  assert.equal(unknownPropertyVerdict({ refused: true, injected: 5, echoed: 0 }), null)
})

test('echoing the property is a finding, and says how much', () => {
  const verdict = unknownPropertyVerdict({ refused: false, injected: 5, echoed: 3 })
  assert.match(verdict, /echoed an unknown property on 3 of 5/)
  assert.match(verdict, /additionalProperties/)
})

test('accepting and dropping is a finding too', () => {
  // The half §11 decided. This branch is why the verdict lives here: the
  // runner's copy could only be reached by having an engine that misbehaves,
  // so nothing exercised the decision itself - and a check nothing exercises
  // is the shape of every defect this repo keeps finding.
  const verdict = unknownPropertyVerdict({ refused: false, injected: 5, echoed: 0 })
  assert.match(verdict, /accepted a tree with an unknown property on 5 node\(s\)/)
  assert.match(verdict, /typed refusal/)
})

test('the three answers are distinguishable', () => {
  // The control on the two above: one message for both non-conformant answers
  // would satisfy each match while telling a maintainer nothing about which
  // engine did what.
  const echoed = unknownPropertyVerdict({ refused: false, injected: 5, echoed: 3 })
  const dropped = unknownPropertyVerdict({ refused: false, injected: 5, echoed: 0 })
  assert.notEqual(echoed, dropped)
})
