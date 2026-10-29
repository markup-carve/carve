import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// A `::: footnotes` marker with no resolved note is a plain div (PART 9R R2).
// Its body renders one level deeper, so verbatim lines and paragraph
// continuation lines keep their own columns instead of gaining the div's pad.
test('a code block in an unplaced marker keeps its closer at column 0', () => {
  assert.equal(html('::: footnotes\n```\n\n'),
    '<div class="footnotes">\n  <pre><code>\n</code></pre>\n</div>')
})

test('a blank line in a quote in an unplaced marker stays empty', () => {
  assert.equal(html('::: footnotes\n> %%\n'),
    '<div class="footnotes">\n  <blockquote>\n\n  </blockquote>\n</div>')
})

test('an item continuation line in an unplaced marker gains no pad', () => {
  assert.equal(html('::: footnotes\n- a\n  b\n'),
    '<div class="footnotes">\n  <ul>\n    <li>a\nb</li>\n  </ul>\n</div>')
})

test('raw HTML lines in an unplaced marker keep their columns', () => {
  assert.equal(html('::: footnotes\n``` =html\n<b>\n\n</b>\n```\n'),
    '<div class="footnotes">\n  <b>\n\n</b>\n</div>')
})

test('a marker that places notes still renders its body in place', () => {
  const out = html('x[^a]\n\n[^a]: n\n\n::: footnotes\n```\na\n\nb\n```\n:::\n')
  assert.match(out, /^<p>x<a [^>]*><sup>1<\/sup><\/a><\/p>\n<pre><code>a\n\nb\n<\/code><\/pre>\n<section role="doc-endnotes"/)
})
