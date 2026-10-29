import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// carve#3945: the first-block measurement of an item-hosted `> > +` threw on
// its throwaway state and fell back to the whole remaining document, so each
// unit re-parsed everything after it. Work per unit must stay constant.
const units = [
  '# s\n\n- a\n  > > +\n    > q\n',
  '- a\n  > > +\n    > q\n\n',
  '1. a\n   > +\n     > q\n\n',
  '- [ ] a\n  > > > +\n    > q\n\n',
  '> - a\n>   > +\n>     q\n\n',
  '- - a\n    > > +\n      > q\n\n',
]
const visits = (unit, count) => {
  resetLayoutWork()
  parse(unit.repeat(count))
  return layoutWork.lineVisits
}

for (const unit of units) {
  test(`${JSON.stringify(unit)} repeated costs the same per unit`, () => {
    const small = visits(unit, 50)
    const large = visits(unit, 200)
    assert.ok(large <= small * 4 * 1.25, `50 units: ${small} line visits, 200 units: ${large}`)
  })
}
