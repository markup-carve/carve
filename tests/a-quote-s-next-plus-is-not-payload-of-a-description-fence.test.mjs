import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

// carve#5182: the quote's next `+` ends a description fence the last attached
// block left open and adds no payload line (PART 9 §17 L3, carve#5046).
test('the reproduction renders as the ticket expects', () => {
  assert.equal(html('> a\n+\n:: t\n: ```\n  x\n+\n:: u\n: v\n'),
    '<blockquote><p>a</p><dl><dt>t</dt><dd><pre><code>x</code></pre></dd><dt>u</dt><dd>v</dd></dl></blockquote>')
})

for (const fence of ['```', '~~~', '````', '``` js']) {
  test(`a ${fence} fence in a quoted description gets no blank payload line`, () => {
    assert.match(html(`> a\n+\n:: t\n: ${fence}\n  x\n+\n:: u\n: v\n`), />x<\/code><\/pre><\/dd><dt>u<\/dt>/)
  })
}
