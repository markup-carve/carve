import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5001: a `%%%` span leaves the stanza as it found it, so the rows after it skip the walk.
const shapes = [
  ['> :: t\n> : ::: |\n', '>   x\n>   %%%\n>   y\n>   %%%\n'],
  ['> > :: t\n> > : ::: |\n', '> >   x\n> >   %%%\n> >   y\n> >   %%%\n'],
  ['> > > ::: |\n', '> > >   x\n> > >   %%%\n> > >   y\n> > >   %%%\n'],
  ['> - ::: |\n', '>   x\n>   %%%\n>   y\n>   %%%\n'],
  ['- > :: t\n  > : ::: |\n', '  >   x\n  >   %%%\n  >   y\n  >   %%%\n'],
  ['> :: t\n> : ::: |\n', '>   x\n>   %%%\n>\n>   %%%\n'],
]
const work = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return Object.values(layoutWork).reduce((sum, n) => sum + n, 0)
}

for (const [head, unit] of shapes) {
  test(`${JSON.stringify(head + unit)} costs linear layout work`, () => {
    const small = work(head, unit, 250)
    const large = work(head, unit, 1000)
    assert.ok(large <= small * 4 * 1.25, `250 units: ${small}, 1000 units: ${large}`)
  })
}

test('the spans stay hidden and the stanza keeps every verse row', () => {
  const html = renderDoc(parse('> :: t\n> : ::: |\n>   x\n>   %%%\n>   y\n>   %%%\n>   z\n'))
  assert.match(html, /<p>x<br>\nz<\/p>/)
  assert.doesNotMatch(html, /y/)
})

// The lazy `y` ends the first span (PART 0 S1); the second runs to the end.
test('a nested quote row that retreats past a span still asks the walk', () => {
  const doc = '> > :: t\n> > : ::: |\n> >   x\n> > x\n> >   %%%\n> > y\n> >   %%%\n> >   z\n'
  assert.match(renderDoc(parse(doc)), /<p>x<br>\nx<br>\ny<\/p>/)
})
