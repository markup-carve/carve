import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// carve#4017: each sibling first-block `+` in one list host measured its block
// over every line left in the host, so the host read quadratically many lines.
const shapes = [
  ['- o\n', '  - 1. +\n  s\n'],
  ['- o\n', '  - - +\n  s\n'],
  ['- o\n', '  - a) +\n  s\n'],
  ['> - o\n', '>   - 1. +\n>   s\n'],
  ['1. o\n', '   - > +\n   s\n'],
]
const work = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return layoutWork.scan + layoutWork.lineVisits
}

for (const [head, unit] of shapes) {
  test(`${JSON.stringify(head + unit)} measures a linear number of lines`, () => {
    const small = work(head, unit, 250)
    const large = work(head, unit, 1000)
    assert.ok(large <= small * 4 * 1.25, `250 units: ${small}, 1000 units: ${large}`)
  })
}
