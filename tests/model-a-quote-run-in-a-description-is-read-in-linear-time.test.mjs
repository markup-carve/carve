import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const shapes = [
  [':: t\n: > a\n', '  > z\n'],
  ['- :: t\n  : > a\n', '    > z\n'],
  ['- - :: t\n    : > a\n', '      > z\n'],
  ['1. - [ ] :: t\n         : > a\n', '           > z\n'],
  [':::\n:: t\n: > a\n', '  > z\n'],
  [':: t\n: > :::\n', '  > z\n'],
  [':: t\n: > a\n', '  > z\nw\n'],
  ['- :: t\n  : > a\n', '    > z\n  - m\n'],
]
const scanned = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return layoutWork.paragraphProbe
}

for (const [head, unit] of shapes) {
  test(`${JSON.stringify(head + unit)} probes a linear number of body lines`, () => {
    const small = scanned(head, unit, 500)
    const large = scanned(head, unit, 2000)
    assert.ok(large <= small * 4 * 1.25, `500 units: ${small} lines, 2000 units: ${large}`)
  })
}

test('a marker below the body still asks the quote line above it', () => {
  assert.match(renderDoc(parse('- :: t\n  : > a\n    > z\n  - m\n')), /<p>a\nz\n- m<\/p>/)
  assert.match(renderDoc(parse('- :: t\n  : > # a\n    > # z\n  - m\n')), /<li>m<\/li>/)
})
