import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4017: an outer item measured a descendant's first-block `+` up to its
// own sibling marker only, so a quote follower lazily took every later line of
// the host, and the spent `+` outlived the descendant's sibling (SS17 L3).
const html = (s) => renderDoc(parse(s))

const work = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return layoutWork.scan + layoutWork.lineVisits + layoutWork.views
}

for (const unit of ['  - 1. +\n  > q\n', '  - > +\n  > q\n', '  - - +\n  > q\n  - z\n']) {
  test(`${JSON.stringify('- o\n' + unit)} measures a linear number of lines`, () => {
    const small = work('- o\n', unit, 200)
    const large = work('- o\n', unit, 800)
    assert.ok(large <= small * 4 * 1.25, `200 units: ${small}, 800 units: ${large}`)
  })
}

const inPlace = [
  ['- o\n  - 1. +\n  s\n  - z\ntail\n', '- o\n  - 1. s\n  - z\ntail\n'],
  ['- o\n  - 1. +\n  s\n  * z\ntail\n', '- o\n  - 1. s\n  * z\ntail\n'],
  ['- o\n  - 1. +\n  # h\n  - z\ntail\n', '- o\n  - 1. # h\n  - z\ntail\n'],
  ['- o\n  - 1. +\n  > q\n  - z\ntail\n', '- o\n  - 1. > q\n  - z\ntail\n'],
  ['> - o\n>   - 1. +\n>   s\n>   * z\ntail\n', '> - o\n>   - 1. s\n>   * z\ntail\n'],
]

for (const [plus, written] of inPlace) {
  test(`${JSON.stringify(plus)} reads like the block written in place`, () => {
    assert.equal(html(plus), html(written))
  })
}
