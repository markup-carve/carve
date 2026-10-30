import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// carve#4190: between an item's marker and content columns its first-block `+`
// refuses a paragraph (corpus 633). The readers close the item; the decision
// trace recorded the paragraph as a lazy line inside it.
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a refused paragraph is traced in the parent', () => {
  const source = '- +\n para\n'
  assert.deepEqual(steps(source), ['1 S5 doc/item:1 item', '2 S5 doc text'])
  assert.equal(modelTrace(source)[1].closed, 1)
  assert.equal(renderDoc(parse(source)), '<ul>\n  <li></li>\n</ul>\n<p>para</p>')
})

test('the lines after a refused paragraph stay in the parent', () => {
  assert.deepEqual(steps('- +\n para\n more\n\nafter\n').slice(1), ['2 S5 doc text', '3 S5 doc text', '4 S5 doc blank', '5 S5 doc text'])
  assert.equal(steps('- a\n  - +\n   para\n')[2], '3 S5 doc/item:1 text')
  assert.equal(steps('- +\n $$`m`\n')[1], '2 S5 doc text')
})

test('a description refuses a paragraph and takes a block between its columns', () => {
  assert.equal(steps(':: t\n: +\n para\n')[2], '3 S5 doc text')
  assert.deepEqual(steps(':: t\n: +\n ```\n x\n ```\n').slice(2), [
    '3 S5 doc/dd:2/code:3 code',
    '4 S1 doc/dd:2/code:3 payload',
    '5 S1 doc/dd:2/code:3 closer',
  ])
})
