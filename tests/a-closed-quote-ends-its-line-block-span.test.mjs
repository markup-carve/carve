import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a line block span ends with the quote that owns it (carve#5062)', () => {
  for (const run of ['```', '~~~']) {
    const source = `> - ::: |\n>   ${run}\n>   :::\nlazy\n>   ${run}\n>   x\n`
    const html = renderDoc(parse(source))
    assert.match(html, /<p>lazy<\/p>\n<blockquote>\n  <pre><code>x\n<\/code><\/pre>\n<\/blockquote>$/)
    assert.match(html, /<div class="line-block">/)
  }
})
