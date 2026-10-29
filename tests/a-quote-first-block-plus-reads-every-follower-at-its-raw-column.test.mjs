import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P9-067 and the carve#3421 rulings of 22 October: a quote's first-block
// `+` takes any non-list follower at column 0, the opener line's own column or
// the owning quote's column, and a refused `+` reads like a letter (carve#3943,
// carve#3944).
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))

test('carve#3943: a refused + before an unprefixed fence line reads like a letter', () => {
  for (const stack of ['- > > ', '- > > > ']) {
    const doc = (end) => [stack + end, '  ``` x', '```']
    assert.equal(html(doc('+')), html(doc('Z')).replace('Z', '+'))
  }
})

test('carve#3944: a column-0 quote below an item-hosted stack nests in the innermost quote', () => {
  assert.equal(html(['- a', '  > > +', '> q']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote>\n        <blockquote><p>q</p></blockquote>\n      </blockquote>\n    </blockquote>\n  </li>\n</ul>')
})

test('a column-0 fence below an item-hosted stack takes its payload', () => {
  assert.equal(html(['- a', '  > > +', '``` x', 'y', '```', 'z']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote>\n        <pre><code class="language-x">y\n</code></pre>\n      </blockquote>\n    </blockquote>\n  </li>\n</ul>\n<p>z</p>')
})

test('a follower at the owning quote column of a stack attaches', () => {
  assert.equal(html(['- > > +', '    # h']), html(['- > > # h']))
})

const hosts = [
  { pre: [], lead: '' },
  { pre: ['- a'], lead: '  ' },
  { pre: ['- a', '  - b'], lead: '    ' },
  { pre: ['1. a'], lead: '   ' },
  { pre: [], lead: '- ', marker: true },
  { pre: ['- a'], lead: '  - ', marker: true },
  { pre: [], lead: '- - ', marker: true },
]
const blocks = ['q', '# h', '| a |', '***', '::: note', '{.c}']

test('every follower column and block kind reads as the clause says', () => {
  let count = 0
  for (const host of hosts) {
    for (const stack of ['> +', '> > +', '> > > +']) {
      const opener = host.lead + stack
      const lineColumn = host.lead.search(/\S|$/)
      const eligibleColumns = [0, host.marker ? lineColumn : host.lead.length, opener.lastIndexOf('>')]
      for (let col = 0; col <= 8; col++) {
        for (const depth of [0, 1, 2]) {
          for (const block of blocks) {
            const eligible = eligibleColumns.includes(col)
            if (depth > 0 && eligible && opener[col] === '>') continue
            const follower = ' '.repeat(col) + '> '.repeat(depth) + block
            const got = html([...host.pre, opener, follower])
            const want = eligible
              ? html([...host.pre, opener.replace(/\+$/, '') + '> '.repeat(depth) + block])
              : html([...host.pre, opener.replace(/\+$/, 'z'), follower]).replace('z', '+')
            assert.equal(got, want, JSON.stringify([...host.pre, opener, follower]))
            count++
          }
        }
      }
    }
  }
  assert.ok(count > 2500, `${count}`)
})
