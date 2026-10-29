import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// carve#3999: §10 I4 asked for a closer once per fence line with a forward
// scan, so a paragraph over closerless fence lines read quadratically many lines.
const shapes = [
  ['p\n', '``` x\n'],
  ['> p\n', '> ``` x\n'],
  ['- > p\n', '  > ``` x\n'],
  ['- p\n', '  ~~~ y\n'],
]
const scanned = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return layoutWork.closerScan
}

for (const [head, unit] of shapes) {
  test(`${JSON.stringify(head + unit)} reads a linear number of closer candidates`, () => {
    const small = scanned(head, unit, 500)
    const large = scanned(head, unit, 2000)
    assert.ok(large <= small * 4 * 1.25, `500 lines: ${small} reads, 2000 lines: ${large}`)
  })
}
