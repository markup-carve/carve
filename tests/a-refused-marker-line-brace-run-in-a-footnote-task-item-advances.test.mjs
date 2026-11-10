import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a refused marker-line brace run in a footnote task item advances as text', () => {
  assert.equal(html('[^q]: - [ ] {.x\n            .y}\nz\n\nx[^q]'),
    '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n      <ul class="task-list">\n        <li><input type="checkbox" disabled aria-label="{.x .y} z"> {.x\n.y}\nz</li>\n      </ul>\n      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>')
})
