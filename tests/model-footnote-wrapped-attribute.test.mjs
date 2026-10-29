import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const note = (body) => '<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n' +
  '<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n' +
  body + '\n    </li>\n  </ol>\n</section>'
const backlink = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'

test('a wrapped attribute at a footnote body\'s column is one construct (carve#4104)', () => {
  assert.equal(html('[^f]: d\n  {.c\n}\n  x\n\n[^f]\n'),
    note(`      <p>d</p>\n      <p class="c">x${backlink}</p>`))
})

test('every line of the wrap may sit below the body column (carve#4104)', () => {
  assert.equal(html('[^f]: d\n  {.c\n .e\n}\n  x\n\n[^f]\n'),
    note(`      <p>d</p>\n      <p class="c e">x${backlink}</p>`))
})

test('the footnote reads the wrap as its list item twin does (PART 9 SS24 C3)', () => {
  assert.equal(html('- d\n  {.c\n}\n  x\n'), '<ul>\n  <li>d\n    <p class="c">x</p>\n  </li>\n</ul>')
})

test('an unclosed opener stays paragraph text', () => {
  assert.equal(html('[^f]: d\n  {.c\ny\n\n[^f]\n'), note(`      <p>d\n{.c\ny${backlink}</p>`))
})
