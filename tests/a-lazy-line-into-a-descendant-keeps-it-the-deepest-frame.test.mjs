/*
 * A lazy line that folds into a descendant's paragraph keeps that descendant
 * the deepest frame, so a block that closes its paragraph leaves nothing open
 * for a column-0 line (PART 0 S4, CARVE-P0-006, carve#4291).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

const hosts = [
  { head: '- a\n  - b\n', lazy: '  ', body: '    ' },
  { head: '1. a\n   - b\n', lazy: '   ', body: '     ' },
  { head: '- a\n  - b\n    - c\n', lazy: '    ', body: '      ' },
  { head: '- > - a\n', lazy: '', body: '  >   ' },
  { head: '- x\n  > - a\n', lazy: '', body: '  >   ' },
]
const closers = [['||'], ['# h'], ['```', '```'], ['[r]: /u'], ['[r]:'], ['{.c}'], ['***']]

for (const h of hosts) {
  for (const c of closers) {
    const block = c.map((line) => h.body + line).join('\n')
    test(`${JSON.stringify(h.head + h.lazy + 'g')} then ${JSON.stringify(c.join(' / '))} leaves y outside`, () => {
      assert.equal(html(`${h.head}${h.lazy}g\n${block}\ny\n`), html(`${h.head}${h.body}g\n${block}\ny\n`))
    })
  }
}

test('the fuzz reproduction', () => {
  const out = html('- a\n  - b\n  c\n    ||\ny\n')
  assert.match(out, /<\/ul>\n<p>y<\/p>/, out)
})
