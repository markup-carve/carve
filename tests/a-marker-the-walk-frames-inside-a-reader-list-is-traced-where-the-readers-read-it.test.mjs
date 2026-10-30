import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// carve#4213: after a list the readers open from a line the walk folded
// (carve#4193), the walk can open a frame for a later marker that the readers
// read at its written column as text, a sibling, a child or a new list.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a marker past a folded item content column is traced as its paragraph text', () => {
  const source = '- a\n1. w\n   - deep\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S5 doc/item:2 item', '3 S5 doc/item:2 text'])
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>a</li>\n</ul>\n<ol>\n  <li>w\n- deep</li>\n</ol>')
  assert.deepEqual(steps('1. +\n  - w\n  - v\n    - u\n').slice(2), ['3 S4 doc/item:1 lazy', '4 S5 doc/item:1/item:4 item'])
})

test('a deeper marker after the folded one is a child of the item the readers keep open', () => {
  assert.deepEqual(steps('- a\n1. w1\n   - w2\n     - w3\n   more\n').slice(2),
    ['3 S5 doc/item:2 text', '4 S5 doc/item:2/item:4 item', '5 S4 doc/item:2/item:4 lazy'])
})

test('a frame the walk keeps in an item the readers closed is not a list there', () => {
  assert.deepEqual(steps('- a\n  * b\n1. w1\n  - w2\n').slice(2), ['3 S5 doc/item:3 item', '4 S4 doc/item:3 lazy'])
  assert.deepEqual(steps('- a\n  - +\n  * w1\n * w2\n').slice(3), ['4 S4 doc/item:1/item:3 lazy'])
})

test('a marker left of the content column folds into the paragraph a refused + left open', () => {
  const source = '1. +\n  - w1\n - w2\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S4 doc/item:1 lazy', '3 S4 doc/item:1 lazy'])
  assert.equal(renderDoc(parse(source)), '<ol>\n  <li>+\n- w1\n- w2</li>\n</ol>')
})

test('a line after a refused + continues its paragraph, and a later marker reads as after any letter', () => {
  assert.deepEqual(steps('1. +\n + w1\n   - w2\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S5 doc/item:1/item:3 item'])
  assert.deepEqual(steps('1. +\n + w1\n1. w2\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S5 doc/item:3 item'])
  assert.deepEqual(steps('- a\n  - +\n + w1\n  * w2\n').slice(2), ['3 S4 doc/item:1/item:2 lazy', '4 S5 doc/item:1/item:4 item'])
  assert.deepEqual(steps('- a\n  - +\n   + w1\n  * w2\n').slice(2), ['3 S4 doc/item:1/item:2 lazy', '4 S5 doc/item:1/item:4 item'])
  assert.deepEqual(steps('- a\n  - +\n   + w1\n1. w2\n').slice(2), ['3 S4 doc/item:1/item:2 lazy', '4 S5 doc/item:4 item'])
})
