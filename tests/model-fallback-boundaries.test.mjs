import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('unresolved footnote labels use HTML text escaping', () => {
  for (const [label, escaped] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;']]) {
    assert.equal(html(`[^${label}]`), `<p>[^${escaped}]</p>`)
  }
})

test('contentless description markers fold under a quoted term', () => {
  for (const tail of ['', ' ', '   ', '\t']) {
    assert.equal(html(`> :: t\n:${tail}\n`), '<blockquote>\n  <dl>\n    <dt>t\n:</dt>\n  </dl>\n</blockquote>')
  }
})

test('over-indented colon openers open in the quote', () => {
  for (const [opener, block] of [
    ['::: |', '<div class="line-block">\n\n  </div>'],
    ['::: note', '<aside class="admonition note" aria-label="Note">\n\n  </aside>'],
  ]) {
    assert.equal(html(`>  ${opener}\nx\n`), `<blockquote>\n  ${block}\n</blockquote>\n<p>x</p>`)
  }
})
