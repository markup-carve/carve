import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()
const note = body => '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n' +
  '<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n' + body +
  '\n      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>'

// The paragraph reader measures a task item's marker-line run past the box, as the block loop does (carve#5811).
test('a refused marker-line run in a footnote task item is paragraph text', () => {
  for (const pad of [9, 11, 12]) {
    assert.equal(html(`[^q]: - [ ] {.x\n${' '.repeat(pad)}.y}\nz\n\nx[^q]`), note(
      '      <ul class="task-list">\n        <li><input type="checkbox" disabled aria-label="{.x .y} z"> {.x\n.y}\nz</li>\n      </ul>'))
  }
})

test('a valid marker-line run in a footnote task item opens no paragraph', () => {
  assert.equal(html('[^q]: - [ ] {.x\n             .y}\nz\n\nx[^q]'), '<p>z</p>\n' + note(
    '      <ul class="task-list">\n        <li><input type="checkbox" disabled> </li>\n      </ul>'))
})
