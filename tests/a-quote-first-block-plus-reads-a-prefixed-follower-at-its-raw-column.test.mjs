import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P9-067 and the carve#3421 rulings of 22 October: a stacked quote's
// first-block `+` takes a follower at document column 0, the opener line's own
// column or the owning quote's marker column, measured where the line stands
// in the source (carve#3935). Anywhere else the `+` reads like a letter.
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))

const hosts = {
  'the document': { pre: [], lead: '', content: 0 },
  'a list item': { pre: ['- a'], lead: '  ', content: 2 },
  'a nested list item': { pre: ['- a', '  - b'], lead: '    ', content: 4 },
  'a quoted list item': { pre: ['> - a'], lead: '>   ', content: 4, prefix: '> ' },
}
const stacks = ['> > +', '> > > +']
const blocks = ['q', '# h']

for (const [hostName, host] of Object.entries(hosts)) {
  for (const stack of stacks) {
    const opener = host.lead + stack
    const ownerColumn = opener.lastIndexOf('>')
    const prefix = host.prefix ?? ''
    for (let col = host.content; col <= host.content + 6; col++) {
      for (const block of blocks) {
        const follower = prefix + ' '.repeat(col - prefix.length) + '> ' + block
        const eligible = col === host.content || col === ownerColumn
        test(`${hostName}: \`${stack}\` ${eligible ? 'takes' : 'refuses'} a quoted ${block === 'q' ? 'paragraph' : 'heading'} at column ${col}`, () => {
          const out = html([...host.pre, opener, follower])
          if (eligible) {
            assert.ok(!out.includes('+'), out)
          } else {
            const letter = html([...host.pre, opener.replace(/\+$/, 'z'), follower]).replace('z', '+')
            assert.equal(out, letter)
          }
        })
      }
    }
  }
}

test('the issue rows: an item-hosted follower at the inner marker column attaches, one at an intervening column does not', () => {
  assert.equal(html(['- a', '  > > +', '    > q']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote><p>q</p></blockquote>\n    </blockquote>\n  </li>\n</ul>')
  assert.equal(html(['- > > +', '  > q']),
    '<ul>\n  <li>\n    <blockquote>\n      <blockquote><p>+\nq</p></blockquote>\n    </blockquote>\n  </li>\n</ul>')
})

test('an attached follower keeps its later lines', () => {
  assert.equal(html(['- a', '  > > +', '    > ```x', '    > y', '    > ```']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote>\n        <pre><code class="language-x">y\n</code></pre>\n      </blockquote>\n    </blockquote>\n  </li>\n</ul>')
})
