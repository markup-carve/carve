import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// carve#5859: the item collector copied its descendant's paragraph on every
// line to read one flag, so a long paragraph in a nested item was quadratic.
const shape = (n) => '- x\n  - y\n\n' + '    {% a\n'.repeat(n) + '     z %}\n- s\n'
const copied = (n) => {
  resetLayoutWork()
  parse(shape(n))
  return layoutWork.descendantQ1Copy
}

test('a nested item paragraph of repeated comment openers copies a linear number of lines', () => {
  const small = copied(500)
  const large = copied(2000)
  assert.ok(large <= small * 4 * 1.25 + 16, `500 openers: ${small} lines, 2000 openers: ${large}`)
})
