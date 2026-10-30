import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// A marker-line `+` takes one block at the marker column; after it the item keeps
// its content column (PART 9 §17 L3). The trace records a blank or paragraph line
// there in the item, as the readers render it (carve#4167).
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('an unclosed fence ends at its block and the item keeps the next lines', () => {
  const source = '- +\n```\nx\n\n  after\n'
  assert.deepEqual(steps(source), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/code:2 code',
    '3 S1 doc/item:1/code:2 payload',
    '4 S5 doc/item:1 blank',
    '5 S5 doc/item:1 text',
  ])
  assert.match(renderDoc(parse(source)), /<\/code><\/pre>\n {4}<p>after<\/p>\n {2}<\/li>/)
})

test('a closed fence leaves the item open for a line at its content column', () => {
  assert.deepEqual(steps('- +\n```\nx\n```\n\n  after\n').slice(-2), ['5 S5 doc/item:1 blank', '6 S5 doc/item:1 text'])
  assert.deepEqual(steps(':: t\n: +\n```\nx\n```\n\n  after\n').slice(-2), ['6 S5 doc/dd:2 blank', '7 S5 doc/dd:2 text'])
})

test('a line below the content column still leaves the item', () => {
  const source = '- +\n```\nx\n```\nafter\n'
  assert.equal(steps(source).at(-1), '5 S5 doc text')
  assert.match(renderDoc(parse(source)), /<\/ul>\n<p>after<\/p>/)
})
