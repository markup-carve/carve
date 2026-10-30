import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// After a marker-line `+` takes an unclosed fence, the readers end the fence at
// its block and read the lines at the content column as the item's body
// (PART 9 §17 L3). The trace records them there, not as payload (carve#4199).
const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)

test('a sub-list after the fence is an item in the item', () => {
  const source = '- +\n```\nx\n\n  - sub\n'
  assert.deepEqual(steps(source), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/code:2 code',
    '3 S1 doc/item:1/code:2 payload',
    '4 S5 doc/item:1 blank',
    '5 S5 doc/item:1/item:5 item',
  ])
  assert.match(renderDoc(parse(source)), /<\/code><\/pre>\n {4}<ul>\n {6}<li>sub<\/li>/)
})

test('other openers and the lines under them stay in the host', () => {
  assert.deepEqual(steps('- +\n```\nx\n\n  > q\n  > r\n').slice(-2), ['5 S5 doc/item:1/quote:5 quote', '6 S5 doc/item:1/quote:5 text'])
  assert.deepEqual(steps('- +\n~~~\nx\n\n  # h\n').at(-1), '5 S5 doc/item:1 leaf')
  assert.deepEqual(steps(':: t\n: +\n```\nx\n\n  - s\n  - t\n').slice(-2), ['6 S5 doc/dd:2/item:6 item', '7 S5 doc/dd:2/item:7 item'])
  assert.deepEqual(steps('- a\n  - +\n  ```\n  x\n\n    - sub\n').at(-1), '6 S5 doc/item:1/item:2/item:6 item')
})

test('without a blank the opener is still payload, as the HTML has it', () => {
  const source = '- +\n```\nx\n  - sub\n'
  assert.equal(steps(source).at(-1), '4 S1 doc/item:1/code:2 payload')
  assert.match(renderDoc(parse(source)), /<pre><code>x\n  - sub\n<\/code><\/pre>/)
})
