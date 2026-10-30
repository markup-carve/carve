import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// carve#4190, carve#4409: off an item's marker column its first-block `+` is a
// letter (corpus 633), so the paragraph folds into the item and is traced lazy.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a paragraph below a refused + is traced in the item', () => {
  const source = '- +\n para\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S4 doc/item:1 lazy'])
  assert.equal(modelTrace(source)[1].closed, undefined)
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li>+\npara</li>\n</ul>')
})

test('the lines after that paragraph stay in the item until the blank line', () => {
  assert.deepEqual(steps('- +\n para\n more\n\nafter\n').slice(1), ['2 S4 doc/item:1 lazy', '3 S4 doc/item:1 lazy', '4 S5 doc/item:1 blank', '5 S5 doc text'])
  assert.equal(steps('- a\n  - +\n   para\n')[2], '3 S4 doc/item:1/item:2 lazy')
  assert.equal(steps('- +\n $$`m`\n')[1], '2 S4 doc/item:1 lazy')
})

test('a description folds a paragraph off its marker column and leaves a block there', () => {
  assert.equal(steps(':: t\n: +\n para\n')[2], '3 S4 doc/dd:2 lazy')
  assert.deepEqual(steps(':: t\n: +\n ```\n x\n ```\n').slice(2), [
    '3 S5 doc/code:3 code',
    '4 S1 doc/code:3 payload',
    '5 S1 doc/code:3 closer',
  ])
})

test('a description takes a block at its marker column', () => {
  assert.deepEqual(steps(':: t\n: +\n```\nx\n```\n').slice(2), [
    '3 S5 doc/dd:2/code:3 code',
    '4 S1 doc/dd:2/code:3 payload',
    '5 S1 doc/dd:2/code:3 closer',
  ])
})
