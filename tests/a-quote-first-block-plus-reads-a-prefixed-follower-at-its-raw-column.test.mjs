import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4409: a stacked quote's `+` takes only a follower carrying the outer
// prefixes whose block stands at the owning quote's marker column, measured in
// the source. Anywhere else the `+` reads like a letter.
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
    const outer = stack.split('>').length - 2
    for (let carried = 1; carried <= outer; carried++) {
      for (let col = host.content; col <= host.content + 6; col++) {
        for (const block of blocks) {
          const follower = prefix + ' '.repeat(col - prefix.length) + '> '.repeat(carried) + block
          const eligible = carried === outer && col + 2 * carried === ownerColumn
          test(`${hostName}: \`${stack}\` ${eligible ? 'takes' : 'refuses'} a ${block === 'q' ? 'paragraph' : 'heading'} under ${carried} prefix at column ${col}`, () => {
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
}

test('the issue rows: an item-hosted follower at the inner marker column attaches, one at an intervening column does not', () => {
  assert.equal(html(['- a', '  > > +', '  > q']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote><p>q</p></blockquote>\n    </blockquote>\n  </li>\n</ul>')
  assert.equal(html(['- > > +', '  > q']),
    '<ul>\n  <li>\n    <blockquote>\n      <blockquote><p>q</p></blockquote>\n    </blockquote>\n  </li>\n</ul>')
  assert.equal(html(['- a', '  > > +', '    > q']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote><p>+\nq</p></blockquote>\n    </blockquote>\n  </li>\n</ul>')
})

test('an attached follower keeps its later lines', () => {
  assert.equal(html(['- a', '  > > +', '  > ```x', '  > y', '  > ```']),
    '<ul>\n  <li>a\n    <blockquote>\n      <blockquote>\n        <pre><code class="language-x">y\n</code></pre>\n      </blockquote>\n    </blockquote>\n  </li>\n</ul>')
})
