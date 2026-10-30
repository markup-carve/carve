import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// carve#4193: a list marker the readers open as a new list, but the ownership
// walk folds into an item's paragraph, was traced as a lazy line of that item.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a list marker off the marker column folds into the paragraph of a refused +', () => {
  const source = '1. +\n - s\n - t\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S4 doc/item:1 lazy', '3 S4 doc/item:1 lazy'])
  assert.equal(modelTrace(source)[1].closed, undefined)
  assert.equal(modelTrace(source)[1].reached, 'doc')
  assert.equal(renderDoc(parse(source)), '<ol>\n  <li>+\n- s\n- t</li>\n</ol>')
})

test('a list marker at the marker column of a refused + is traced as a new list', () => {
  assert.deepEqual(steps('1. +\n- s\n'), ['1 S5 doc/item:1 item', '2 S5 doc/item:2 item'])
  assert.equal(renderDoc(parse('1. +\n- s\n')), '<ol>\n  <li>+</li>\n</ol>\n<ul>\n  <li>s</li>\n</ul>')
})

test('a folded marker keeps its continuation, lazy and nested lines', () => {
  assert.deepEqual(steps('1. +\n - s\n   more\n  lazy\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S5 doc/item:1 text', '4 S4 doc/item:1 lazy'])
  assert.equal(steps('- a\n  - +\n * w\n')[2], '3 S4 doc/item:1/item:2 lazy')
  assert.deepEqual(steps('1. +\n - s\n\nafter\n').slice(2), ['3 S5 doc/item:1 blank', '4 S5 doc text'])
  assert.deepEqual(steps('1. +\n - s\n* t\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S5 doc/item:3 item'])
  assert.deepEqual(steps('- +\n + w\n* z\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S5 doc/item:3 item'])
})

test('a marker of another list kind under an item paragraph is traced as a new list', () => {
  const source = '* s\n- t\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S5 doc/item:2 item'])
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>s</li>\n</ul>\n<ul>\n  <li>t</li>\n</ul>')
  assert.deepEqual(steps('- a\n  * w\n  1. v\n    - u\n').slice(2), ['3 S5 doc/item:1/item:3 item', '4 S5 doc/item:1/item:3 text'])
  assert.deepEqual(steps('- a\n* w\n1. v\n').slice(1), ['2 S5 doc/item:2 item', '3 S5 doc/item:3 item'])
})

test('a marker of another kind off the parent column still folds', () => {
  const source = '- a\n - w\n * v\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S5 doc/item:2 item', '3 S4 doc/item:2 lazy'])
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>a</li>\n  <li>w\n* v</li>\n</ul>')
})

// carve#4214, carve#4409: off the marker column the `+` is a letter and the
// paragraph folds into it; at the marker column the `+` takes the paragraph.
test('a paragraph off the marker column of a nested + is traced as lazy in the item', () => {
  const source = '- a\n  - +\n para\n'
  assert.deepEqual(steps(source).slice(2), ['3 S4 doc/item:1/item:2 lazy'])
  assert.equal(modelTrace(source)[2].closed, undefined)
  assert.deepEqual(steps('  - +\n  para\n* z\n').slice(1), ['2 S5 doc/item:1 text', '3 S5 doc/item:3 item'])
  assert.equal(modelTrace('- a\n  - +\n  para\n')[2].owner, 'doc/item:1/item:2')
  assert.equal(steps('  - +\npara\n')[1], '2 S4 doc/item:1 lazy')
})
