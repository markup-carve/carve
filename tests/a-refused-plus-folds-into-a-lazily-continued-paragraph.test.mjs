import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'

// PART 9 §17 L3, markup-carve/carve#3567: a refused `+` is never dropped.
const shape = (blocks) => blocks.map((b) => {
  if (b.t === 'quote') return `bq(${shape(b.children)})`
  if (b.t === 'list') return `list(${b.items.map((it) => `li(${shape(it.blocks)})`).join(' ')})`
  if (b.t === 'para') return `p[${b.lines.join(' ')}]`
  return b.t
}).join(' ')
const read = (lines) => shape(parse(lines.join('\n') + '\n').blocks)

const drops = [
  [['> - > > q', '>   > r', '>   > +'], 'bq(list(li(bq(bq(p[q r +])))))'],
  [['> - > > > q', '>   > r', '>   > +'], 'bq(list(li(bq(bq(bq(p[q r +]))))))'],
  [['> - > > > q', '>   > > r', '>   > > +'], 'bq(list(li(bq(bq(bq(p[q r +]))))))'],
  [['> - > - > q', '>   > r', '>   > +'], 'bq(list(li(bq(list(li(bq(p[q r +])))))))'],
  [['> - > - > q', '>   >   r', '>   >   +'], 'bq(list(li(bq(list(li(bq(p[q r +])))))))'],
  [['> - > > - q', '>   > r', '>   > +'], 'bq(list(li(bq(bq(list(li(p[q r +])))))))'],
  [['> - > > - q', '>   > > r', '>   > > +'], 'bq(list(li(bq(bq(list(li(p[q r +])))))))'],
  [['> - - > > q', '>     > r', '>     > +'], 'bq(list(li(list(li(bq(bq(p[q r +])))))))'],
  [['- > - > > q', '  >   > r', '  >   > +'], 'list(li(bq(list(li(bq(bq(p[q r +])))))))'],
]
for (const [lines, expected] of drops) {
  test(`a refused plus is kept in the lazy paragraph: ${lines.join(' / ')}`, () => {
    assert.equal(read(lines), expected)
  })
}

const placements = [
  [['> - > - > q', '>     r', '>     +', '>     b'], 'bq(list(li(bq(list(li(bq(p[q r + b])))))))'],
  [['> - > - > q', '>       r', '>       +', '>       b'], 'bq(list(li(bq(list(li(bq(p[q r + b])))))))'],
  [['- > > - q', '  >   r', '  >   +', '  >   b'], 'list(li(bq(bq(list(li(p[q r + b]))))))'],
  [['> - > > - q', '>   >   r', '>   >   +'], 'bq(list(li(bq(bq(list(li(p[q r +])))))))'],
  [['> - > > - q', '>   >   r', '>   >   +', '>   >   b'], 'bq(list(li(bq(bq(list(li(p[q r + b])))))))'],
  [['- > > - > q', '  >   r', '  >   +', '  >   b'], 'list(li(bq(bq(list(li(bq(p[q r + b])))))))'],
  [['- > > - > q', '  >     r', '  >     +', '  >     b'], 'list(li(bq(bq(list(li(bq(p[q r + b])))))))'],
  [['- > > > - q', '  > >   r', '  > >   +', '  > >   b'], 'list(li(bq(bq(bq(list(li(p[q r + b])))))))'],
  [['1. > > - q', '   >   r', '   >   +', '   >   b'], 'list(li(bq(bq(list(li(p[q r + b]))))))'],
]
for (const [lines, expected] of placements) {
  test(`an unprefixed plus cannot reach the quoted item and folds: ${lines.join(' / ')}`, () => {
    assert.equal(read(lines), expected)
  })
}

test('the nested reading matches the same quote read without its host', () => {
  assert.equal(read(['> - > > q', '>   > r', '>   > +']), `bq(list(li(${read(['> > q', '> r', '> +'])})))`)
  assert.equal(read(['- > > - q', '  >   r', '  >   +', '  >   b']), `list(li(${read(['> > - q', '>   r', '>   +', '>   b'])}))`)
})
