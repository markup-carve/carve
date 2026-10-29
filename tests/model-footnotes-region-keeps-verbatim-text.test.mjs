import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// A footnotes region with no notes to place renders as a div; its re-indent must not touch code text or blank lines.
test('code text in an unplaced footnotes region keeps its columns', () => {
  assert.equal(html('::: footnotes\n```\nx\n\ny\n```\n:::\n'),
    '<div class="footnotes">\n  <pre><code>x\n\ny\n</code></pre>\n</div>')
})

test('a blank line in an unplaced footnotes region stays blank', () => {
  assert.equal(html('::: footnotes\n::::\n'), '<div class="footnotes">\n  <div>\n\n  </div>\n</div>')
})
